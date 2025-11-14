// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para formatar certificado PEM
function formatPemCert(cert: string): string {
  // Remove espaços em branco extras
  cert = cert.trim();
  
  // Se já está formatado corretamente, retorna
  if (cert.includes('\n')) {
    return cert;
  }
  
  // Extrai o header e footer
  const beginMatch = cert.match(/-----BEGIN [A-Z\s]+-----/);
  const endMatch = cert.match(/-----END [A-Z\s]+-----/);
  
  if (!beginMatch || !endMatch) {
    return cert;
  }
  
  const header = beginMatch[0];
  const footer = endMatch[0];
  
  // Extrai o conteúdo base64 (entre header e footer)
  let content = cert.substring(header.length, cert.length - footer.length);
  
  // Remove espaços do conteúdo
  content = content.replace(/\s/g, '');
  
  // Adiciona quebras de linha a cada 64 caracteres
  const formattedContent = content.match(/.{1,64}/g)?.join('\n') || content;
  
  return `${header}\n${formattedContent}\n${footer}`;
}

async function getAccessToken(): Promise<string> {
  console.log('Obtendo token de autenticação do Banco Inter...');
  
  const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET');
  const clientCert = Deno.env.get('BANCO_INTER_CLIENT_CERT');
  const clientKey = Deno.env.get('BANCO_INTER_CLIENT_KEY');
  const caCert = Deno.env.get('BANCO_INTER_CA_CERT');

  if (!clientId || !clientSecret || !clientCert || !clientKey || !caCert) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  console.log('Configurando certificados mTLS...');
  
  // Formatar certificados
  const formattedClientCert = formatPemCert(clientCert);
  const formattedCaCert = formatPemCert(caCert);
  const formattedClientKey = formatPemCert(clientKey);

  console.log('Certificado formatado - primeira linha:', formattedClientCert.split('\n')[0]);
  console.log('Certificado formatado - segunda linha:', formattedClientCert.split('\n')[1]);

  // Criar cliente HTTP com mTLS
  const httpClient = Deno.createHttpClient({
    cert: formattedClientCert,
    key: formattedClientKey,
    caCerts: [formattedCaCert]
  });

  const tokenUrl = 'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'cob.write cob.read pix.read pix.write webhook.read webhook.write',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    client: httpClient
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao obter token:', response.status, errorText);
    throw new Error(`Falha ao obter token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Token obtido com sucesso');
  
  return data.access_token;
}

async function configureWebhook(accessToken: string, webhookUrl: string): Promise<any> {
  const chave = Deno.env.get('BANCO_INTER_CHAVE_PIX');
  
  if (!chave) {
    throw new Error('Chave PIX não configurada');
  }

  const clientCert = Deno.env.get('BANCO_INTER_CLIENT_CERT');
  const clientKey = Deno.env.get('BANCO_INTER_CLIENT_KEY');
  const caCert = Deno.env.get('BANCO_INTER_CA_CERT');

  const formattedClientCert = formatPemCert(clientCert!);
  const formattedCaCert = formatPemCert(caCert!);
  const formattedClientKey = formatPemCert(clientKey!);

  // Criar cliente HTTP com mTLS
  const httpClient = Deno.createHttpClient({
    cert: formattedClientCert,
    key: formattedClientKey,
    caCerts: [formattedCaCert]
  });

  console.log('Configurando webhook para chave:', chave);
  console.log('URL do webhook:', webhookUrl);

  const url = `https://cdpj.partners.bancointer.com.br/banking/v2/pix/v2/webhook/${encodeURIComponent(chave)}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhookUrl: webhookUrl
    }),
    client: httpClient
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao configurar webhook:', response.status, errorText);
    throw new Error(`Falha ao configurar webhook: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Webhook configurado com sucesso:', data);
  
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL não configurado');
    }

    // URL do webhook para o Banco Inter
    const webhookUrl = `${supabaseUrl}/functions/v1/banco-inter-webhook`;

    console.log('Iniciando configuração do webhook...');

    // Obter token de acesso
    const accessToken = await getAccessToken();

    // Configurar webhook
    const result = await configureWebhook(accessToken, webhookUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook configurado com sucesso',
        data: result,
        webhookUrl: webhookUrl
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao configurar webhook:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
