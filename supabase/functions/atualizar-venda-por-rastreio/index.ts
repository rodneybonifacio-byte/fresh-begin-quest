// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
const norm = (s: any) => String(s || '').toUpperCase().trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { itens, dataInicio, dataFim, remetenteNome = 'OPERA KIDS', dryRun = true } = body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return new Response(JSON.stringify({ error: 'itens vazio' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!dataInicio || !dataFim) {
      return new Response(JSON.stringify({ error: 'dataInicio e dataFim obrigatorios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = await getAdminTokenCached();

    // Fetch emissions in range (paginated 100/pg)
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const qs = new URLSearchParams({ dataInicio, dataFim, limit: '100', offset: String(offset) });
      const r = await fetch(`${BASE}/emissoes/admin?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Fetch emissoes: ${await r.text()}`);
      const j = await r.json();
      const pg = j?.data || j || [];
      all = all.concat(pg);
      if (pg.length < 100) break;
      offset += 100;
      if (offset > 20000) break;
    }

    const remN = norm(remetenteNome);
    const nomesUnicos = new Set<string>();
    for (const e of all) { nomesUnicos.add(String(e.remetenteNome || e.remetente?.nome || '')); }
    const opera = [...nomesUnicos].filter(n => n.toUpperCase().includes('OPERA'));
    console.log('total_all=', all.length, 'nomes_unicos=', nomesUnicos.size, 'opera_matches=', JSON.stringify(opera));
    const emissoes = all.filter((e: any) => norm(e.remetenteNome || e.remetente?.nome) === remN);
    console.log('emissoes_filtered=', emissoes.length, 'sample_raw=', JSON.stringify(Object.keys(all[0]||{})));

    // Map codigoObjeto -> emissao
    const porCodigo = new Map<string, any>();
    for (const e of emissoes) {
      const cod = norm(e.codigoObjeto);
      if (cod) porCodigo.set(cod, e);
    }

    const preview: any[] = [];
    const semMatch: any[] = [];
    const semAlteracao: any[] = [];

    for (const item of itens) {
      const cod = norm(item.codigoObjeto);
      const novoValor = Number(item.valorVenda);
      if (!cod || !(novoValor > 0)) continue;
      const e = porCodigo.get(cod);
      if (!e) { semMatch.push({ codigoObjeto: cod }); continue; }
      const vendaAtual = parseFloat(e.valor || '0');
      if (Math.abs(vendaAtual - novoValor) < 0.01) {
        semAlteracao.push({ id: e.id, codigoObjeto: cod, valor: vendaAtual });
        continue;
      }
      preview.push({
        id: e.id,
        codigoObjeto: cod,
        destinatario: e.destinatario?.nome,
        vendaAtual,
        novoValorVenda: novoValor,
        diferenca: +(novoValor - vendaAtual).toFixed(2),
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true, dryRun: true,
        resumo: {
          totalEmissoesRemetente: emissoes.length,
          totalItens: itens.length,
          aAtualizar: preview.length,
          semAlteracao: semAlteracao.length,
          semMatch: semMatch.length,
        },
        preview, semMatch, semAlteracao,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Execute
    const ok: any[] = [];
    const erros: any[] = [];
    const BATCH = 6;
    for (let i = 0; i < preview.length; i += BATCH) {
      const batch = preview.slice(i, i + BATCH);
      await Promise.all(batch.map(async (it) => {
        try {
          const r = await fetch(`${BASE}/emissoes/${it.id}/atualizar-precos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ emissaoId: it.id, tipoAtualizacao: 'VALOR_VENDA', valor: it.novoValorVenda }),
          });
          if (r.ok) ok.push({ codigoObjeto: it.codigoObjeto, novoValor: it.novoValorVenda });
          else erros.push({ codigoObjeto: it.codigoObjeto, erro: await r.text() });
        } catch (err: any) {
          erros.push({ codigoObjeto: it.codigoObjeto, erro: err.message });
        }
      }));
      if (i + BATCH < preview.length) await new Promise(r => setTimeout(r, 120));
    }

    return new Response(JSON.stringify({
      success: true, dryRun: false,
      resumo: { atualizadas: ok.length, erros: erros.length, semMatch: semMatch.length, semAlteracao: semAlteracao.length },
      atualizadas: ok, erros, semMatch,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
