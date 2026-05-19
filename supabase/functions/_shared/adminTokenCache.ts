// @ts-nocheck
// Cache compartilhado do token admin da BRHUB.
// Evita logar em /api/login a cada execução (cron/edge function).
// Estratégia: cache em memória do isolate + cache persistente em tabela Postgres.
// TTL padrão: 12h (token JWT da BRHUB normalmente dura 24h).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";
const CACHE_KEY = "brhub_admin";
const TTL_HOURS = 12;
const SAFETY_MARGIN_MS = 5 * 60 * 1000; // refresh 5min antes de expirar

// Cache em memória do isolate (vive enquanto a function estiver "warm")
let memCache: { token: string; expiresAt: number } | null = null;

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loginFresh(): Promise<{ token: string; expiresAt: number }> {
  const email = Deno.env.get("API_ADMIN_EMAIL");
  const password = Deno.env.get("API_ADMIN_PASSWORD");
  if (!email || !password) throw new Error("API_ADMIN_EMAIL/PASSWORD não configurados");

  console.log(`[adminTokenCache] login attempt email=${email}`);

  const r = await fetch(`${BASE_API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Login admin BRHUB falhou: ${r.status} ${txt.slice(0, 200)}`);
  }

  const d = await r.json();
  const token = d.token || d.accessToken;
  if (!token) throw new Error("Login admin: token ausente na resposta");

  const expiresAt = Date.now() + TTL_HOURS * 60 * 60 * 1000;
  return { token, expiresAt };
}

async function readDbCache(): Promise<{ token: string; expiresAt: number } | null> {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("admin_tokens_cache")
      .select("token, expires_at")
      .eq("id", CACHE_KEY)
      .maybeSingle();
    if (error || !data) return null;
    return { token: data.token, expiresAt: new Date(data.expires_at).getTime() };
  } catch {
    return null;
  }
}

async function writeDbCache(token: string, expiresAt: number) {
  try {
    const sb = getServiceClient();
    await sb.from("admin_tokens_cache").upsert({
      id: CACHE_KEY,
      token,
      expires_at: new Date(expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[adminTokenCache] falha ao gravar cache DB:", (e as Error).message);
  }
}

function isFresh(entry: { token: string; expiresAt: number } | null): boolean {
  return !!entry && entry.expiresAt - SAFETY_MARGIN_MS > Date.now();
}

/**
 * Obtém o token admin com cache (memória → DB → login fresh).
 * Se forceRefresh=true, ignora cache e gera token novo (use quando receber 401).
 */
export async function getAdminTokenCached(forceRefresh = false): Promise<string> {
  if (!forceRefresh && isFresh(memCache)) return memCache!.token;

  if (!forceRefresh) {
    const db = await readDbCache();
    if (isFresh(db)) {
      memCache = db!;
      return db!.token;
    }
  }

  const fresh = await loginFresh();
  memCache = fresh;
  await writeDbCache(fresh.token, fresh.expiresAt);
  console.log("[adminTokenCache] token admin renovado");
  return fresh.token;
}

/**
 * Invalida o cache. Chame ao receber 401 da BRHUB.
 */
export function invalidateAdminToken() {
  memCache = null;
}
