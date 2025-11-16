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
    // Obter o token JWT da API externa do corpo da requisição
    const { apiToken } = await req.json();
    
    if (!apiToken) {
      throw new Error('Token de autenticação não fornecido');
    }

    console.log('✅ Token recebido, buscando dados do usuário...');

    // Decodificar o JWT para extrair o clienteId
    const payload = JSON.parse(atob(apiToken.split('.')[1]));
    const clienteId = payload.clienteId;

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    console.log('🔍 Buscando dados para clienteId:', clienteId);

    const baseUrl = Deno.env.get('BASE_API_URL');

    // Buscar dados do cliente usando o próprio token
    const clienteResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!clienteResponse.ok) {
      console.error('❌ Erro ao buscar cliente:', await clienteResponse.text());
      throw new Error('Falha ao buscar dados do cliente');
    }

    const clienteData = await clienteResponse.json();
    console.log('✅ Dados do cliente encontrados');

    // Buscar remetentes do cliente
    const remetentesResponse = await fetch(`${baseUrl}/remetentes?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    let remetentesData = { data: [] };
    if (remetentesResponse.ok) {
      remetentesData = await remetentesResponse.json();
      console.log('✅ Remetentes encontrados:', remetentesData.data?.length || 0);
    } else {
      console.warn('⚠️ Não foi possível buscar remetentes');
    }

    // Buscar destinatários do cliente
    const destinatariosResponse = await fetch(`${baseUrl}/destinatarios?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    let destinatariosData = { data: [] };
    if (destinatariosResponse.ok) {
      destinatariosData = await destinatariosResponse.json();
      console.log('✅ Destinatários encontrados:', destinatariosData.data?.length || 0);
    } else {
      console.warn('⚠️ Não foi possível buscar destinatários');
    }

    // Retornar todos os dados consolidados
    return new Response(
      JSON.stringify({
        cliente: clienteData.data,
        remetentes: remetentesData.data || [],
        destinatarios: destinatariosData.data || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar dados do usuário';
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
