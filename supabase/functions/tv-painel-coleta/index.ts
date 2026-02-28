import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getAdminToken(): Promise<string> {
  const baseUrl = Deno.env.get('BASE_API_URL');
  const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
  const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

  if (!adminEmail || !adminPassword || !baseUrl) {
    throw new Error('Credenciais de admin não configuradas');
  }

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Falha no login admin: ${loginResponse.status}`);
  }

  const loginData = await loginResponse.json();
  return loginData.data?.token || loginData.token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dataIni = url.searchParams.get('dataIni');
    const dataFim = url.searchParams.get('dataFim');
    const status = url.searchParams.get('status') || 'PRE_POSTADO';

    if (!dataIni || !dataFim) {
      return new Response(
        JSON.stringify({ error: 'dataIni e dataFim são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getAdminToken();
    const baseUrl = Deno.env.get('BASE_API_URL');

    const apiUrl = `${baseUrl}/emissoes/ordem-coleta?dataIni=${dataIni}&dataFim=${dataFim}&status=${status}`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao buscar ordem-coleta:', errorText);
      return new Response(
        JSON.stringify({ error: 'Falha ao buscar dados', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro na edge function tv-painel-coleta:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
