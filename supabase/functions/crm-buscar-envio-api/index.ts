// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
const API_ADMIN_EMAIL = Deno.env.get("API_ADMIN_EMAIL");
const API_ADMIN_PASSWORD = Deno.env.get("API_ADMIN_PASSWORD");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GENERIC_NAMES = ["", "loja", "remetente", "cliente"];

function normalizeCode(code: string): string {
  return String(code || "").trim().toUpperCase();
}

function isGenericName(name: string): boolean {
  const normalized = String(name || "").trim().toLowerCase();
  return GENERIC_NAMES.includes(normalized) || normalized.length < 2;
}

function formatFullName(name: string): string {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "Loja";
  return cleaned.split(/\s+/).map((word, i) => {
    const lower = word.toLowerCase();
    if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(lower)) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function loginAdmin(): Promise<string> {
  if (!API_ADMIN_EMAIL || !API_ADMIN_PASSWORD) {
    throw new Error("Credenciais admin não configuradas");
  }

  const response = await fetchWithTimeout(`${BASE_API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: API_ADMIN_EMAIL, password: API_ADMIN_PASSWORD }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha login API externa [${response.status}]: ${text}`);
  }

  const json = await response.json();
  if (!json?.token) {
    throw new Error("Token não retornado pela API externa");
  }

  return json.token;
}

function extractDataArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === "object") return [payload.data];
  return [];
}

function extractCode(item: any): string {
  return normalizeCode(item?.codigoObjeto || item?.codigo_objeto || item?.codigo || "");
}

async function findByDirectQuery(token: string, code: string): Promise<any | null> {
  const paramsToTry = ["codigoObjeto", "codigo_objeto", "codigo", "search"];

  for (const param of paramsToTry) {
    const url = `${BASE_API_URL}/emissoes/admin?${param}=${encodeURIComponent(code)}&limit=5&offset=0`;
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) continue;

    const payload = await response.json().catch(() => null);
    const items = extractDataArray(payload);
    const found = items.find((item: any) => extractCode(item) === code);
    if (found) return found;
    if (items.length === 1) return items[0];
  }

  return null;
}

async function findByStatuses(token: string, code: string): Promise<any | null> {
  const statuses = [
    "PRE_POSTADO",
    "POSTADO",
    "EM_TRANSITO",
    "AGUARDANDO_RETIRADA",
    "ENTREGUE",
    "ATRASADO",
    "CANCELADO",
  ];

  for (const status of statuses) {
    const url = `${BASE_API_URL}/emissoes/admin?status=${status}&limit=200&offset=0`;
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) continue;

    const payload = await response.json().catch(() => null);
    const items = extractDataArray(payload);
    const found = items.find((item: any) => extractCode(item) === code);
    if (found) return found;
  }

  return null;
}

function pickFirst(...values: any[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function buildDestinationAddress(emissao: any): string {
  const dest = emissao?.destinatario || {};
  const end = dest?.endereco || {};

  const logradouro = pickFirst(end.logradouro, emissao.destinatarioLogradouro, emissao.destinatario_logradouro);
  const numero = pickFirst(end.numero, emissao.destinatarioNumero, emissao.destinatario_numero);
  const bairro = pickFirst(end.bairro, emissao.destinatarioBairro, emissao.destinatario_bairro);
  const cidade = pickFirst(end.localidade, end.cidade, emissao.destinatarioCidade, emissao.destinatario_cidade);
  const uf = pickFirst(end.uf, emissao.destinatarioUf, emissao.destinatario_uf);
  const cep = pickFirst(end.cep, emissao.destinatarioCep, emissao.destinatario_cep);

  const main = [logradouro, numero, bairro].filter(Boolean).join(", ");
  const cityUf = [cidade, uf].filter(Boolean).join("-");
  const chunks = [main, cityUf, cep ? `CEP ${cep}` : ""].filter(Boolean);

  return chunks.join(" • ");
}

function parseMoney(...values: any[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const num = typeof value === "number"
      ? value
      : Number(String(value).replace(/\./g, "").replace(",", "."));

    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return Number(num);
    }
  }

  return 0;
}

async function resolveSenderName(emissao: any): Promise<string> {
  const directName = pickFirst(emissao.remetenteNome, emissao.remetente_nome, emissao.remetente?.nome);
  if (!isGenericName(directName)) return firstName(directName);

  const remetenteId = pickFirst(emissao.remetenteId, emissao.remetente_id);
  if (remetenteId) {
    const { data } = await supabase
      .from("remetentes")
      .select("nome")
      .eq("id", remetenteId)
      .maybeSingle();

    if (data?.nome && !isGenericName(data.nome)) {
      return firstName(data.nome);
    }
  }

  const cpfCnpj = pickFirst(emissao.remetenteCpfCnpj, emissao.remetente_cpf_cnpj, emissao.remetente?.cpfCnpj);
  if (cpfCnpj) {
    const { data } = await supabase
      .from("remetentes")
      .select("nome")
      .eq("cpf_cnpj", cpfCnpj.replace(/\D/g, ""))
      .limit(1)
      .maybeSingle();

    if (data?.nome && !isGenericName(data.nome)) {
      return firstName(data.nome);
    }
  }

  const clientName = pickFirst(emissao.cliente?.nome, emissao.clienteNome, emissao.cliente_nome);
  if (!isGenericName(clientName)) return firstName(clientName);

  return "Loja";
}

function normalizeShipment(emissao: any, code: string, remetenteNome: string) {
  const destinatarioNome = pickFirst(
    emissao?.destinatario?.nome,
    emissao?.destinatarioNome,
    emissao?.destinatario_nome,
  );

  const valorGasto = parseMoney(
    emissao?.valorPostagem,
    emissao?.valor_postagem,
    emissao?.valorVenda,
    emissao?.valor_venda,
    emissao?.valor,
    emissao?.valorCusto,
    emissao?.valor_custo,
  );

  return {
    codigoObjeto: code,
    clienteId: pickFirst(emissao?.clienteId, emissao?.cliente_id),
    status: pickFirst(emissao?.status, "pendente").toLowerCase(),
    servico: pickFirst(emissao?.servico, emissao?.nomeServico, emissao?.codigoServico, "—"),
    criadoEm: pickFirst(emissao?.criadoEm, emissao?.createdAt, emissao?.created_at),
    destinatarioNome,
    destinatarioEndereco: buildDestinationAddress(emissao),
    remetenteNome,
    valorGasto,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const codesInput = Array.isArray(body?.codes) ? body.codes : [];
    const codes = Array.from(new Set(codesInput.map(normalizeCode).filter(Boolean))).slice(0, 5);

    if (codes.length === 0) {
      return new Response(
        JSON.stringify({ data: [], error: "Nenhum código informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = await loginAdmin();
    const results: any[] = [];

    for (const code of codes) {
      let emissao = await findByDirectQuery(token, code);
      if (!emissao) {
        emissao = await findByStatuses(token, code);
      }

      if (!emissao) {
        results.push({ codigoObjeto: code, notFound: true });
        continue;
      }

      const remetenteNome = await resolveSenderName(emissao);
      results.push(normalizeShipment(emissao, code, remetenteNome));
    }

    return new Response(
      JSON.stringify({ data: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[crm-buscar-envio-api] erro:", message);

    return new Response(
      JSON.stringify({ error: message, data: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
