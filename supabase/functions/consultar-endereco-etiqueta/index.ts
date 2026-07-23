// @ts-nocheck
// Retorna o endereço REAL de destino de uma etiqueta consultando a API BRHUB.
// Uso: tool exposta ao Sergio para responder perguntas sobre endereço registrado.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

const normalizeCode = (c: string) => String(c || "").trim().toUpperCase();

function pickFirst(...values: any[]): string {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000) {
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

async function findEmissao(token: string, code: string): Promise<any | null> {
  for (const p of ["codigoObjeto", "codigo_objeto", "codigo", "search"]) {
    const r = await fetchWithTimeout(`${BASE_API_URL}/emissoes/admin?${p}=${encodeURIComponent(code)}&limit=5&offset=0`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!r.ok) continue;
    const items = extractDataArray(await r.json().catch(() => null));
    const found = items.find((it: any) => extractCode(it) === code);
    if (found) return found;
    if (items.length === 1) return items[0];
  }
  const statuses = ["POSTADO", "EM_TRANSITO", "AGUARDANDO_RETIRADA", "PRE_POSTADO", "ATRASADO", "ENTREGUE"];
  for (const s of statuses) {
    const r = await fetchWithTimeout(`${BASE_API_URL}/emissoes/admin?status=${s}&limit=200&offset=0`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!r.ok) continue;
    const items = extractDataArray(await r.json().catch(() => null));
    const found = items.find((it: any) => extractCode(it) === code);
    if (found) return found;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const code = normalizeCode(body?.codigo_rastreio || body?.codigo || body?.codigoObjeto || "");
    if (!code) {
      return new Response(JSON.stringify({ error: "Informe codigo_rastreio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = await getAdminTokenCached();
    const e = await findEmissao(token, code);
    if (!e) {
      return new Response(JSON.stringify({ found: false, codigo: code, message: "Etiqueta não localizada na base BRHUB." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const d = e?.destinatario || {};
    const end = d?.endereco || {};
    const out = {
      found: true,
      codigo: code,
      destinatarioNome: pickFirst(d.nome, e.destinatarioNome),
      cpfCnpj: pickFirst(d.cpfCnpj, d.cpf_cnpj, e.destinatarioCpfCnpj),
      telefone: pickFirst(d.celular, d.telefone, e.destinatarioCelular),
      endereco: {
        logradouro: pickFirst(end.logradouro, e.destinatarioLogradouro),
        numero: pickFirst(end.numero, e.destinatarioNumero),
        complemento: pickFirst(end.complemento, e.destinatarioComplemento),
        bairro: pickFirst(end.bairro, e.destinatarioBairro),
        cidade: pickFirst(end.localidade, end.cidade, e.destinatarioCidade),
        uf: pickFirst(end.uf, e.destinatarioUf),
        cep: pickFirst(end.cep, e.destinatarioCep),
      },
      enderecoFormatado: [
        [pickFirst(end.logradouro, e.destinatarioLogradouro), pickFirst(end.numero, e.destinatarioNumero), pickFirst(end.complemento, e.destinatarioComplemento)].filter(Boolean).join(", "),
        pickFirst(end.bairro, e.destinatarioBairro),
        [pickFirst(end.localidade, end.cidade, e.destinatarioCidade), pickFirst(end.uf, e.destinatarioUf)].filter(Boolean).join("-"),
        pickFirst(end.cep, e.destinatarioCep) ? `CEP ${pickFirst(end.cep, e.destinatarioCep)}` : "",
      ].filter(Boolean).join(" • "),
    };
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[consultar-endereco-etiqueta]", err?.message || err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
