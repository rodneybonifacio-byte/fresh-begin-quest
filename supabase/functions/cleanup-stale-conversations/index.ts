import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Buscar conversas open/active sem ticket ativo e inativas há 5+ min
    const { data: staleConvs, error: fetchErr } = await supabase
      .from("whatsapp_conversations")
      .select("id, contact_name, contact_phone, last_message_at, ai_enabled, last_message_preview")
      .in("status", ["open", "active"])
      .lt("last_message_at", cutoff);

    if (fetchErr) throw fetchErr;
    if (!staleConvs || staleConvs.length === 0) {
      return new Response(JSON.stringify({ ok: true, closed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let closed = 0;
    for (const conv of staleConvs) {
      // Se é uma conversa de HSM sem resposta (ai_enabled=false e preview é template), fechar direto
      const isHsmOnly = !conv.ai_enabled && (conv.last_message_preview || "").includes("Template:");
      if (isHsmOnly) {
        await supabase
          .from("whatsapp_conversations")
          .update({ status: "closed", updated_at: new Date().toISOString() })
          .eq("id", conv.id);
        console.log(`📩 HSM sem resposta fechado: ${conv.contact_name || conv.contact_phone}`);
        closed++;
        continue;
      }

      // === GUARD: Estender timeout para conversas com reclamação/disputa ativa ===
      const { data: activePipeline } = await supabase
        .from("ai_support_pipeline")
        .select("id, category, status")
        .eq("conversation_id", conv.id)
        .in("category", ["reclamacao", "rastreio"])
        .not("status", "in", '("concluido","fechado","cancelado","entregue")')
        .limit(1);

      if (activePipeline && activePipeline.length > 0) {
        // Conversa com disputa ativa: estender para 30 min em vez de 5 min
        const extendedCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        if (conv.last_message_at > extendedCutoff) {
          console.log(`⏳ Conversa com disputa ativa, timeout estendido: ${conv.contact_name || conv.contact_phone}`);
          continue;
        }
      }

      // Verificar se NÃO tem ticket ativo
      const { data: tickets } = await supabase
        .from("whatsapp_tickets")
        .select("id")
        .eq("conversation_id", conv.id)
        .in("status", ["open", "pending_close"])
        .limit(1);

      if (tickets && tickets.length > 0) continue; // tem ticket ativo, pular

      // Fechar conversa
      await supabase
        .from("whatsapp_conversations")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", conv.id);

      console.log(`✅ Fechada: ${conv.contact_name || conv.contact_phone}`);
      closed++;
    }

    return new Response(
      JSON.stringify({ ok: true, closed, total_checked: staleConvs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Erro:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
