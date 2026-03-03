// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelByMessageBirdId } from "../_shared/channel-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-messagebird-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const body = await req.json();
    console.log("📩 Webhook recebido:", JSON.stringify(body).substring(0, 500));

    const eventType = body.type || body.event;
    
    // Suporte para message.created e message.updated
    if (!eventType || (!eventType.includes("message.created") && !eventType.includes("message.updated"))) {
      console.log("⏭️ Evento ignorado:", eventType);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = body.message || body.data || body;
    const channelId = message.channelId || message.channel_id || body.channelId;
    const contactPhone = message.from || message.contact?.msisdn || message.originator;
    const contactName = message.contact?.displayName || message.contact?.firstName || contactPhone;
    const messageContent = message.content?.text || message.body || message.content?.html || "";
    const messageBirdId = message.id || body.id;
    const direction = message.direction === "received" || message.direction === "incoming" ? "inbound" : "outbound";
    const contentType = message.content?.type || message.type || "text";
    const mediaUrl = message.content?.media?.url || message.content?.image?.url || message.content?.audio?.url || null;
    const mediaType = message.content?.media?.contentType || null;

    if (!contactPhone) {
      console.error("❌ Telefone do contato não encontrado no payload");
      return new Response(JSON.stringify({ error: "Missing contact phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolver canal
    let channel = null;
    if (channelId) {
      channel = await resolveChannelByMessageBirdId(channelId);
    }
    console.log("📡 Canal resolvido:", channel?.name || "nenhum");

    // Buscar ou criar conversa
    const normalizedPhone = contactPhone.replace(/\D/g, "");
    let { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("contact_phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (convError || !conversation) {
      // Criar nova conversa
      const { data: newConv, error: createError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          contact_phone: normalizedPhone,
          contact_name: contactName,
          whatsapp_channel_id: channel?.id || null,
          status: "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.substring(0, 100),
          unread_count: direction === "inbound" ? 1 : 0,
          ai_enabled: channel?.ai_enabled ?? true,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Erro ao criar conversa:", createError);
        throw createError;
      }
      conversation = newConv;
      console.log("✅ Nova conversa criada:", conversation.id);
    } else {
      // Atualizar conversa existente
      const updateData: any = {
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent.substring(0, 100),
        status: "open",
      };
      if (channel?.id) updateData.whatsapp_channel_id = channel.id;
      if (contactName && contactName !== normalizedPhone) updateData.contact_name = contactName;
      if (direction === "inbound") {
        updateData.unread_count = (conversation.unread_count || 0) + 1;
      }

      await supabase
        .from("whatsapp_conversations")
        .update(updateData)
        .eq("id", conversation.id);
    }

    // Salvar mensagem (evitar duplicata)
    if (messageBirdId) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("messagebird_id", messageBirdId)
        .single();

      if (existing) {
        console.log("⏭️ Mensagem duplicada ignorada:", messageBirdId);
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: msgError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      messagebird_id: messageBirdId,
      direction,
      content_type: contentType,
      content: messageContent,
      media_url: mediaUrl,
      media_type: mediaType,
      status: "delivered",
      sent_by: direction === "inbound" ? "contact" : "system",
      ai_generated: false,
      metadata: { raw_event: body },
    });

    if (msgError) {
      console.error("❌ Erro ao salvar mensagem:", msgError);
      throw msgError;
    }

    console.log("✅ Mensagem salva na conversa:", conversation.id);

    // Se mensagem inbound e IA habilitada, chamar chat-ai
    if (direction === "inbound" && conversation.ai_enabled && channel?.ai_enabled) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const response = await fetch(`${supabaseUrl}/functions/v1/chat-ai-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            message: messageContent,
            contactPhone: normalizedPhone,
            channelId: channel?.id,
            agent: channel?.ai_agent || "maya",
            contentType,
            mediaUrl,
          }),
        });
        console.log("🤖 Chat AI response status:", response.status);
      } catch (aiError) {
        console.error("⚠️ Erro ao chamar chat-ai (não crítico):", aiError);
      }
    }

    return new Response(JSON.stringify({ ok: true, conversationId: conversation.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erro no webhook:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
