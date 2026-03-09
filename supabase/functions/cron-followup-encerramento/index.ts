import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelForConversation, resolveDefaultChannel } from "../_shared/channel-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const IDLE_MINUTES = 5;
    const cutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000).toISOString();

    // Buscar conversas com tickets open/pending_close onde a última mensagem é outbound e antiga
    // Isso significa: nós respondemos, o cliente não falou nada há 5+ min
    const { data: conversations, error: convErr } = await supabase
      .from("whatsapp_conversations")
      .select("id, contact_phone, contact_name, last_message_at, status")
      .in("status", ["open", "active"])
      .lt("last_message_at", cutoff)
      .not("last_message_at", "is", null);

    if (convErr) {
      console.error("Erro ao buscar conversas:", convErr);
      return new Response(JSON.stringify({ error: convErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!conversations || conversations.length === 0) {
      console.log("✅ Nenhuma conversa ociosa encontrada");
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped = 0;

    for (const conv of conversations) {
      try {
        // Verificar se a última mensagem é realmente outbound (nós respondemos e o cliente não)
        const { data: lastMsgs } = await supabase
          .from("whatsapp_messages")
          .select("direction, content, content_type, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (!lastMsgs || lastMsgs.length === 0) {
          skipped++;
          continue;
        }

        const lastMsg = lastMsgs[0];

        // Pular se a última mensagem é inbound (cliente falou por último — esperando nossa resposta)
        if (lastMsg.direction === "inbound") {
          skipped++;
          continue;
        }

        // Pular se já enviamos follow-up de encerramento (evitar spam)
        const isFollowup = lastMsg.content?.includes("Se precisar de algo");
        if (isFollowup) {
          skipped++;
          continue;
        }

        // Pular se a última mensagem foi há menos de 5 min (segurança extra)
        const lastMsgAge = Date.now() - new Date(lastMsg.created_at).getTime();
        if (lastMsgAge < IDLE_MINUTES * 60 * 1000) {
          skipped++;
          continue;
        }

        // Verificar se tem ticket ativo
        const { data: ticketList } = await supabase
          .from("whatsapp_tickets")
          .select("id, status")
          .eq("conversation_id", conv.id)
          .in("status", ["open", "pending_close"])
          .limit(1);

        const ticket = ticketList?.[0];
        if (!ticket) {
          skipped++;
          continue;
        }

        // Verificar se a conversa tem ALGUMA mensagem inbound (cliente respondeu em algum momento)
        const { data: inboundMsgs } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("conversation_id", conv.id)
          .eq("direction", "inbound")
          .limit(1);

        const hasInboundMessages = inboundMsgs && inboundMsgs.length > 0;

        // Se NÃO tem mensagem inbound = conversa apenas de HSM, fechar silenciosamente
        if (!hasInboundMessages) {
          await supabase
            .from("whatsapp_tickets")
            .update({
              status: "closed",
              closed_at: new Date().toISOString(),
              closed_by: "system_hsm_timeout",
              resolution: "HSM sem resposta — fechado automaticamente (5min)",
            })
            .eq("id", ticket.id);

          // Atualizar pipeline card se existir
          await supabase
            .from("ai_support_pipeline")
            .update({
              status: "concluido",
              resolution: "HSM sem resposta — fechado automaticamente",
              updated_at: new Date().toISOString(),
            })
            .eq("conversation_id", conv.id)
            .in("status", ["verificando", "localizado", "em_transito", "novo", "recebido", "aberto"]);

          console.log(`📩 HSM sem resposta fechado: ${conv.contact_name || conv.contact_phone} (conv: ${conv.id})`);
          processed++;
          continue;
        }

        // --- Fluxo normal: conversa com interação humana → enviar follow-up ---

        // Montar mensagem de encerramento
        const firstName = conv.contact_name
          ? conv.contact_name.split(/\s+/)[0].charAt(0).toUpperCase() +
            conv.contact_name.split(/\s+/)[0].slice(1).toLowerCase()
          : "";

        const closingMessage = firstName
          ? `*Veronica:*\n\n${firstName}, se precisar de algo é só chamar! Vou encerrar o atendimento por aqui. 😊👋`
          : `*Veronica:*\n\nSe precisar de algo é só chamar! Vou encerrar o atendimento por aqui. 😊👋`;

        // Enviar via MessageBird
        const channel = await resolveChannelForConversation(conv.id);
        if (!channel) {
          console.warn(`⚠️ Canal não resolvido para conversa ${conv.id}`);
          skipped++;
          continue;
        }

        const payload = {
          to: conv.contact_phone,
          from: channel.channel_id,
          type: "text",
          content: { text: closingMessage },
        };

        const mbResponse = await fetch("https://conversations.messagebird.com/v1/send", {
          method: "POST",
          headers: {
            Authorization: `AccessKey ${channel.access_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const mbResult = await mbResponse.json();

        if (!mbResponse.ok) {
          console.error(`❌ Erro MessageBird conv ${conv.id}:`, JSON.stringify(mbResult));
          continue;
        }

        // Salvar mensagem no histórico
        await supabase.from("whatsapp_messages").insert({
          conversation_id: conv.id,
          messagebird_id: mbResult.id || null,
          direction: "outbound",
          content_type: "text",
          content: closingMessage,
          status: "sent",
          sent_by: "system",
          ai_generated: false,
        });

        // Atualizar conversa
        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: closingMessage.substring(0, 100),
          })
          .eq("id", conv.id);

        // Fechar ticket
        await supabase
          .from("whatsapp_tickets")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            closed_by: "system_followup",
            resolution: "Encerrado por inatividade (5min)",
          })
          .eq("id", ticket.id);

        console.log(`✅ Follow-up enviado: ${conv.contact_name || conv.contact_phone} (conv: ${conv.id})`);
        processed++;
      } catch (convErr) {
        console.error(`❌ Erro processando conversa ${conv.id}:`, convErr);
      }
    }

    console.log(`📊 Resumo: ${processed} encerrados, ${skipped} ignorados, ${conversations.length} verificados`);

    return new Response(
      JSON.stringify({ ok: true, processed, skipped, total: conversations.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Erro geral:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
