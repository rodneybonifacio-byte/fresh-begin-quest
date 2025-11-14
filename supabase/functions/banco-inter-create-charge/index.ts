/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateChargeRequest {
  cliente_id: string;
  valor: number;
  expiracao?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cliente_id, valor, expiracao = 3600 } = await req.json() as CreateChargeRequest;

    console.log('Criando cobrança PIX para cliente:', cliente_id, 'valor:', valor);

    // Validações
    if (!cliente_id || !valor || valor <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CLIENT_ID = Deno.env.get('BANCO_INTER_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('BANCO_INTER_CLIENT_SECRET');
    const CHAVE_PIX = Deno.env.get('BANCO_INTER_CHAVE_PIX');

    if (!CLIENT_ID || !CLIENT_SECRET || !CHAVE_PIX) {
      console.error('Credenciais do Banco Inter não configuradas');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ler certificados do diretório _shared
    console.log('Carregando certificados mTLS...');
    const cert = await Deno.readTextFile('/var/task/supabase/functions/_shared/banco-inter-client.crt');
    const key = await Deno.readTextFile('/var/task/supabase/functions/_shared/banco-inter-client.key');
    const caCerts = [await Deno.readTextFile('/var/task/supabase/functions/_shared/banco-inter-ca.crt')];

    // Criar cliente HTTP com mTLS
    const httpClient = Deno.createHttpClient({
      cert,
      key,
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
        scope: 'cob.write cob.read',
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

    // 2. Criar cobrança PIX no Banco Inter
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
    
    // 3. Salvar no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
