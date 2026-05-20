// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeJwtPayload(token: string): any {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Token JWT inválido");
  return JSON.parse(atob(parts[1]));
}

function toDateStart(value?: string) {
  if (!value) return undefined;
  return value.includes("T") ? value : `${value}T00:00:00`;
}

function toDateEnd(value?: string) {
  if (!value) return undefined;
  return value.includes("T") ? value : `${value}T23:59:59.999`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userToken = String(body?.userToken || "").trim();

    if (!userToken) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = decodeJwtPayload(userToken);
    const role = String(payload?.role || "").toUpperCase();
    const tokenClienteId = payload?.clienteId || payload?.cliente_id;
    const isAdmin = role === "ADMIN";

    if (!isAdmin && !tokenClienteId) {
      return new Response(JSON.stringify({ error: "Cliente não identificado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const limit = Math.min(Math.max(Number(body?.limit || 200), 1), 5000);
    const dataIni = toDateStart(body?.dataIni);
    const dataFim = toDateEnd(body?.dataFim);
    const codigoObjeto = String(body?.codigoObjeto || "").trim();
    const destinatario = String(body?.destinatario || "").trim();
    const remetenteId = String(body?.remetenteId || "").trim();
    const clienteIdFiltro = String(body?.clienteId || "").trim();

    let query = supabase
      .from("emissoes_marketplace")
      .select("*")
      .neq("status", "cancelada")
      .order("created_at", { ascending: false })
      .limit(limit);



    query = isAdmin
      ? (clienteIdFiltro ? query.eq("cliente_id", clienteIdFiltro) : query)
      : query.eq("cliente_id", tokenClienteId);

    if (dataIni) query = query.gte("created_at", dataIni);
    if (dataFim) query = query.lte("created_at", dataFim);
    if (codigoObjeto) query = query.ilike("codigo_objeto", `%${codigoObjeto}%`);
    if (destinatario) query = query.ilike("destinatario_nome", `%${destinatario}%`);
    if (remetenteId) query = query.eq("remetente_id", remetenteId);

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar emissoes_marketplace:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ emissoes: data || [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro ao listar emissões marketplace:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});