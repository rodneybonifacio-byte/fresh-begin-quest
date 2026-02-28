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
    const status = url.searchParams.get('status') || 'PRE_POSTADO';

    const token = await getAdminToken();
    const baseUrl = Deno.env.get('BASE_API_URL');

    // Buscar data de hoje no formato YYYY-MM-DD
    const now = new Date();
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    const hoje = fmt(now);

    // Buscar etiquetas individuais via /emissoes com status PRE_POSTADO
    const apiUrl = `${baseUrl}/emissoes?status=${status}&dataIni=${hoje}&dataFim=${hoje}&limit=500`;
    console.log(`📦 Buscando etiquetas: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao buscar emissões:', errorText);
      return new Response(
        JSON.stringify({ error: 'Falha ao buscar dados', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`✅ Retornados ${(data?.data || data || []).length} registros`);
    
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
