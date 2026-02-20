// @ts-nocheck
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
    const { cepOrigem, cepDestino, peso } = await req.json();

    const baseUrl = Deno.env.get('BASE_API_URL');
    const widgetEmail = Deno.env.get('WIDGET_CLIENT_EMAIL');
    const widgetPassword = Deno.env.get('WIDGET_CLIENT_PASSWORD');

    if (!baseUrl || !widgetEmail || !widgetPassword) {
      throw new Error('Configuração incompleta');
    }

    // 1. Autenticar com a conta financeiro@brhubb.com.br (25% de desconto)
    console.log('🔐 Autenticando com conta de demonstração...');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: widgetEmail, password: widgetPassword }),
    });

    if (!loginResponse.ok) {
      throw new Error('Falha na autenticação da conta de demonstração');
    }

    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.access_token || loginData.data?.token;

    if (!token) {
      throw new Error('Token não encontrado na resposta de autenticação');
    }

    // Extrair clienteId do token
    let clienteId = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      clienteId = payload.clienteId;
    } catch (e) {
      throw new Error('Token inválido');
    }

    // 2. Normalizar CEPs
    const normalizeCep = (cep: string) => cep.replace(/\D/g, '').padStart(8, '0');
    const cepO = normalizeCep(cepOrigem);
    const cepD = normalizeCep(cepDestino);
    const pesoGramas = Number(peso) || 300;

    // 3. Montar embalagem padrão baseada no peso
    const embalagem = {
      peso: pesoGramas.toString(),
      altura: "2",
      largura: "11",
      comprimento: "16",
      diametro: "0",
    };

    // 4. Fazer cotação
    const cotacaoPayload = {
      cepOrigem: cepO,
      cepDestino: cepD,
      embalagem,
      valorDeclarado: 0,
      clienteId,
    };

    console.log('📊 Cotação:', JSON.stringify(cotacaoPayload));

    const cotacaoResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cotacaoPayload),
    });

    const responseText = await cotacaoResponse.text();

    if (!cotacaoResponse.ok) {
      console.error('❌ Erro cotação:', responseText);
      return new Response(
        JSON.stringify({ error: `Erro na cotação: ${responseText}`, status: cotacaoResponse.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: cotacaoResponse.status }
      );
    }

    const data = JSON.parse(responseText);
    console.log('✅ Cotação OK:', data?.data?.length || 0, 'opções');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
