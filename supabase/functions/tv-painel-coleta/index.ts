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
    console.log(`✅ ${prePostadas.length} etiquetas ${status} (antes do filtro de 4 dias)`);

    // 1b. Filtrar por limite de 4 dias — remover etiquetas muito antigas
    const now = new Date();
    const quatroDiasAtras = new Date(now);
    quatroDiasAtras.setDate(now.getDate() - 4);
    quatroDiasAtras.setHours(0, 0, 0, 0);

    const prePostadasRecentes = prePostadas.filter(em => {
      const dataEmissao = em.criadoEm || em.dataCriacao || em.dataEmissao || em.createdAt || em.created_at;
      if (!dataEmissao) return true; // Se não tem data, mantém por segurança
      const dataObj = new Date(dataEmissao);
      if (isNaN(dataObj.getTime())) return true; // Data inválida, mantém
      if (dataObj < quatroDiasAtras) {
        console.log(`📅 Filtro 4 dias: removendo ${em.codigoObjeto} (data: ${dataEmissao})`);
        return false;
      }
      return true;
    });
    console.log(`✅ ${prePostadasRecentes.length} etiquetas após filtro de 4 dias (removidas ${prePostadas.length - prePostadasRecentes.length})`);

    // 2. Buscar etiquetas POSTADO para deduplicação
    const postadas = await fetchAllByStatus('POSTADO');
    console.log(`✅ ${postadas.length} etiquetas POSTADO (para dedup)`);

    // 3. Montar set de códigos de objeto já postados (dedup por código único)
    const postadasByCode = new Set<string>();
    for (const em of postadas) {
      if (em.codigoObjeto) {
        postadasByCode.add(em.codigoObjeto.toUpperCase().trim());
      }
    }

    // 3b. Montar set de chaves (remetente + destinatário) já postadas (sem filtro de dia)
    const getDedupeKey = (em: any): string => {
      const destNome = (em.destinatario?.nome || em.destinatarioNome || '').toUpperCase().trim();
      const remetNome = (em.remetenteNome || em.remetente?.nome || '').toUpperCase().trim();
      return `${remetNome}|${destNome}`;
    };

    const postadasByKey = new Set<string>();
    for (const em of postadas) {
      postadasByKey.add(getDedupeKey(em));
    }

    // 3c. Códigos removidos manualmente (exclusão pontual)
    const codigosExcluidos = new Set([
      'AN677079480BR',
      'AN677032672BR',
    ]);

    // 4. Filtrar PRE_POSTADO removendo as que já foram postadas
    const filtradas = prePostadasRecentes.filter(em => {
      const code = (em.codigoObjeto || '').toUpperCase().trim();
      // Exclusão manual por código de objeto
      if (codigosExcluidos.has(code)) {
        console.log(`🚫 Exclusão manual: removendo ${em.codigoObjeto}`);
        return false;
      }
      // Dedup por código de objeto (exato)
      if (code && postadasByCode.has(code)) {
        console.log(`🔄 Dedup código: removendo PRE_POSTADO (${em.codigoObjeto}) — mesmo código já POSTADO`);
        return false;
      }
      // Dedup por remetente+destinatário (sem restrição de dia)
      const key = getDedupeKey(em);
      if (postadasByKey.has(key)) {
        console.log(`🔄 Dedup nome: removendo PRE_POSTADO (${em.codigoObjeto}) — ${key} já postada`);
        return false;
      }
      return true;
    });

    console.log(`✅ Total final: ${filtradas.length} etiquetas (removidas ${prePostadasRecentes.length - filtradas.length} duplicadas)`);

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