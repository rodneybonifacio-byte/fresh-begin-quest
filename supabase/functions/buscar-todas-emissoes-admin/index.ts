// @ts-nocheck
/// <reference path="./types.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmissoesParams {
  page?: string;
  limit?: string;
  status?: string;
  transportadora?: string;
  remetenteId?: string;
  dataIni?: string;
  dataFim?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Requisição recebida para buscar todas as emissões (admin)...');

    // Pegar os parâmetros da requisição enviados pelo frontend
    const { params } = await req.json();
    console.log('📋 Parâmetros recebidos:', params);

    // Fazer login na API externa com credenciais de admin
    console.log('🔑 Fazendo login na API externa como admin...');
    
    const baseApiUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!baseApiUrl || !adminEmail || !adminPassword) {
      console.error('❌ Variáveis de ambiente não configuradas');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Login na API
    const loginResponse = await fetch(`${baseApiUrl}/login`, {
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
      console.error('❌ Erro ao fazer login na API:', await loginResponse.text());
      return new Response(
        JSON.stringify({ error: 'Erro ao autenticar com API externa' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.token || loginData.data?.token;

    if (!adminToken) {
      console.error('❌ Token admin não encontrado na resposta');
      return new Response(
        JSON.stringify({ error: 'Token admin não obtido' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Login admin bem-sucedido');

    // Construir query string
    const queryParams: EmissoesParams = params || {};
    const queryString = new URLSearchParams(
      Object.entries(queryParams)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString();

    const emissoesUrl = `${baseApiUrl}/emissoes${queryString ? `?${queryString}` : ''}`;
    console.log('📞 Buscando emissões em:', emissoesUrl);

    // Buscar todas as emissões usando o token admin
    const emissoesResponse = await fetch(emissoesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    if (!emissoesResponse.ok) {
      const errorText = await emissoesResponse.text();
      console.error('❌ Erro ao buscar emissões:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar emissões da API' }),
        {
          status: emissoesResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emissoesData = await emissoesResponse.json();
    
    // Garantir que sempre retornamos um objeto válido
    const responseData = emissoesData || { data: [] };
    if (!responseData.data) {
      responseData.data = [];
    }
    
    console.log(`✅ ${responseData.data.length} emissões encontradas`);

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erro no edge function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
