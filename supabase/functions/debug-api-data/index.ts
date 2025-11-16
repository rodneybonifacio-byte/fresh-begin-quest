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
    const { apiToken } = await req.json();
    
    if (!apiToken) {
      throw new Error('Token de autenticação não fornecido');
    }

    console.log('🔍 Testando conexão com a API...');

    // Decodificar o JWT para extrair o clienteId
    const payload = JSON.parse(atob(apiToken.split('.')[1]));
    const clienteId = payload.clienteId;

    console.log('📋 ClienteId extraído:', clienteId);
    console.log('📋 Payload completo do token:', JSON.stringify(payload, null, 2));

    const baseUrl = Deno.env.get('BASE_API_URL');
    console.log('🌐 URL Base da API:', baseUrl);

    // Buscar dados do cliente
    console.log('📞 Chamando:', `${baseUrl}/clientes/${clienteId}`);
    const clienteResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status da resposta do cliente:', clienteResponse.status);
    const clienteText = await clienteResponse.text();
    console.log('📄 Resposta do cliente (raw):', clienteText);
    
    let clienteData;
    try {
      clienteData = JSON.parse(clienteText);
    } catch (e) {
      console.error('❌ Erro ao parsear JSON do cliente:', e);
      clienteData = { error: 'Resposta não é JSON válido', raw: clienteText };
    }

    // Buscar remetentes
    console.log('📞 Chamando:', `${baseUrl}/remetentes?clienteId=${clienteId}`);
    const remetentesResponse = await fetch(`${baseUrl}/remetentes?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status da resposta de remetentes:', remetentesResponse.status);
    const remetentesText = await remetentesResponse.text();
    console.log('📄 Resposta de remetentes (raw):', remetentesText);

    let remetentesData;
    try {
      remetentesData = JSON.parse(remetentesText);
    } catch (e) {
      console.error('❌ Erro ao parsear JSON de remetentes:', e);
      remetentesData = { error: 'Resposta não é JSON válido', raw: remetentesText };
    }

    // Buscar destinatários
    console.log('📞 Chamando:', `${baseUrl}/destinatarios?clienteId=${clienteId}`);
    const destinatariosResponse = await fetch(`${baseUrl}/destinatarios?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status da resposta de destinatários:', destinatariosResponse.status);
    const destinatariosText = await destinatariosResponse.text();
    console.log('📄 Resposta de destinatários (raw):', destinatariosText);

    let destinatariosData;
    try {
      destinatariosData = JSON.parse(destinatariosText);
    } catch (e) {
      console.error('❌ Erro ao parsear JSON de destinatários:', e);
      destinatariosData = { error: 'Resposta não é JSON válido', raw: destinatariosText };
    }

    return new Response(
      JSON.stringify({
        debug: {
          baseUrl,
          clienteId,
          tokenPayload: payload,
        },
        cliente: {
          status: clienteResponse.status,
          data: clienteData,
        },
        remetentes: {
          status: remetentesResponse.status,
          data: remetentesData,
        },
        destinatarios: {
          status: destinatariosResponse.status,
          data: destinatariosData,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
