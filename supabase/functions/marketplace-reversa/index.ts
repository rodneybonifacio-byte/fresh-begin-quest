// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { criarReversaMarketplace } from "../_shared/marketplace.ts";

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
    const payload = await req.json();
    const result = await criarReversaMarketplace(payload);
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[MP reversa] erro:", e?.message);
    return new Response(
      JSON.stringify({ success: false, error: e?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
