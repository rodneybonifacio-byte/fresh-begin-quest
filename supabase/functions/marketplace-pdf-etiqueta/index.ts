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
    const { uuidMarketplace, codigoObjeto, emissaoId, force } = await req.json();

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Localiza o registro local (uuid + cache)
    let uuid = uuidMarketplace as string | undefined;
    let rowId: string | undefined;
    let cachedPdf: { nome: string; dados: string } | null = null;

    {
      let q = supa
        .from("emissoes_marketplace")
        .select("id, uuid_marketplace, pdf_base64, pdf_nome")
        .limit(1);
      if (uuid) q = q.eq("uuid_marketplace", uuid);
      else if (codigoObjeto) q = q.eq("codigo_objeto", codigoObjeto);
      else if (emissaoId) q = q.eq("emissao_id", emissaoId);

      const { data } = await q.maybeSingle();
      if (data) {
        rowId = data.id;
        uuid = uuid || data.uuid_marketplace || undefined;
        if (!force && data.pdf_base64) {
          cachedPdf = {
            nome: data.pdf_nome || `etiqueta_${uuid}.pdf`,
            dados: data.pdf_base64,
          };
        }
      }
    }

    // 2) Cache hit -> devolve imediatamente
    if (cachedPdf) {
      console.log("[MP pdf] cache hit", { uuid, rowId });
      return new Response(
        JSON.stringify({ success: true, data: cachedPdf, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!uuid) throw new Error("uuidMarketplace ou codigoObjeto obrigatório");

    // 3) Busca na API MP e persiste o cache
    const pdf = await getPdfEtiquetaMarketplace(uuid);

    if (rowId && pdf?.dados) {
      try {
        await supa
          .from("emissoes_marketplace")
          .update({
            pdf_base64: pdf.dados,
            pdf_nome: pdf.nome,
            pdf_armazenado_em: new Date().toISOString(),
          })
          .eq("id", rowId);
        console.log("[MP pdf] cache armazenado", { uuid, rowId });
      } catch (cacheErr: any) {
        console.error("[MP pdf] falha ao armazenar cache:", cacheErr?.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: pdf, cached: false }),
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
