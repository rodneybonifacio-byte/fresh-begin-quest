// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Função para delay com retry
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função de retry com exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Tentativa ${attempt + 1} de ${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Não tentar novamente em caso de erro de autenticação ou configuração
      if (
        lastError.message.includes('não configurad') ||
        lastError.message.includes('401') ||
        lastError.message.includes('403')
      ) {
        throw lastError;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Tentativa falhou: ${lastError.message}. Aguardando ${delay}ms antes da próxima tentativa...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
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

    // Validar que todas as credenciais estão configuradas
    const requiredEnvs = [
      'BANCO_INTER_CLIENT_ID',
      'BANCO_INTER_CLIENT_SECRET',
      'BANCO_INTER_CHAVE_PIX',
      'BANCO_INTER_CLIENT_CERT',
      'BANCO_INTER_CLIENT_KEY',
      'BANCO_INTER_CA_CERT'
    ];

    const missingEnvs = requiredEnvs.filter(env => !Deno.env.get(env));
    if (missingEnvs.length > 0) {
      throw new Error(`Credenciais não configuradas: ${missingEnvs.join(', ')}`);
    }

    // URL do webhook para o Banco Inter
    const webhookUrl = `${supabaseUrl}/functions/v1/banco-inter-webhook`;

    console.log('Iniciando configuração do webhook...');
    console.log('Webhook URL:', webhookUrl);

    // Obter token de acesso com retry
    const accessToken = await retryWithBackoff(
      () => getAccessToken(),
      3,
      1000
    );

    // Configurar webhook com retry
    const result = await retryWithBackoff(
      () => configureWebhook(accessToken, webhookUrl),
      3,
      2000
    );

    console.log('✓ Webhook configurado com sucesso!');

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
    console.error('✗ Erro ao configurar webhook:', error);
    
    // Determinar código de status apropriado
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('não configurad')) {
        statusCode = 400;
      } else if (error.message.includes('401') || error.message.includes('403')) {
        statusCode = 401;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
