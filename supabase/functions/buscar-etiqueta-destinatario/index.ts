// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

// Busca etiquetas por CPF/CNPJ do destinatário ou por nome (parcial).
// A API BRHUB não tem filtro confiável para destinatário, então paginamos por status
// e filtramos localmente. Ordem por status priorizando "vivos".

const STATUS_ORDER = ["POSTADO", "EM_TRANSITO", "AGUARDANDO_RETIRADA", "PRE_POSTADO", "ATRASADO", "ENTREGUE"];
const PAGE_SIZE = 100;
const MAX_PAGES_PER_STATUS = 5; // até 500 por status
const TIMEOUT_MS = 15000;

function onlyDigits(s: string) { return String(s || "").replace(/\D/g, ""); }
function normText(s: string) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
}

async function fetchTimeout(url: string, opts: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

function extractArr(p: any): any[] {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p.data)) return p.data;
  return [];
}

function pick(...v: any[]) {
  for (const x of v) if (x !== null && x !== undefined && String(x).trim() !== "") return String(x).trim();
  return "";
}

function extractDestinatario(e: any) {
  const d = e?.destinatario || {};
  return {
    nome: pick(d.nome, e.destinatarioNome, e.destinatario_nome),
    cpfCnpj: onlyDigits(pick(d.cpfCnpj, d.cpf_cnpj, d.cpf, e.destinatarioCpfCnpj, e.destinatario_cpf_cnpj)),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const cpfBusca = onlyDigits(body?.cpfCnpj || "");
    const nomeBusca = normText(body?.nome || "");
    const limit = Math.min(Number(body?.limit) || 10, 30);
    const debug = !!body?.debug;

    if (!cpfBusca && !nomeBusca) {
      return new Response(JSON.stringify({ error: "Informe cpfCnpj ou nome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = await getAdminTokenCached();
    const results: any[] = [];
    const seen = new Set<string>();
    const debugSamples: any[] = [];
    const remetenteNames = new Set<string>();

    outer:
    for (const status of STATUS_ORDER) {
      for (let page = 0; page < MAX_PAGES_PER_STATUS; page++) {
        const offset = page * PAGE_SIZE;
        const url = `${BASE_API_URL}/emissoes/admin?status=${status}&limit=${PAGE_SIZE}&offset=${offset}`;
        const r = await fetchTimeout(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) break;
        const items = extractArr(await r.json().catch(() => null));
        if (items.length === 0) break;

        if (debug && debugSamples.length < 2) {
          debugSamples.push({ status, keys: Object.keys(items[0] || {}), sample: items[0] });
        }

        for (const e of items) {
          const dest = extractDestinatario(e);
          const remNome = pick(e.remetenteNome, e.remetente?.nome, e.remetente_nome, e.cliente?.nome, e.clienteNome, e.cliente_nome);
          const remCpf = onlyDigits(pick(e.remetente?.cpfCnpj, e.remetente?.cpf_cnpj, e.remetenteCpfCnpj, e.remetente_cpf_cnpj, e.cliente?.cpfCnpj, e.cliente?.cpf_cnpj));
          if (debug && remNome) remetenteNames.add(remNome);
          let match = false;
          let matchTipo = "";
          if (cpfBusca) {
            if (dest.cpfCnpj === cpfBusca) { match = true; matchTipo = "destinatario"; }
            else if (remCpf === cpfBusca) { match = true; matchTipo = "remetente"; }
          }
          if (!match && nomeBusca) {
            if (dest.nome) {
              const dn = normText(dest.nome);
              if (dn.includes(nomeBusca) || nomeBusca.includes(dn)) { match = true; matchTipo = "destinatario"; }
            }
            if (!match && remNome) {
              const rn = normText(remNome);
              if (rn.includes(nomeBusca) || nomeBusca.includes(rn)) { match = true; matchTipo = "remetente"; }
            }
          }
          if (!match) continue;

          const code = pick(e.codigoObjeto, e.codigo_objeto, e.codigo);
          if (!code || seen.has(code)) continue;
          seen.add(code);
          results.push({
            codigoObjeto: code,
            status: pick(e.status, status).toLowerCase(),
            matchTipo,
            destinatarioNome: dest.nome,
            destinatarioCpfCnpj: dest.cpfCnpj ? "***" + dest.cpfCnpj.slice(-4) : null,
            remetenteNome: remNome,
            clienteId: pick(e.clienteId, e.cliente_id, e.cliente?.id),
            criadoEm: pick(e.criadoEm, e.createdAt, e.created_at),
          });
          if (results.length >= limit) break outer;
        }
        if (items.length < PAGE_SIZE) break;
      }
    }

    return new Response(JSON.stringify({
      data: results,
      total: results.length,
      criterio: { cpfCnpj: cpfBusca ? "***" + cpfBusca.slice(-4) : null, nome: body?.nome || null },
      ...(debug ? { debugSamples, remetentesEncontrados: Array.from(remetenteNames).slice(0, 50) } : {}),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[buscar-etiqueta-destinatario]", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "erro", data: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
