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

    // Extrair clienteId do token do usuário (se fornecido)
    let clienteId = null;
    let userToken = requestData.apiToken;
    
    if (userToken) {
      try {
        const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
        clienteId = tokenPayload.clienteId;
        console.log('👤 ClienteId extraído do token:', clienteId);
      } catch (e) {
        console.warn('⚠️ Não foi possível extrair clienteId do token');
        userToken = null;
      }
    } else {
      console.log('⚠️ apiToken não fornecido no request');
    }

    // Preparar dados da cotação
    const cotacaoPayload = {
      cepOrigem: requestData.cepOrigem,
      cepDestino: requestData.cepDestino,
      embalagem: requestData.embalagem,
      logisticaReversa: requestData.logisticaReversa || 'N',
      valorDeclarado: requestData.valorDeclarado || 0,
      // Incluir clienteId para aplicar regras específicas do cliente mesmo com auth admin
      ...(clienteId && { clienteId }),
      // Incluir cpfCnpjLoja se fornecido (para regras específicas do remetente)
      ...(requestData.cpfCnpjLoja && { cpfCnpjLoja: requestData.cpfCnpjLoja }),
    };

    // Função para fazer a cotação
    const realizarCotacao = async (token: string) => {
      console.log('📊 Realizando cotação com payload:', JSON.stringify(cotacaoPayload));
      
      const response = await fetch(`${baseUrl}/frete/cotacao`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotacaoPayload),
      });

      return response;
    };

    let cotacaoResponse;

    // IMPORTANTE: Usar APENAS token do usuário para aplicar regras do cliente
    // NÃO usar fallback para admin, pois isso aplicaria regras de preço incorretas
    if (!userToken) {
      console.error('❌ Token do usuário não fornecido - não é possível cotar sem credenciais do cliente');
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

    console.log('🔑 Realizando cotação com token do usuário...');
    cotacaoResponse = await realizarCotacao(userToken);
    
    // Se der 403, o cliente não tem permissão ou transportadora não configurada
    if (cotacaoResponse.status === 403) {
      console.error('❌ Usuário sem permissão para cotar frete (403)');
      const errorText = await cotacaoResponse.text();
      return new Response(
        JSON.stringify({
          error: 'Sem permissão para cotar frete. Verifique se as transportadoras estão configuradas.',
          details: errorText,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

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
