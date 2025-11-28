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

    // Função para obter token admin
    const obterTokenAdmin = async () => {
      console.log('🔐 Obtendo token admin...');
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
      console.log('✅ Login admin realizado com sucesso');
      return loginData.token;
    };

    let cotacaoResponse;

    // Tentar primeiro com token do usuário (se disponível)
    if (userToken) {
      console.log('🔑 Tentando cotação com token do usuário...');
      cotacaoResponse = await realizarCotacao(userToken);
      
      // Se der 403 (acesso negado), fazer fallback para admin
      if (cotacaoResponse.status === 403) {
        console.log('⚠️ Token do usuário sem permissão (403), usando fallback admin...');
        const adminToken = await obterTokenAdmin();
        cotacaoResponse = await realizarCotacao(adminToken);
      }
    } else {
      // Sem token do usuário, usar admin diretamente
      console.log('🔐 Usando credenciais admin (sem token do usuário)...');
      const adminToken = await obterTokenAdmin();
      cotacaoResponse = await realizarCotacao(adminToken);
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
