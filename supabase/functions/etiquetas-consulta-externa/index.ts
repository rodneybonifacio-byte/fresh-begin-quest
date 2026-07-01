// @ts-nocheck
// Consulta externa de etiquetas — espelha crm-buscar-envio-api mas autenticado por API Key.
// Uso: outros sistemas (com IA) consultam dados normalizados de envios BRHUB.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
const EXTERNAL_KEY = Deno.env.get("BRHUB_EXTERNAL_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GENERIC_NAMES = ["", "loja", "remetente", "cliente"];

const normalizeCode = (c: string) => String(c || "").trim().toUpperCase();
const isGenericName = (n: string) => {
  const s = String(n || "").trim().toLowerCase();
  return GENERIC_NAMES.includes(s) || s.length < 2;
};
const formatFullName = (n: string) => {
  const c = String(n || "").trim();
  if (!c) return "Loja";
  return c.split(/\s+/).map((w, i) => {
    const l = w.toLowerCase();
    if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(l)) return l;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
};

function pickFirst(...values: any[]): string {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseMoney(...values: any[]): number {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(n) && Number.isFinite(n)) return Number(n);
  }
  return 0;
}
function parseNumber(...values: any[]): number | null {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!Number.isNaN(n) && Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: ctl.signal }); }
  finally { clearTimeout(t); }
}

function extractDataArray(p: any): any[] {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p.data)) return p.data;
  if (p.data && typeof p.data === "object") return [p.data];
  return [];
}
const extractCode = (i: any) => normalizeCode(i?.codigoObjeto || i?.codigo_objeto || i?.codigo || "");

function buildDestinationAddress(e: any): string {
  const d = e?.destinatario || {};
  const end = d?.endereco || {};
  const logradouro = pickFirst(end.logradouro, e.destinatarioLogradouro);
  const numero = pickFirst(end.numero, e.destinatarioNumero);
  const bairro = pickFirst(end.bairro, e.destinatarioBairro);
  const cidade = pickFirst(end.localidade, end.cidade, e.destinatarioCidade);
  const uf = pickFirst(end.uf, e.destinatarioUf);
  const cep = pickFirst(end.cep, e.destinatarioCep);
  return [
    [logradouro, numero, bairro].filter(Boolean).join(", "),
    [cidade, uf].filter(Boolean).join("-"),
    cep ? `CEP ${cep}` : "",
  ].filter(Boolean).join(" • ");
}

async function resolveSenderName(e: any): Promise<string> {
  const direct = pickFirst(e.remetenteNome, e.remetente_nome, e.remetente?.nome);
  if (!isGenericName(direct)) return formatFullName(direct);

  const rid = pickFirst(e.remetenteId, e.remetente_id);
  if (rid) {
    const { data } = await supabase.from("remetentes").select("nome").eq("id", rid).maybeSingle();
    if (data?.nome && !isGenericName(data.nome)) return formatFullName(data.nome);
  }
  const cpf = pickFirst(e.remetenteCpfCnpj, e.remetente_cpf_cnpj, e.remetente?.cpfCnpj);
  if (cpf) {
    const { data } = await supabase.from("remetentes").select("nome")
      .eq("cpf_cnpj", cpf.replace(/\D/g, "")).limit(1).maybeSingle();
    if (data?.nome && !isGenericName(data.nome)) return formatFullName(data.nome);
  }
  const cli = pickFirst(e.cliente?.nome, e.clienteNome);
  if (!isGenericName(cli)) return formatFullName(cli);
  return "Loja";
}

async function findByDirectQuery(token: string, code: string): Promise<any | null> {
  const params = ["codigoObjeto", "codigo_objeto", "codigo", "search"];
  for (const p of params) {
    const r = await fetchWithTimeout(`${BASE_API_URL}/emissoes/admin?${p}=${encodeURIComponent(code)}&limit=5&offset=0`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!r.ok) continue;
    const j = await r.json().catch(() => null);
    const items = extractDataArray(j);
    const found = items.find((it: any) => extractCode(it) === code);
    if (found) return found;
    if (items.length === 1) return items[0];
  }
  return null;
}

async function findByStatuses(token: string, code: string): Promise<any | null> {
  const statuses = ["PRE_POSTADO", "POSTADO", "EM_TRANSITO", "AGUARDANDO_RETIRADA", "ENTREGUE", "ATRASADO", "CANCELADO"];
  for (const s of statuses) {
    const r = await fetchWithTimeout(`${BASE_API_URL}/emissoes/admin?status=${s}&limit=200&offset=0`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!r.ok) continue;
    const j = await r.json().catch(() => null);
    const items = extractDataArray(j);
    const found = items.find((it: any) => extractCode(it) === code);
    if (found) return found;
  }
  return null;
}

async function fetchTracking(token: string, code: string): Promise<any[]> {
  try {
    const r = await fetchWithTimeout(`${BASE_API_URL}/rastreio/admin?codigoObjeto=${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }, 12000);
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    return j?.data?.historicoRastreio || j?.data?.eventos || [];
  } catch { return []; }
}

async function normalize(e: any, code: string, includeTracking: boolean, token: string) {
  const remetenteNome = await resolveSenderName(e);
  const destNome = pickFirst(e?.destinatario?.nome, e?.destinatarioNome);
  const peso = parseNumber(e?.peso, e?.pesoReal);
  const altura = parseNumber(e?.altura);
  const largura = parseNumber(e?.largura);
  const comprimento = parseNumber(e?.comprimento);
  const valorGasto = parseMoney(e?.valorPostagem, e?.valorVenda, e?.valor);

  const base: any = {
    codigoObjeto: code,
    clienteId: pickFirst(e?.clienteId, e?.cliente_id, e?.cliente?.id),
    status: pickFirst(e?.status, "pendente").toLowerCase(),
    servico: pickFirst(e?.servico, e?.nomeServico, e?.codigoServico, "—"),
    criadoEm: pickFirst(e?.criadoEm, e?.createdAt, e?.created_at),
    destinatarioNome: formatFullName(destNome),
    destinatarioEndereco: buildDestinationAddress(e),
    destinatarioCelular: pickFirst(e?.destinatario?.celular, e?.destinatarioCelular),
    remetenteNome,
    remetenteCpfCnpj: pickFirst(e?.remetenteCpfCnpj, e?.remetente?.cpfCnpj),
    valorGasto,
    peso, altura, largura, comprimento,
  };
  if (includeTracking) base.historicoRastreio = await fetchTracking(token, code);
  return base;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!EXTERNAL_KEY) {
      return new Response(JSON.stringify({ error: "BRHUB_EXTERNAL_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const provided = req.headers.get("x-api-key") || req.headers.get("apikey")
      || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (provided !== EXTERNAL_KEY) {
      return new Response(JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Aceita GET (?codigo=...) ou POST { codes: [], clienteId, limit, includeTracking }
    const url = new URL(req.url);
    let codesInput: string[] = [];
    let clienteId = "";
    let limit = 20;
    let includeTracking = false;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      codesInput = Array.isArray(body?.codes) ? body.codes : (body?.codigo ? [body.codigo] : []);
      clienteId = String(body?.clienteId || "").trim();
      limit = Math.min(Number(body?.limit) || 20, 50);
      includeTracking = Boolean(body?.includeTracking);
    } else {
      const one = url.searchParams.get("codigo") || url.searchParams.get("code");
      if (one) codesInput = [one];
      const multi = url.searchParams.get("codes");
      if (multi) codesInput = codesInput.concat(multi.split(","));
      clienteId = url.searchParams.get("clienteId") || "";
      limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
      includeTracking = url.searchParams.get("includeTracking") === "true";
    }

    const codes = Array.from(new Set(codesInput.map(normalizeCode).filter(Boolean))).slice(0, 10);

    if (codes.length === 0 && !clienteId) {
      return new Response(JSON.stringify({ error: "Informe 'codigo', 'codes' ou 'clienteId'", data: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = await getAdminTokenCached();
    const results: any[] = [];

    for (const code of codes) {
      let e = await findByDirectQuery(token, code);
      if (!e) e = await findByStatuses(token, code);
      if (!e) { results.push({ codigoObjeto: code, notFound: true }); continue; }
      results.push(await normalize(e, code, includeTracking, token));
    }

    if (clienteId && codes.length === 0) {
      const statuses = ["PRE_POSTADO", "POSTADO", "EM_TRANSITO", "AGUARDANDO_RETIRADA", "ENTREGUE", "ATRASADO"];
      const seen = new Set<string>();
      for (const s of statuses) {
        if (results.length >= limit) break;
        const r = await fetchWithTimeout(`${BASE_API_URL}/emissoes/admin?status=${s}&limit=200&offset=0`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!r.ok) continue;
        const items = extractDataArray(await r.json().catch(() => null));
        for (const it of items) {
          const cid = pickFirst(it?.clienteId, it?.cliente_id, it?.cliente?.id);
          if (cid !== clienteId) continue;
          const c = extractCode(it);
          if (!c || seen.has(c)) continue;
          seen.add(c);
          results.push(await normalize(it, c, includeTracking, token));
          if (results.length >= limit) break;
        }
      }
    }

    return new Response(JSON.stringify({ data: results, count: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[etiquetas-consulta-externa]", err?.message || err);
    return new Response(JSON.stringify({ error: String(err?.message || err), data: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
