// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { validateBrhubToken } from "../_shared/brhubAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-brhub-authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await validateBrhubToken(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ success: false, error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const filters = body?.filters || {};

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("etiquetas_pendentes_correcao")
      .select("*", { count: "exact" })
      .order("criado_em", { ascending: false });

    // Admin vê tudo; cliente vê apenas do próprio cliente_id
    if (!auth.isAdmin) {
      if (auth.clienteId) query = query.eq("cliente_id", auth.clienteId);
    }

    if (filters?.remetente) {
      query = query.ilike("remetente_nome", `%${filters.remetente}%`);
    }
    if (filters?.dataInicio) {
      query = query.gte("criado_em", filters.dataInicio);
    }
    if (filters?.dataFim) {
      query = query.lte("criado_em", filters.dataFim);
    }

    const { data, count, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, data: data || [], count: count || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
