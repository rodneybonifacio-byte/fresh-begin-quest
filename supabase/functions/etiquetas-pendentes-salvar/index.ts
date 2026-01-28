// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { validateBrhubToken } from "../_shared/brhubAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-brhub-authorization",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const clienteId = auth.clienteId;
    if (!clienteId || !uuidRegex.test(clienteId)) {
      return new Response(
        JSON.stringify({ success: false, error: "clienteId inválido no token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const registros = Array.isArray(body?.registros) ? body.registros : [];
    if (registros.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum registro para salvar" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Não confiar em cliente_id vindo do client.
    const sanitized = registros.map((r: any) => ({
      ...r,
      cliente_id: clienteId,
      tentativas_correcao: typeof r?.tentativas_correcao === "number" ? r.tentativas_correcao : 0,
    }));

    const { data, error } = await supabase
      .from("etiquetas_pendentes_correcao")
      .insert(sanitized)
      .select("id");

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message, code: error.code }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, inserted: data?.length || sanitized.length }),
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
