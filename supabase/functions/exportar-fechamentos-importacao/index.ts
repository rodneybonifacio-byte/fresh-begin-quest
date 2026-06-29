// Edge function: exportar-fechamentos-importacao
// Gera planilha XLSX no formato de importação de fechamentos externos,
// consolidando todas as etiquetas de faturas/subfaturas selecionadas.

import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";

interface Body {
  fatura_ids?: string[];
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return "";
  }
}

async function fetchJson(url: string, token: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function pLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try { out[idx] = await fn(items[idx]); } catch { out[idx] = null as any; }
    }
  });
  await Promise.all(workers);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token ausente" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json().catch(() => ({}));
    let parentIds: string[] = body.fatura_ids || [];

    if (parentIds.length === 0) {
      // Padrão: últimas faturas PENDENTE
      const list = await fetchJson(`${BASE_API_URL}/faturas/admin?status=PENDENTE&limit=100&offset=0`, token);
      parentIds = (list.data || []).map((f: any) => f.id);
    }

    // 1) Buscar detalhe de cada parent (e expandir subfaturas)
    const allDetalhes: any[] = [];
    for (const pid of parentIds) {
      try {
        const parent = (await fetchJson(`${BASE_API_URL}/faturas/admin/${pid}`, token)).data;
        if (parent?.detalhe?.length) allDetalhes.push(...parent.detalhe);
        const subs = parent?.faturas || [];
        if (subs.length) {
          const subResults = await pLimit(subs, 5, async (s: any) => {
            const sd = (await fetchJson(`${BASE_API_URL}/faturas/admin/${s.id}`, token)).data;
            return sd?.detalhe || [];
          });
          for (const arr of subResults) if (arr) allDetalhes.push(...arr);
        }
      } catch (e) {
        console.warn("Falha fatura", pid, e);
      }
    }

    // 2) Coletar códigos únicos
    const codigos = Array.from(
      new Set(
        allDetalhes
          .map((d: any) => d?.codigoObjeto)
          .filter((c: any) => c && c !== "-")
      )
    );

    // 3) Buscar emissão (remetente, custo, destinatário, data) em paralelo
    const emissoesMap: Record<string, any> = {};
    const fetched = await pLimit(codigos, 20, async (codigo: string) => {
      const d = await fetchJson(`${BASE_API_URL}/emissoes/admin?codigoObjeto=${codigo}`, token);
      const items = d.data || [];
      return { codigo, emissao: items[0] || null };
    });
    for (const f of fetched) if (f?.emissao) emissoesMap[f.codigo] = f.emissao;

    // 4) Montar linhas
    type Row = {
      Remetente: string;
      Destinatário: string;
      "Código Objeto": string;
      "Data Postagem": string;
      "Faturado (R$)": number;
      "Custo (R$)": number;
      "Margem (R$)": number;
    };

    const rows: Row[] = allDetalhes.map((d: any) => {
      const cod = d.codigoObjeto || "";
      const e = emissoesMap[cod];
      const remetente =
        e?.remetente?.nomeRemetente || e?.remetenteNome || "(SEM REMETENTE)";
      const destinatario =
        e?.destinatario?.nome || d?.nome || "";
      const faturado = parseFloat(e?.valor || e?.valorVenda || d?.valor || "0") || 0;
      const custo = parseFloat(e?.valorPostagem || e?.custo || d?.custo || "0") || 0;
      const dataPost = e?.criadoEm || d?.criadoEm || "";
      return {
        Remetente: remetente,
        Destinatário: destinatario,
        "Código Objeto": cod,
        "Data Postagem": fmtDate(dataPost),
        "Faturado (R$)": Math.round(faturado * 100) / 100,
        "Custo (R$)": Math.round(custo * 100) / 100,
        "Margem (R$)": Math.round((faturado - custo) * 100) / 100,
      };
    });

    // Ordenar por remetente, data, código
    rows.sort((a, b) =>
      a.Remetente.localeCompare(b.Remetente) ||
      a["Data Postagem"].localeCompare(b["Data Postagem"]) ||
      a["Código Objeto"].localeCompare(b["Código Objeto"])
    );

    // 5) Construir Resumo por remetente
    const grouped: Record<string, { qtd: number; fat: number; cus: number }> = {};
    for (const r of rows) {
      const k = r.Remetente;
      grouped[k] ||= { qtd: 0, fat: 0, cus: 0 };
      grouped[k].qtd += 1;
      grouped[k].fat += r["Faturado (R$)"];
      grouped[k].cus += r["Custo (R$)"];
    }
    const resumo = Object.entries(grouped)
      .map(([Remetente, v]) => ({
        Remetente,
        Etiquetas: v.qtd,
        "Faturado (R$)": Math.round(v.fat * 100) / 100,
        "Custo (R$)": Math.round(v.cus * 100) / 100,
        "Margem (R$)": Math.round((v.fat - v.cus) * 100) / 100,
      }))
      .sort((a, b) => a.Remetente.localeCompare(b.Remetente));
    const totalQtd = resumo.reduce((a, r) => a + r.Etiquetas, 0);
    const totalFat = resumo.reduce((a, r) => a + r["Faturado (R$)"], 0);
    const totalCus = resumo.reduce((a, r) => a + r["Custo (R$)"], 0);
    resumo.push({
      Remetente: "TOTAL",
      Etiquetas: totalQtd,
      "Faturado (R$)": Math.round(totalFat * 100) / 100,
      "Custo (R$)": Math.round(totalCus * 100) / 100,
      "Margem (R$)": Math.round((totalFat - totalCus) * 100) / 100,
    });

    // 6) Gerar XLSX
    const wb = XLSX.utils.book_new();
    const wsEt = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsEt, "Etiquetas");
    const wsRes = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsRes, "Resumo");

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;

    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="fechamentos_importacao_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "X-Total-Etiquetas": String(rows.length),
        "X-Total-Remetentes": String(Object.keys(grouped).length),
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
