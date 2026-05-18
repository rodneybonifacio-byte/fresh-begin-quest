// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getMarketplaceAuth, MARKETPLACE_BASE } from "../_shared/marketplace.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await getMarketplaceAuth();
    if (!auth) throw new Error("no auth");
    const body = await req.json().catch(() => ({}));
    const payload = {
      cepOrigem: body.cepOrigem || "03027000",
      cepDestino: body.cepDestino || "18010003",
      embalagem: body.embalagem || { altura: 30, largura: 30, comprimento: 30, peso: 5000, diametro: 0 },
    };
    const r = await fetch(`${MARKETPLACE_BASE}/frete/cotacao`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": auth.apiKey },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let j: any; try { j = JSON.parse(text); } catch { j = { raw: text }; }
    return new Response(JSON.stringify({ status: r.status, body: j }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
