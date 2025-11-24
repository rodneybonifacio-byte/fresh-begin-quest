// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Formatar certificado PEM corretamente
const formatPemCert = (pemString: string): string => {
  let cleaned = pemString.trim();
  
  if (cleaned.includes('\n')) {
    return cleaned;
  }
  
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
  
  const formatted = content.match(/.{1,64}/g)?.join('\n') || content;
  
  return `${header}\n${formatted}\n${footer}`;
};

// Obter token OAuth do Banco Inter
async function obterTokenBancoInter(httpClient: Deno.HttpClient): Promise<string> {
  const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET');

  console.log('🔐 Verificando credenciais do Banco Inter...');
  
  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  console.log('✅ Credenciais encontradas');

  const tokenUrl = 'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
  
  console.log('📡 Obtendo token de autenticação...');
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'boleto-cobranca.read boleto-cobranca.write',
      grant_type: 'client_credentials',
    }),
    client: httpClient,
  } as any);

  console.log('📡 Resposta recebida - Status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro na resposta:', error);
    throw new Error(`Erro ao obter token (${response.status}): ${error}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    console.error('❌ Token não encontrado na resposta:', data);
    throw new Error('Token não retornado pela API do Banco Inter');
  }
  
  console.log('✅ Token obtido com sucesso');
  return data.access_token;
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
