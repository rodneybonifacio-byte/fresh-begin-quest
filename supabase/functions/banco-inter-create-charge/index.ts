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
    
    // TODO: Quando o usuário adicionar os certificados, usar aqui
    // const CERT_KEY = Deno.env.get('BANCO_INTER_CERT_KEY');
    // const CERT_CRT = Deno.env.get('BANCO_INTER_CERT_CRT');
    // const CHAVE_PIX = Deno.env.get('BANCO_INTER_CHAVE_PIX');

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('Credenciais do Banco Inter não configuradas');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NOTA: Por enquanto, retornar uma simulação até que os certificados sejam adicionados
    // Quando tiver os certificados, descomentar o código abaixo

    /*
    // 1. Obter token de autenticação
    const tokenResponse = await fetch('https://cdpj.partners.bancointer.com.br/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // TODO: Adicionar certificados mTLS aqui quando disponíveis
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'cob.write cob.read',
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao obter token:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro na autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // 2. Criar cobrança PIX
    const txid = crypto.randomUUID().replace(/-/g, '').substring(0, 35);
    
    const cobResponse = await fetch('https://cdpj.partners.bancointer.com.br/pix/v2/cob', {
      method: 'POST',
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
        solicitacaoPagador: `Recarga de créditos - ${valor.toFixed(2)}`
      })
    });

    if (!cobResponse.ok) {
      const errorText = await cobResponse.text();
      console.error('Erro ao criar cobrança:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar cobrança' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cobData = await cobResponse.json();
    */

    // Simulação temporária até ter os certificados
    const txid = crypto.randomUUID().replace(/-/g, '').substring(0, 35);
    const pixCopiaECola = `00020126580014br.gov.bcb.pix0136${txid}52040000530398654${valor.toFixed(2).padStart(13, '0')}5802BR5925BRHUB ENVIOS6009SAO PAULO62070503***6304XXXX`;
    
    // 3. Salvar no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const dataExpiracao = new Date();
    dataExpiracao.setSeconds(dataExpiracao.getSeconds() + expiracao);

    const { data: recarga, error: dbError } = await supabase
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
          qr_code: `https://gerarqrcodepix.com.br/api/v1?brcode=${encodeURIComponent(pixCopiaECola)}`,
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
