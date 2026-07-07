const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function cleanSecret(v: string | undefined): string {
  if (!v) return '';
  // Remove espaços, BOM, zero-width chars e qualquer caractere de controle/invisível
  return v
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

async function getAdminToken(): Promise<string> {
  const baseUrl = cleanSecret(Deno.env.get('BASE_API_URL'));
  // EXIGE credencial dedicada da TV — sem fallback para admin geral (evita lockouts cruzados).
  const tvEmail = cleanSecret(Deno.env.get('TV_COLETA_EMAIL'));
  const tvPassword = cleanSecret(Deno.env.get('TV_COLETA_PASSWORD'));

  if (!tvEmail || !tvPassword || !baseUrl) {
    throw new Error(`TV_COLETA_EMAIL/TV_COLETA_PASSWORD obrigatórios (baseUrl=${!!baseUrl}, email=${!!tvEmail}, pwd=${!!tvPassword})`);
  }

  console.log(`🔐 Login TV (dedicada): baseUrl=${baseUrl} emailLen=${tvEmail.length} pwdLen=${tvPassword.length}`);

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: tvEmail, password: tvPassword }),
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    throw new Error(`Falha no login TV: ${loginResponse.status} - ${errorText}`);
  }

  const loginData = await loginResponse.json();
  return loginData.data?.token || loginData.token;
}

Deno.serve(async (req) => {
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
      const batchSize = 100; // BRHUB API tem limite hard de 100/página

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
    // Log remetentes únicos para debug
    const remetentesUnicos = new Set(prePostadas.map((em: any) => (em.remetenteNome || em.remetente?.nome || 'SEM_NOME').toUpperCase().trim()));
    console.log(`📋 Remetentes PRE_POSTADO: ${[...remetentesUnicos].join(', ')}`);

    // 1b. Filtrar por limite de 4 dias — remover etiquetas muito antigas
    const now = new Date();
    const quatroDiasAtras = new Date(now);
    quatroDiasAtras.setDate(now.getDate() - 4);
    quatroDiasAtras.setHours(0, 0, 0, 0);

    // Clientes que ignoram o filtro de 4 dias (nenhum no momento)
    const BYPASS_4DIAS: string[] = [];
    const isBypass4Dias = (em: any): boolean => {
      if (BYPASS_4DIAS.length === 0) return false;
      const nome = (em.remetenteNome || em.remetente?.nome || '').toUpperCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return BYPASS_4DIAS.some(c => nome.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    };

    const prePostadasRecentes = prePostadas.filter(em => {
      // Bypass do filtro de 4 dias para clientes específicos
      if (isBypass4Dias(em)) return true;
      const dataEmissao = em.criadoEm || em.dataCriacao || em.dataEmissao || em.createdAt || em.created_at;
      if (!dataEmissao) return true;
      const dataObj = new Date(dataEmissao);
      if (isNaN(dataObj.getTime())) return true;
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

    // 3d. Remetentes ocultados manualmente do painel (+ nomes desconhecidos/vazios)
    const REMETENTES_OCULTOS = new Set(['EDSON SOUZA', 'EDSON COSTA', 'PREMIUMVESTI', 'PREMIUM VESTI', 'BAKARIXYZ', 'BAKARI XYZ']);
    const NOMES_INVALIDOS = new Set(['', 'DESCONHECIDO', 'SEM NOME', 'SEM_NOME', 'NAO INFORMADO', 'NAO INFORMADA', 'N/A', 'NA', 'NULL', 'UNDEFINED', 'SEM REMETENTE']);
    const isRemetenteOculto = (em: any): boolean => {
      const nome = (em.remetenteNome || em.remetente?.nome || '').toUpperCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (NOMES_INVALIDOS.has(nome)) return true;
      if (REMETENTES_OCULTOS.has(nome)) return true;
      // Bloquear qualquer coisa que contenha BAKARI
      if (nome.includes('BAKARI')) return true;
      return false;
    };

    // 3e. Detectar etiquetas de TESTE (remetente ou destinatário contendo "TESTE")
    const isEtiquetaTeste = (em: any): boolean => {
      const remet = (em.remetenteNome || em.remetente?.nome || '').toUpperCase();
      const dest = (em.destinatario?.nome || em.destinatarioNome || '').toUpperCase();
      return /\bTESTE\b/.test(remet) || /\bTESTE\b/.test(dest) || remet.includes('BRHUB TESTE') || dest.includes('BRHUB TESTE');
    };

    // 3f. Detectar etiquetas Rodonaves (não devem aparecer no painel)
    const isRodonaves = (em: any): boolean => {
      const servico = String(em.servico || '').toUpperCase();
      const transp = String(em.transportadora || em.transportadoraNome || '').toUpperCase();
      return servico.includes('RODONAVE') || transp.includes('RODONAVE') || transp.includes('RTE');
    };

    // 4. Códigos de serviço de logística reversa dos Correios
    const codigosServicoReversa = new Set(['04227', '04162', '03131', '03132']);

    // 5. Filtrar PRE_POSTADO removendo as que já foram postadas + reversas
    const filtradas = prePostadasRecentes.filter(em => {
      const code = (em.codigoObjeto || '').toUpperCase().trim();
      // Exclusão manual por código de objeto
      if (codigosExcluidos.has(code)) {
        console.log(`🚫 Exclusão manual: removendo ${em.codigoObjeto}`);
        return false;
      }
      // Exclusão manual por nome do remetente
      if (isRemetenteOculto(em)) {
        console.log(`🚫 Remetente oculto: removendo ${em.codigoObjeto}`);
        return false;
      }
      // Filtrar etiquetas de logística reversa
      const servicoCode = String(em.codigoServicoPostagem || em.codigoServicoVenda || '');
      const servicoNome = String(em.servico || '').toUpperCase();
      const isReversa = em.logisticaReversa === 'S' 
        || codigosServicoReversa.has(servicoCode)
        || servicoNome.includes('REVERS');
      if (isReversa) {
        console.log(`🔁 Reversa: removendo ${em.codigoObjeto} (servico: ${em.servico}, code: ${servicoCode})`);
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

    console.log(`✅ Total final BRHUB: ${filtradas.length} etiquetas (removidas ${prePostadasRecentes.length - filtradas.length} duplicadas)`);

    // 6. Buscar etiquetas externas (enviadas via API painel-coleta-ingest)
    let externas: any[] = [];
    try {
      const supaUrl = Deno.env.get('SUPABASE_URL');
      const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supaUrl && supaKey) {
        const nowIso = new Date().toISOString();
        const resp = await fetch(`${supaUrl}/rest/v1/painel_coleta_externo?select=*&expires_at=gt.${nowIso}&order=data_emissao.desc&limit=500`, {
          headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
        });
        if (resp.ok) {
          const rows = await resp.json();
          externas = (rows || []).map((r: any) => ({
            codigoObjeto: r.codigo_objeto,
            remetenteNome: r.remetente_nome,
            destinatario: { nome: r.destinatario_nome || '' },
            servico: r.servico || '',
            criadoEm: r.data_emissao,
            origem: r.origem || 'externo',
            _externo: true,
          }));
          // Aplica os mesmos filtros de remetente oculto/dedup
          externas = externas.filter((em) => {
            if (isRemetenteOculto(em)) return false;
            const code = (em.codigoObjeto || '').toUpperCase().trim();
            if (code && postadasByCode.has(code)) return false;
            return true;
          });
          console.log(`✅ ${externas.length} etiquetas externas adicionadas`);
        } else {
          console.error('Erro ao buscar painel_coleta_externo:', resp.status);
        }
      }
    } catch (e) {
      console.error('Falha ao buscar etiquetas externas:', e);
    }

    const todas = [...filtradas, ...externas];

    return new Response(
      JSON.stringify({ data: todas }),
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