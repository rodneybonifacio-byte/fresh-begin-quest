// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { codigos } = await req.json();
    const token = await getAdminTokenCached();
    const out: any[] = [];
    for (const codigo of codigos) {
      const params = ["codigoObjeto", "codigo_objeto", "codigo", "search"];
      let item: any = null;
      for (const p of params) {
        const r = await fetch(`${BASE_API_URL}/emissoes/admin?${p}=${codigo}&limit=5&offset=0`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) continue;
        const j = await r.json().catch(() => null);
        const arr = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : (j?.data ? [j.data] : []));
        item = arr.find((x: any) => (x?.codigoObjeto || x?.codigo_objeto) === codigo) || arr[0] || null;
        if (item) break;
      }
      out.push({ codigo, raw: item });
    }
    return new Response(JSON.stringify(out, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
