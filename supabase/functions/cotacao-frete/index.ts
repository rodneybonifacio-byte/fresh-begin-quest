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

    // Usar o token do cliente que veio na requisição
    const userToken = requestData.userToken;
    
    if (!userToken) {
      console.error('❌ Token do usuário não fornecido');
      throw new Error('Token de autenticação não fornecido');
    }

    // Extrair clienteId do token do usuário
    let clienteId = null;
    try {
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      clienteId = tokenPayload.clienteId;
      console.log('👤 ClienteId do usuário:', clienteId);
    } catch (e) {
      console.error('❌ Erro ao extrair clienteId do token:', e.message);
      throw new Error('Token inválido - não foi possível identificar o cliente');
    }

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    // Preparar dados da cotação - SEMPRE incluir clienteId para aplicar regras específicas
    const isLogisticaReversa = requestData.logisticaReversa === 'S';
    
    if (isLogisticaReversa) {
      console.log('🔄 Logística reversa ativa - enviando logisticaReversa: "S" para API');
    }
    
    const cotacaoPayload = {
      cepOrigem: requestData.cepOrigem,
      cepDestino: requestData.cepDestino,
      embalagem: requestData.embalagem,
      valorDeclarado: requestData.valorDeclarado || 0,
      clienteId, // CRÍTICO: Sempre enviar para aplicar regras do cliente
      ...(isLogisticaReversa && { logisticaReversa: 'S' }), // Enviar logisticaReversa: "S" quando ativo
      ...(requestData.cpfCnpjLoja && { cpfCnpjLoja: requestData.cpfCnpjLoja }),
    };

    // Realizar cotação com token do próprio usuário
    console.log('📊 Realizando cotação com clienteId:', clienteId);
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
