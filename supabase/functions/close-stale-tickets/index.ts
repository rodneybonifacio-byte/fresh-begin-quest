import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

    // 1. Fechar tickets "open" com 4h+ sem mensagem
    const { data: staleOpen, error: staleErr } = await supabase
      .from("whatsapp_tickets")
      .update({
        status: "closed",
        closed_at: now.toISOString(),
        closed_by: "auto_timeout",
        resolution: "Fechado automaticamente por inatividade (4h sem mensagem)",
      })
      .eq("status", "open")
      .lt("last_message_at", fourHoursAgo)
      .select("id, contact_name");

    if (staleErr) console.error("❌ Erro fechando tickets open:", staleErr);
    else console.log(`🎫 ${staleOpen?.length || 0} tickets OPEN fechados por inatividade`);

    // 2. Fechar tickets "pending_close" cuja data agendada já passou
    const { data: pendingClose, error: pendingErr } = await supabase
      .from("whatsapp_tickets")
      .update({
        status: "resolved",
        closed_by: "ai_soft_confirmed",
      })
      .eq("status", "pending_close")
      .lt("closed_at", now.toISOString())
      .select("id, contact_name");

    if (pendingErr) console.error("❌ Erro fechando tickets pending_close:", pendingErr);
    else console.log(`🎫 ${pendingClose?.length || 0} tickets PENDING_CLOSE confirmados`);

    // 3. Reabrir tickets "pending_close" onde o cliente respondeu (nova mensagem após o soft close)
    const { data: pendingTickets } = await supabase
      .from("whatsapp_tickets")
      .select("id, conversation_id, closed_at")
      .eq("status", "pending_close")
      .gte("closed_at", now.toISOString()); // Ainda não expirou

    if (pendingTickets && pendingTickets.length > 0) {
      for (const ticket of pendingTickets) {
        // Verificar se tem mensagem inbound mais recente que o soft close
        const softCloseTime = new Date(ticket.closed_at);
        const twoHoursBeforeSoftClose = new Date(softCloseTime.getTime() - 2 * 60 * 60 * 1000);
        
        const { data: newMessages } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("conversation_id", ticket.conversation_id)
          .eq("direction", "inbound")
          .gt("created_at", twoHoursBeforeSoftClose.toISOString())
          .limit(1);

        if (newMessages && newMessages.length > 0) {
          await supabase.from("whatsapp_tickets").update({
            status: "open",
            closed_at: null,
            closed_by: null,
            resolution: null,
          }).eq("id", ticket.id);
          console.log(`🔄 Ticket ${ticket.id} reaberto — cliente respondeu`);
        }
      }
    }

    const totalClosed = (staleOpen?.length || 0) + (pendingClose?.length || 0);
    return new Response(
      JSON.stringify({ 
        ok: true, 
        closed_by_timeout: staleOpen?.length || 0,
        closed_by_soft: pendingClose?.length || 0,
        total_closed: totalClosed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
