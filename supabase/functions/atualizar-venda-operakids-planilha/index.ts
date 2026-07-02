// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

const soDigitos = (s: any) => String(s || '').replace(/\D/g, '');
const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g,' ').toUpperCase().trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { planilha, dataInicio, dataFim, remetenteNome = 'OPERA KIDS', dryRun = true } = body;

    if (!Array.isArray(planilha) || planilha.length === 0) {
      return new Response(JSON.stringify({ error: 'planilha vazia' }), { status: 400, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }

    const token = await getAdminTokenCached();

    // Fetch OperaKids emissions in range (paginated 100/pg)
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
    }

    const remN = norm(remetenteNome);
    const emissoes = all.filter((e: any) => norm(e.remetenteNome || e.remetente?.nome) === remN);

    // Build planilha map: documento -> {valorVenda, cliente} — with padding variants (leading zeros lost by Excel)
    const mapa = new Map<string, { valor: number; cliente: string }>();
    for (const row of planilha) {
      const doc = soDigitos(row.documento);
      if (!doc || !(row.valorVenda > 0)) continue;
      const val = { valor: Number(row.valorVenda), cliente: row.cliente || '' };
      mapa.set(doc, val);
      // CPF (up to 11 digits) — pad to 11
      if (doc.length <= 11) mapa.set(doc.padStart(11, '0'), val);
      // CNPJ (12-14) — pad to 14
      if (doc.length > 11 && doc.length <= 14) mapa.set(doc.padStart(14, '0'), val);
    }

    const preview: any[] = [];
    const semMatch: any[] = [];
    const semAlteracao: any[] = [];

    for (const e of emissoes) {
      const doc = soDigitos(e.destinatario?.cpfCnpj || e.destinatarioCpfCnpj);
      const planRow = doc ? mapa.get(doc) : null;
      if (!planRow) { semMatch.push({ id: e.id, codigoObjeto: e.codigoObjeto, destinatario: e.destinatario?.nome, doc }); continue; }
      const vendaAtual = parseFloat(e.valor || '0');
      const novoValor = planRow.valor;
      if (Math.abs(vendaAtual - novoValor) < 0.01) {
        semAlteracao.push({ id: e.id, codigoObjeto: e.codigoObjeto, valor: vendaAtual });
        continue;
      }
      preview.push({
        id: e.id,
        codigoObjeto: e.codigoObjeto,
        destinatario: e.destinatario?.nome,
        doc,
        vendaAtual,
        novoValorVenda: novoValor,
        diferenca: +(novoValor - vendaAtual).toFixed(2),
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true, dryRun: true,
        resumo: {
          totalEmissoesOperakids: emissoes.length,
          totalPlanilha: mapa.size,
          aAtualizar: preview.length,
          semAlteracao: semAlteracao.length,
          semMatch: semMatch.length,
        },
        preview, semMatch, semAlteracao,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Execute updates
    const ok: any[] = [];
    const erros: any[] = [];
    const BATCH = 6;
    for (let i = 0; i < preview.length; i += BATCH) {
      const batch = preview.slice(i, i + BATCH);
      await Promise.all(batch.map(async (item) => {
        try {
          const r = await fetch(`${BASE}/emissoes/${item.id}/atualizar-precos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ emissaoId: item.id, tipoAtualizacao: 'VALOR_VENDA', valor: item.novoValorVenda }),
          });
          if (r.ok) ok.push({ codigoObjeto: item.codigoObjeto, novoValor: item.novoValorVenda });
          else erros.push({ codigoObjeto: item.codigoObjeto, erro: await r.text() });
        } catch (err: any) {
          erros.push({ codigoObjeto: item.codigoObjeto, erro: err.message });
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
