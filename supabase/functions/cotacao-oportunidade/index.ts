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
    const { cepOrigem, cepDestino, peso, altura, largura, comprimento } = await req.json();

    const baseUrl = Deno.env.get('BASE_API_URL');
    const widgetEmail = Deno.env.get('WIDGET_CLIENT_EMAIL');
    const widgetPassword = Deno.env.get('WIDGET_CLIENT_PASSWORD');

    if (!baseUrl || !widgetEmail || !widgetPassword) {
      throw new Error('Configuração incompleta');
    }

    // 1. Autenticar com a conta widget (financeiro@brhubb.com.br)
    console.log('🔐 Autenticando com conta de demonstração...', widgetEmail);
    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: widgetEmail, password: widgetPassword }),
    });

    const loginRawText = await loginResponse.text();
    console.log('🔐 Login status:', loginResponse.status, 'body:', loginRawText.slice(0, 300));

    if (!loginResponse.ok) {
      // Tenta fallback com credenciais admin
      console.log('⚠️ Tentando fallback com credenciais admin...');
      const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
      const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

      if (!adminEmail || !adminPassword) {
        throw new Error(`Falha na autenticação. Status: ${loginResponse.status}. Body: ${loginRawText.slice(0, 200)}`);
      }

      const adminLoginResponse = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });

      const adminRawText = await adminLoginResponse.text();
      console.log('🔐 Admin login status:', adminLoginResponse.status, 'body:', adminRawText.slice(0, 300));

      if (!adminLoginResponse.ok) {
        throw new Error(`Falha na autenticação admin. Status: ${adminLoginResponse.status}`);
      }

      const adminData = JSON.parse(adminRawText);
      const adminToken = adminData.token || adminData.access_token || adminData.data?.token;
      if (!adminToken) throw new Error('Token admin não encontrado');

      // Usar admin token como fallback
      var loginData: any = adminData;
    } else {
      var loginData: any = JSON.parse(loginRawText);
    }

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
      peso: (Number(peso) || 300).toString(),
      altura: (Number(altura) || 2).toString(),
      largura: (Number(largura) || 11).toString(),
      comprimento: (Number(comprimento) || 16).toString(),
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
