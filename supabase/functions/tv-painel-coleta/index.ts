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
    const errorText = await loginResponse.text();
    throw new Error(`Falha no login admin: ${loginResponse.status} - ${errorText}`);
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

    // Buscar etiquetas via /emissoes/admin (mesmo padrão do relatório admin)
    // Sem filtro de data — traz todas as etiquetas com o status informado
    const allEmissoes: any[] = [];
    const batchSize = 200;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const apiUrl = `${baseUrl}/emissoes/admin?status=${status}&limit=${batchSize}&offset=${offset}`;
      console.log(`📦 Buscando lote offset=${offset}: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar emissões (offset=${offset}):`, errorText);
        
        // Se for o primeiro lote, retorna erro
        if (offset === 0) {
          return new Response(
            JSON.stringify({ error: 'Falha ao buscar dados', details: errorText }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Se já temos dados, para de buscar
        break;
      }

      const json = await response.json();
      const batch = json?.data || json || [];

      if (Array.isArray(batch)) {
        allEmissoes.push(...batch);
      }

      // Se retornou menos que o batch, não há mais dados
      if (!Array.isArray(batch) || batch.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }

      // Limite de segurança
      if (allEmissoes.length >= 2000) {
        console.log(`⚠️ Limite de segurança atingido: ${allEmissoes.length} registros`);
        hasMore = false;
      }
    }

    console.log(`✅ Total: ${allEmissoes.length} etiquetas (status=${status})`);

    return new Response(
      JSON.stringify({ data: allEmissoes }),
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