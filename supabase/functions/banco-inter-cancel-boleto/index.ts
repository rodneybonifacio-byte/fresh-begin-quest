// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Formatar certificado PEM
const formatPemCert = (pemString: string): string => {
  if (!pemString) return '';
  return pemString
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [A-Z\s]+-----\n?/g, match => match.trim() + '\n')
    .replace(/\n?-----END [A-Z\s]+-----/g, match => '\n' + match.trim())
    .trim();
};

// Obter token OAuth do Banco Inter
async function obterTokenBancoInter(httpClient: Deno.HttpClient): Promise<string> {
  const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET');
  
  console.log('🔑 Obtendo token OAuth...');
  
  const authString = btoa(`${clientId}:${clientSecret}`);
  
  const tokenResponse = await fetch('https://cdpj.partners.bancointer.com.br/oauth/v2/token', {
    method: 'POST',
    client: httpClient,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authString}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'boleto-cobranca.write boleto-cobranca.read',
    }),
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('❌ Erro ao obter token:', errorText);
    throw new Error(`Falha na autenticação: ${tokenResponse.status} - ${errorText}`);
  }
  
  const tokenData = await tokenResponse.json();
  console.log('✅ Token OAuth obtido com sucesso');
  
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let httpClient: Deno.HttpClient | null = null;

  try {
    console.log('🔴 Iniciando cancelamento de boleto...');
    
    const { nossoNumero, motivoCancelamento } = await req.json();
    
    if (!nossoNumero) {
      throw new Error('nossoNumero é obrigatório');
    }

    console.log('📋 Dados recebidos:', { nossoNumero, motivoCancelamento });

    // Configurar certificados para mTLS
    const clientCert = formatPemCert(Deno.env.get('BANCO_INTER_CLIENT_CERT') || '');
    const clientKey = formatPemCert(Deno.env.get('BANCO_INTER_CLIENT_KEY') || '');
    const caCert = formatPemCert(Deno.env.get('BANCO_INTER_CA_CERT') || '');

    if (!clientCert || !clientKey || !caCert) {
      throw new Error('Certificados não configurados corretamente');
    }

    // Criar cliente HTTP com mTLS
    httpClient = Deno.createHttpClient({
      certChain: clientCert,
      privateKey: clientKey,
      caCerts: [caCert],
    });

    // Obter token OAuth
    const accessToken = await obterTokenBancoInter(httpClient);

    // Cancelar boleto na API do Banco Inter
    console.log('🚫 Cancelando boleto:', nossoNumero);
    
    const cancelUrl = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${nossoNumero}/cancelar`;
    
    const cancelResponse = await fetch(cancelUrl, {
      method: 'POST',
      client: httpClient,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        motivoCancelamento: motivoCancelamento || 'OUTROS',
      }),
    });

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.text();
      console.error('❌ Erro ao cancelar boleto:', errorData);
      throw new Error(`Erro ao cancelar boleto: ${cancelResponse.status} - ${errorData}`);
    }

    console.log('✅ Boleto cancelado com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Boleto cancelado com sucesso',
        nossoNumero,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erro ao processar cancelamento:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  } finally {
    if (httpClient) {
      httpClient.close();
    }
  }
});
