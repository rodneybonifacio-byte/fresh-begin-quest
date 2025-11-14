// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateChargeRequest {
  valor: number;
  expiracao?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter user ID do token JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cliente_id = user.id;
    const { valor, expiracao = 3600 } = await req.json() as CreateChargeRequest;

    console.log('Criando cobrança PIX para usuário:', cliente_id, 'valor:', valor);

    // Validações
    if (!valor || valor <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valor inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CLIENT_ID = Deno.env.get('BANCO_INTER_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('BANCO_INTER_CLIENT_SECRET');
    const CHAVE_PIX = Deno.env.get('BANCO_INTER_CHAVE_PIX');
    const cert = Deno.env.get('BANCO_INTER_CLIENT_CERT');
    const key = Deno.env.get('BANCO_INTER_CLIENT_KEY');
    const caCert = Deno.env.get('BANCO_INTER_CA_CERT');

    if (!CLIENT_ID || !CLIENT_SECRET || !CHAVE_PIX || !cert || !key || !caCert) {
      console.error('Configuração incompleta');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Configurando certificados mTLS...');
    
    // Função para formatar certificado PEM corretamente
    const formatPemCert = (pemString: string) => {
      // Remove apenas quebras de linha e espaços extras, mas preserva estrutura
      let cleaned = pemString.trim();
      
      // Se já tem quebras de linha, retorna como está
      if (cleaned.includes('\n')) {
        return cleaned;
      }
      
      // Encontra os marcadores BEGIN e END
      const beginRegex = /(-----BEGIN [^-]+-----)/;
      const endRegex = /(-----END [^-]+-----)/;
      
      const beginMatch = cleaned.match(beginRegex);
      const endMatch = cleaned.match(endRegex);
      
      if (!beginMatch || !endMatch) {
        console.error('Formato de certificado inválido');
        return pemString;
      }
      
      const header = beginMatch[0];
      const footer = endMatch[0];
      const startPos = cleaned.indexOf(header) + header.length;
      const endPos = cleaned.indexOf(footer);
      const content = cleaned.substring(startPos, endPos).replace(/\s/g, '');
      
      // Adiciona quebras de linha a cada 64 caracteres
      const formatted = content.match(/.{1,64}/g)?.join('\n') || content;
      
      return `${header}\n${formatted}\n${footer}`;
    };
    
    const certFixed = formatPemCert(cert);
    const keyFixed = formatPemCert(key);
    const caCertFixed = formatPemCert(caCert);
    
    console.log('Certificado formatado - primeira linha:', certFixed.split('\n')[0]);
    console.log('Certificado formatado - segunda linha:', certFixed.split('\n')[1]);
    
    const caCerts = [caCertFixed];

    // Criar cliente HTTP com mTLS
    const httpClient = Deno.createHttpClient({
      cert: certFixed,
      key: keyFixed,
      caCerts
    });

    // Gerar txid único
    const txid = crypto.randomUUID().replace(/-/g, '').substring(0, 35);
    
    console.log('Obtendo token de autenticação do Banco Inter...');

    // 1. Obter token de autenticação com mTLS
    const tokenResponse = await fetch('https://cdpj.partners.bancointer.com.br/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'cob.write cob.read pix.read pix.write webhook.read webhook.write',
        grant_type: 'client_credentials'
      }),
      client: httpClient
    } as any);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao obter token:', tokenResponse.status, errorText);
      httpClient.close();
      return new Response(
        JSON.stringify({ success: false, error: 'Erro na autenticação com Banco Inter' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await tokenResponse.json();
    console.log('Token obtido com sucesso');

    // 2. Configurar webhook (caso ainda não esteja configurado)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const webhookUrl = `${supabaseUrl}/functions/v1/banco-inter-webhook`;
      
      console.log('Configurando webhook PIX:', webhookUrl);
      
      // Endpoint correto da API PIX conforme documentação
      const webhookResponse = await fetch(
        `https://cdpj.partners.bancointer.com.br/pix/v2/webhook/${encodeURIComponent(CHAVE_PIX)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhookUrl: webhookUrl
          }),
          client: httpClient
        } as any
      );

      if (webhookResponse.ok) {
        const responseText = await webhookResponse.text();
        console.log('✓ Webhook PIX configurado - Status:', webhookResponse.status);
        if (responseText) {
          try {
            const webhookData = JSON.parse(responseText);
            console.log('Resposta webhook:', webhookData);
          } catch (e) {
            console.log('Resposta webhook (não-JSON):', responseText);
          }
        }
      } else {
        const errorText = await webhookResponse.text();
        console.error('❌ Erro ao configurar webhook:', webhookResponse.status, errorText);
        // Não falha a operação mas registra o erro
      }
    } catch (webhookError) {
      console.error('❌ Exceção ao configurar webhook:', webhookError);
    }

    // 3. Criar cobrança PIX no Banco Inter
    console.log('Criando cobrança PIX:', { txid, valor, chave: CHAVE_PIX });
    
    const cobResponse = await fetch(`https://cdpj.partners.bancointer.com.br/pix/v2/cob/${txid}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendario: {
          expiracao: expiracao
        },
        valor: {
          original: valor.toFixed(2)
        },
        chave: CHAVE_PIX,
        solicitacaoPagador: `Recarga de créditos - R$ ${valor.toFixed(2)}`
      }),
      client: httpClient
    } as any);

    if (!cobResponse.ok) {
      const errorText = await cobResponse.text();
      console.error('Erro ao criar cobrança:', cobResponse.status, errorText);
      httpClient.close();
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar cobrança PIX no Banco Inter' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cobData = await cobResponse.json();
    console.log('Cobrança PIX criada com sucesso no Banco Inter:', cobData);

    // Fechar cliente HTTP
    httpClient.close();

    // Extrair dados da resposta do Banco Inter
    const pixCopiaECola = cobData.pixCopiaECola || '';
    const qrCodeUrl = cobData.loc?.qrcode || `https://gerarqrcodepix.com.br/api/v1?brcode=${encodeURIComponent(pixCopiaECola)}`;
    
    // 4. Salvar no banco de dados (reutilizar cliente supabase criado no início)

    const dataExpiracao = new Date();
    dataExpiracao.setSeconds(dataExpiracao.getSeconds() + expiracao);

    const { error: dbError } = await supabase
      .from('recargas_pix')
      .insert({
        cliente_id,
        valor,
        status: 'pendente_pagamento',
        txid,
        pix_copia_cola: pixCopiaECola,
        data_expiracao: dataExpiracao.toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar recarga:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar recarga' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cobrança PIX criada com sucesso:', txid);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          txid,
          pix_copia_cola: pixCopiaECola,
          qr_code: qrCodeUrl,
          qr_code_image: qrCodeUrl,
          expiracao: dataExpiracao.toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
