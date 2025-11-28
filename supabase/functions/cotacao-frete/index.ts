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

    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    // Token do usuário - OBRIGATÓRIO
    const userToken = requestData.apiToken;
    
    if (!userToken) {
      console.error('❌ Token do usuário não fornecido');
      return new Response(
        JSON.stringify({
          error: 'Token de autenticação não encontrado. Faça login novamente.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Extrair clienteId para log
    let clienteId = null;
    try {
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      clienteId = tokenPayload.clienteId;
      console.log('👤 ClienteId:', clienteId);
    } catch (e) {
      console.warn('⚠️ Não foi possível extrair clienteId do token');
    }

    // Preparar dados da cotação
    const cotacaoPayload = {
      cepOrigem: requestData.cepOrigem,
      cepDestino: requestData.cepDestino,
      embalagem: requestData.embalagem,
      logisticaReversa: requestData.logisticaReversa || 'N',
      valorDeclarado: requestData.valorDeclarado || 0,
      ...(requestData.cpfCnpjLoja && { cpfCnpjLoja: requestData.cpfCnpjLoja }),
    };

    console.log('📊 Realizando cotação com token do usuário...');
    console.log('📦 Payload:', JSON.stringify(cotacaoPayload));
    
    const cotacaoResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cotacaoPayload),
    });

    const responseText = await cotacaoResponse.text();
    console.log('📄 Resposta (status):', cotacaoResponse.status);

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
    console.log('✅ Cotação realizada:', cotacaoData.data?.length || 0, 'opções');

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
