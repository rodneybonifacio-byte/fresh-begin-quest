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

    // Helper para buscar lotes paginados
    async function fetchAllByStatus(st: string, maxRecords = 2000): Promise<any[]> {
      const results: any[] = [];
      const batchSize = 200;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const apiUrl = `${baseUrl}/emissoes/admin?status=${st}&limit=${batchSize}&offset=${offset}`;
        console.log(`📦 Buscando ${st} offset=${offset}`);

        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Erro ao buscar ${st} (offset=${offset}):`, errorText);
          if (offset === 0 && st === status) {
            throw { status: response.status, details: errorText };
          }
          break;
        }

        const json = await response.json();
        const batch = json?.data || json || [];

        if (Array.isArray(batch)) {
          results.push(...batch);
        }

        if (!Array.isArray(batch) || batch.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }

        if (results.length >= maxRecords) {
          console.log(`⚠️ Limite de segurança: ${results.length} registros (${st})`);
          hasMore = false;
        }
      }
      return results;
    }

    // 1. Buscar etiquetas PRE_POSTADO
    const prePostadas = await fetchAllByStatus(status);
    console.log(`✅ ${prePostadas.length} etiquetas ${status}`);

    // 2. Buscar etiquetas POSTADO para deduplicação
    const postadas = await fetchAllByStatus('POSTADO');
    console.log(`✅ ${postadas.length} etiquetas POSTADO (para dedup)`);

    // 3. Montar set de chaves (destinatario + dia) já postadas
    const getDedupeKey = (em: any): string => {
      const destNome = (em.destinatario?.nome || em.destinatarioNome || '').toUpperCase().trim();
      const remetNome = (em.remetenteNome || em.remetente?.nome || '').toUpperCase().trim();
      const dia = (em.criadoEm || '').split('T')[0]; // YYYY-MM-DD
      return `${remetNome}|${destNome}|${dia}`;
    };

    const postadasSet = new Set<string>();
    for (const em of postadas) {
      postadasSet.add(getDedupeKey(em));
    }

    // 4. Filtrar PRE_POSTADO removendo as que já foram postadas
    const filtradas = prePostadas.filter(em => {
      const key = getDedupeKey(em);
      if (postadasSet.has(key)) {
        console.log(`🔄 Dedup: removendo PRE_POSTADO (${em.codigoObjeto}) — já postada: ${key}`);
        return false;
      }
      return true;
    });

    console.log(`✅ Total final: ${filtradas.length} etiquetas (removidas ${prePostadas.length - filtradas.length} duplicadas)`);

    return new Response(
      JSON.stringify({ data: filtradas }),
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