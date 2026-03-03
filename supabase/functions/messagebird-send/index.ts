// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelForConversation, resolveDefaultChannel } from "../_shared/channel-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { conversationId, message, contentType = "text", mediaUrl } = await req.json();

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({ error: "conversationId e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar conversa
    const { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolver canal
    let channel = await resolveChannelForConversation(conversationId);
    if (!channel) {
      channel = await resolveDefaultChannel();
    }

    if (!channel) {
      return new Response(
        JSON.stringify({ error: "Nenhum canal WhatsApp configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📤 Enviando mensagem via canal: ${channel.name} para ${conversation.contact_phone}`);

    // Montar payload para MessageBird /send API
    const sendPayload: any = {
      to: conversation.contact_phone,
      from: channel.channel_id,
      type: "text",
      content: { text: message },
    };

    if (contentType === "image" && mediaUrl) {
      sendPayload.type = "image";
      sendPayload.content = { image: { url: mediaUrl } };
    } else if ((contentType === "audio" || contentType === "voice") && mediaUrl) {
      sendPayload.type = "audio";
      sendPayload.content = { audio: { url: mediaUrl } };
    }

    // Enviar via MessageBird
    const mbResponse = await fetch("https://conversations.messagebird.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${channel.access_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendPayload),
    });

    const mbResult = await mbResponse.json();
    console.log("📨 MessageBird response:", mbResponse.status, JSON.stringify(mbResult).substring(0, 300));

    if (!mbResponse.ok) {
      console.error("❌ Erro MessageBird:", mbResult);
      throw new Error(`MessageBird error: ${mbResult?.errors?.[0]?.description || JSON.stringify(mbResult)}`);
    }

    // Salvar mensagem enviada no banco
    const { data: savedMsg, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        messagebird_id: mbResult.id || null,
        direction: "outbound",
        content_type: contentType,
        content: message,
        media_url: mediaUrl || null,
        status: "sent",
        sent_by: "admin",
        ai_generated: false,
      })
      .select()
      .single();

    if (msgError) {
      console.error("⚠️ Erro ao salvar mensagem enviada:", msgError);
    }

    // Atualizar conversa
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.substring(0, 100),
      })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ ok: true, message: savedMsg, messagebirdResponse: mbResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro no envio:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
