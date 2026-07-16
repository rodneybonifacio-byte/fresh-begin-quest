// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { birdSend } from "../_shared/bird-compat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Canal oficial deste sistema (MessageBird clássico)
const SYSTEM_MESSAGEBIRD_CHANNEL_ID = "1d361180-7a89-4b2f-9a3c-ec5b4715916d";
const MB_SEND_URL = "https://conversations.messagebird.com/v1/send";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { conversationId, message, contentType = "text", mediaUrl } = body;

    if (!conversationId || (!message && !mediaUrl)) {
      return new Response(
        JSON.stringify({ error: "conversationId e (message ou mediaUrl) são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Contato da conversa
    const { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("id, contact_phone")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Credenciais MessageBird clássico
    const accessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
    if (!accessKey) {
      throw new Error("MESSAGEBIRD_ACCESS_KEY não configurada");
    }

    // 3) Payload MessageBird Conversations /v1/send
    const phoneDigits = String(conversation.contact_phone).replace(/\D/g, "");
    const toNumber = `+${phoneDigits}`;

    let content: any;
    if (contentType === "image" && mediaUrl) {
      content = { image: { url: mediaUrl, caption: message || undefined } };
    } else if ((contentType === "audio" || contentType === "voice") && mediaUrl) {
      content = { audio: { url: mediaUrl } };
    } else if (contentType === "video" && mediaUrl) {
      content = { video: { url: mediaUrl, caption: message || undefined } };
    } else if (contentType === "file" && mediaUrl) {
      content = { file: { url: mediaUrl } };
    } else {
      content = { text: message || "" };
    }

    const mbType =
      contentType === "voice" ? "audio"
      : contentType === "file" ? "file"
      : contentType === "image" ? "image"
      : contentType === "video" ? "video"
      : contentType === "audio" ? "audio"
      : "text";

    const payload = {
      to: toNumber,
      from: SYSTEM_MESSAGEBIRD_CHANNEL_ID,
      type: mbType,
      content,
    };

    const start = Date.now();
    const resp = await birdSend(MB_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${accessKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const respText = await resp.text();
    console.log(`MB send ${resp.status} in ${Date.now() - start}ms | ${respText.slice(0, 400)}`);

    if (!resp.ok) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        content_type: contentType,
        content: message,
        media_url: mediaUrl || null,
        status: "failed",
        sent_by: "admin",
        ai_generated: false,
        metadata: { error: respText.slice(0, 500), status: resp.status },
      });
      return new Response(
        JSON.stringify({ error: "MessageBird send failed", status: resp.status, body: respText.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let mbResult: any = {};
    try { mbResult = JSON.parse(respText); } catch {}

    const persistPromise = Promise.all([
      supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        messagebird_id: mbResult.id || null,
        direction: "outbound",
        content_type: contentType,
        content: message,
        media_url: mediaUrl || null,
        status: "sent",
        sent_by: "admin",
        ai_generated: false,
      }),
      supabase.from("whatsapp_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: (message || `[${contentType}]`).substring(0, 100),
        status: "open",
        ai_enabled: true,
      }).eq("id", conversationId),
    ]);

    try {
      await Promise.race([
        persistPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error("persist timeout")), 3000)),
      ]);
    } catch (e) {
      console.warn("Persist demorou:", (e as any)?.message);
    }

    return new Response(
      JSON.stringify({ ok: true, messagebirdId: mbResult.id, response: mbResult }),
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
