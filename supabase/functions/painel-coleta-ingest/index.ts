// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, GET, OPTIONS",
};

interface EtiquetaInput {
  codigo_objeto: string;
  remetente_nome: string;
  destinatario_nome?: string | null;
  servico?: string | null;
  data_emissao?: string | null;
  origem?: string | null;
  metadata?: Record<string, unknown> | null;
  ttl_hours?: number | null;
}

function validar(e: any): { ok: true; data: EtiquetaInput } | { ok: false; error: string } {
  if (!e || typeof e !== "object") return { ok: false, error: "payload inválido" };
  const codigo = String(e.codigo_objeto || "").trim().toUpperCase();
  const remetente = String(e.remetente_nome || "").trim();
  if (!codigo) return { ok: false, error: "codigo_objeto obrigatório" };
  if (!remetente) return { ok: false, error: "remetente_nome obrigatório" };
  return {
    ok: true,
    data: {
      codigo_objeto: codigo,
      remetente_nome: remetente,
      destinatario_nome: e.destinatario_nome ? String(e.destinatario_nome).trim() : null,
      servico: e.servico ? String(e.servico) : null,
      data_emissao: e.data_emissao || null,
      origem: e.origem ? String(e.origem) : "externo",
      metadata: e.metadata && typeof e.metadata === "object" ? e.metadata : {},
      ttl_hours: typeof e.ttl_hours === "number" ? e.ttl_hours : null,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth via X-API-Key
  const apiKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
  const expected = Deno.env.get("PAINEL_COLETA_API_KEY");
  if (!expected || !apiKey || apiKey !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);

    // DELETE /?codigo_objeto=XXX  -> remove uma etiqueta
    if (req.method === "DELETE") {
      const codigo = (url.searchParams.get("codigo_objeto") || "").toUpperCase().trim();
      if (!codigo) {
        return new Response(JSON.stringify({ error: "codigo_objeto obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("painel_coleta_externo").delete().eq("codigo_objeto", codigo);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, deleted: codigo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET -> lista (limit 500) — útil para o sistema externo conferir
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("painel_coleta_externo")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("data_emissao", { ascending: false })
        .limit(500);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const lote: any[] = Array.isArray(body) ? body : Array.isArray(body?.etiquetas) ? body.etiquetas : [body];

    const validas: any[] = [];
    const erros: any[] = [];
    for (const e of lote) {
      const v = validar(e);
      if (!v.ok) { erros.push({ input: e, error: v.error }); continue; }
      const d = v.data;
      const ttlHours = d.ttl_hours && d.ttl_hours > 0 ? d.ttl_hours : 96; // padrão 4 dias
      validas.push({
        codigo_objeto: d.codigo_objeto,
        remetente_nome: d.remetente_nome,
        destinatario_nome: d.destinatario_nome,
        servico: d.servico,
        data_emissao: d.data_emissao || new Date().toISOString(),
        origem: d.origem,
        metadata: d.metadata,
        expires_at: new Date(Date.now() + ttlHours * 3600 * 1000).toISOString(),
      });
    }

    let inseridas: any[] = [];
    if (validas.length > 0) {
      const { data, error } = await supabase
        .from("painel_coleta_externo")
        .upsert(validas, { onConflict: "codigo_objeto" })
        .select();
      if (error) throw error;
      inseridas = data || [];
    }

    return new Response(JSON.stringify({
      ok: true,
      recebidas: lote.length,
      inseridas: inseridas.length,
      erros,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("painel-coleta-ingest erro:", err);
    return new Response(JSON.stringify({ error: err?.message || "erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
