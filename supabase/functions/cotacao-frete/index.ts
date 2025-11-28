// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    console.log('🚚 Iniciando cotação de frete...');

    const baseUrl = Deno.env.get('BASE_API_URL');
    
    // Credenciais do usuário com permissões completas na API BRHUB
    const apiUserEmail = 'contato@guilherme.com.br';
    const apiUserPassword = '123mudar';

    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    // Autenticar com usuário BRHUB para obter clienteId correto
    console.log('🔐 Autenticando com usuário BRHUB...');
    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: apiUserEmail,
        password: apiUserPassword,
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Erro no login:', errorText);
      throw new Error('Falha na autenticação com API BRHUB');
    }

    const loginData = await loginResponse.json();
    const apiToken = loginData.token;
    
    // Extrair clienteId do token do usuário autenticado (Guilherme)
    let clienteId = null;
    try {
      const tokenPayload = JSON.parse(atob(apiToken.split('.')[1]));
      clienteId = tokenPayload.clienteId;
      console.log('👤 ClienteId do Guilherme:', clienteId);
    } catch (e) {
      console.error('❌ Erro ao extrair clienteId:', e.message);
      throw new Error('Não foi possível identificar o cliente');
    }

    // Preparar dados da cotação - SEMPRE incluir clienteId para aplicar regras específicas
    const cotacaoPayload = {
      cepOrigem: requestData.cepOrigem,
      cepDestino: requestData.cepDestino,
      embalagem: requestData.embalagem,
      logisticaReversa: requestData.logisticaReversa || 'N',
      valorDeclarado: requestData.valorDeclarado || 0,
      clienteId, // CRÍTICO: Sempre enviar para aplicar regras do cliente
      ...(requestData.cpfCnpjLoja && { cpfCnpjLoja: requestData.cpfCnpjLoja }),
    };

    // Realizar cotação com token do usuário autorizado + clienteId no payload
    console.log('📊 Realizando cotação com clienteId:', clienteId);
    console.log('📦 Payload:', JSON.stringify(cotacaoPayload));
    
    const cotacaoResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cotacaoPayload),
    });

    const responseText = await cotacaoResponse.text();
    console.log('📄 Resposta da cotação (status):', cotacaoResponse.status);

    if (!cotacaoResponse.ok) {
      console.error('❌ Erro na cotação:', responseText);
      return new Response(
        JSON.stringify({
          error: `Erro na cotação: ${responseText}`,
          status: cotacaoResponse.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: cotacaoResponse.status,
        }
      );
    }

    const cotacaoData = JSON.parse(responseText);
    console.log('✅ Cotação realizada com sucesso:', cotacaoData.data?.length || 0, 'opções');

    return new Response(
      JSON.stringify(cotacaoData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao calcular frete';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
