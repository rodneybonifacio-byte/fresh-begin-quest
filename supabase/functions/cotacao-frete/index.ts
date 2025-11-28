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
    console.log('📦 Dados recebidos:', JSON.stringify({ ...requestData, apiToken: requestData.apiToken ? '***' : 'MISSING' }));

    const baseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!baseUrl || !adminEmail || !adminPassword) {
      throw new Error('Configurações de API não encontradas');
    }

    // Extrair clienteId do token do usuário (se fornecido)
    let clienteId = null;
    if (requestData.apiToken) {
      try {
        const tokenPayload = JSON.parse(atob(requestData.apiToken.split('.')[1]));
        clienteId = tokenPayload.clienteId;
        console.log('👤 ClienteId extraído do token:', clienteId);
      } catch (e) {
        console.warn('⚠️ Não foi possível extrair clienteId do token');
      }
    }

    // Autenticar com credenciais admin
    console.log('🔐 Autenticando com credenciais admin...');
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
      throw new Error('Falha na autenticação admin');
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.token;
    
    console.log('✅ Login admin realizado com sucesso');

    // Preparar dados da cotação - incluir clienteId para regras de negócio
    const cotacaoPayload = {
      cepOrigem: requestData.cepOrigem,
      cepDestino: requestData.cepDestino,
      embalagem: requestData.embalagem,
      logisticaReversa: requestData.logisticaReversa || 'N',
      valorDeclarado: requestData.valorDeclarado || 0,
      // Incluir clienteId para aplicar regras de plano/desconto do cliente
      ...(clienteId && { clienteId }),
      // Incluir cpfCnpjLoja se fornecido (para regras específicas do remetente)
      ...(requestData.cpfCnpjLoja && { cpfCnpjLoja: requestData.cpfCnpjLoja }),
    };

    console.log('📊 Realizando cotação com payload:', JSON.stringify(cotacaoPayload));
    
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
