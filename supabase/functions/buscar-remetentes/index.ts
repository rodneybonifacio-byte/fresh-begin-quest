// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

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

    console.log('✅ Token recebido');

    // Decodificar o JWT para extrair o clienteId
    const payload = JSON.parse(atob(apiToken.split('.')[1]));
    const clienteId = payload.clienteId;

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    console.log('🔍 Buscando remetentes para clienteId:', clienteId);

    // Token admin via cache compartilhado (evita login em /login a cada chamada)
    const baseUrl = Deno.env.get('BASE_API_URL');
    console.log('🔐 Obtendo token admin (cache)...');
    const adminToken = await getAdminTokenCached();
    console.log('✅ Token admin pronto');

    // Buscar remetentes do cliente usando o token de admin
    const remetentesResponse = await fetch(`${baseUrl}/remetentes?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!remetentesResponse.ok) {
      console.error('❌ Erro ao buscar remetentes:', await remetentesResponse.text());
      throw new Error('Falha ao buscar remetentes');
    }

    const remetentesData = await remetentesResponse.json();
    console.log('✅ Remetentes encontrados:', remetentesData.data?.length || 0);

    return new Response(
      JSON.stringify(remetentesData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar remetentes';
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

