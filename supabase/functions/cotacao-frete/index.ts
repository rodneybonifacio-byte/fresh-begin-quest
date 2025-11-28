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
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!baseUrl || !adminEmail || !adminPassword) {
      throw new Error('Configurações de API não encontradas');
    }

    // Extrair clienteId do token do usuário - OBRIGATÓRIO para aplicar regras do cliente
    let clienteId = null;
    const userToken = requestData.apiToken;
    
    if (userToken) {
      try {
        const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
        clienteId = tokenPayload.clienteId;
        console.log('👤 ClienteId extraído do token:', clienteId);
      } catch (e) {
        console.warn('⚠️ Não foi possível extrair clienteId do token:', e.message);
      }
    }

    if (!clienteId) {
      console.error('❌ ClienteId não encontrado - necessário para aplicar regras de preço');
      return new Response(
        JSON.stringify({
          error: 'Não foi possível identificar o cliente. Faça login novamente.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
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

    // Obter token admin para autenticação (bypass de permissões)
    console.log('🔐 Obtendo token admin para autenticação...');
    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Erro no login admin:', errorText);
      throw new Error('Falha na autenticação');
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.token;
    console.log('✅ Token admin obtido');

    // Realizar cotação com admin token MAS com clienteId no payload
    console.log('📊 Realizando cotação com clienteId:', clienteId);
    console.log('📦 Payload:', JSON.stringify(cotacaoPayload));
    
    const cotacaoResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
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