// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getPdfEtiquetaMarketplace } from "../_shared/marketplace.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { uuidMarketplace, codigoObjeto, emissaoId } = await req.json();

    let uuid = uuidMarketplace as string | undefined;

    if (!uuid && (codigoObjeto || emissaoId)) {
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      let q = supa
        .from("emissoes_marketplace")
        .select("uuid_marketplace")
        .limit(1);
      if (codigoObjeto) q = q.eq("codigo_objeto", codigoObjeto);
      else q = q.eq("emissao_id", emissaoId);
      const { data } = await q.maybeSingle();
      uuid = data?.uuid_marketplace ?? undefined;
    }

    if (!uuid) throw new Error("uuidMarketplace ou codigoObjeto obrigatório");

    const pdf = await getPdfEtiquetaMarketplace(uuid);

    return new Response(
      JSON.stringify({ success: true, data: pdf }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[MP pdf] erro:", e?.message);
    return new Response(
      JSON.stringify({ success: false, error: e?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
