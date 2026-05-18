// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getMarketplaceAuth, MARKETPLACE_BASE } from "../_shared/marketplace.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await getMarketplaceAuth();
  if (!auth) return new Response("no auth", { status: 500, headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const out: any = {};

  // Variações de payload pra ver se outras transportadoras aparecem
  const baseCotacao = {
    cepOrigem: body.cepOrigem || "03027000",
    cepDestino: body.cepDestino || "18010003",
    embalagem: body.embalagem || { altura: 30, largura: 30, comprimento: 30, peso: 5000, diametro: 0 },
  };

  const variantes: Array<[string, any]> = [
    ["base", baseCotacao],
    ["com_transportadoras", { ...baseCotacao, transportadoras: ["all"] }],
    ["todas", { ...baseCotacao, todasTransportadoras: true }],
    ["valor_declarado", { ...baseCotacao, valorDeclarado: 100 }],
    ["pequeno", { cepOrigem: baseCotacao.cepOrigem, cepDestino: baseCotacao.cepDestino, embalagem: { altura: 5, largura: 10, comprimento: 15, peso: 300, diametro: 0 } }],
  ];

  for (const [nome, payload] of variantes) {
    try {
      const r = await fetch(`${MARKETPLACE_BASE}/frete/cotacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": auth.apiKey },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      let j: any; try { j = JSON.parse(text); } catch { j = { raw: text }; }
      out[nome] = { status: r.status, cotacoes: (j.cotacoes || []).map((c: any) => ({ nome: c.nomeServico, transp: c.transportadora, preco: c.preco, codigo: c.codigoServico, prazo: c.prazo, extras: Object.keys(c).filter(k => !["nomeServico","transportadora","preco","codigoServico","prazo","imagem","id"].includes(k)) })), total: (j.cotacoes || []).length, meta: j.meta };
    } catch (e: any) {
      out[nome] = { error: e?.message };
    }
  }

  // Tentar endpoints alternativos
  const endpoints = ["/transportadoras", "/frete/transportadoras", "/frete/cotacao/completa", "/cotacao", "/services", "/api/transportadoras"];
  for (const ep of endpoints) {
    try {
      const r = await fetch(`${MARKETPLACE_BASE}${ep}`, { headers: { "x-api-key": auth.apiKey } });
      const text = await r.text();
      out[`GET ${ep}`] = { status: r.status, body: text.slice(0, 400) };
    } catch (e: any) { out[`GET ${ep}`] = { error: e?.message }; }
  }

  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
