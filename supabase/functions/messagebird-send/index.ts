// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BIRD_BASE = "https://api.bird.com";

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

    // 1) Única query pra pegar contato (canal resolve por env — não precisa join)
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

    // 2) Credenciais Bird (canal novo)
    const birdKey = Deno.env.get("BIRD_API_KEY");
    const workspaceId = Deno.env.get("BIRD_WORKSPACE_ID");
    const birdChannelId = Deno.env.get("BIRD_WHATSAPP_CHANNEL_ID");
    if (!birdKey || !workspaceId || !birdChannelId) {
      throw new Error("BIRD_API_KEY / BIRD_WORKSPACE_ID / BIRD_WHATSAPP_CHANNEL_ID não configurados");
    }

    // 3) Payload Bird Channels API
    const phone = String(conversation.contact_phone).replace(/\D/g, "");
    const bodyBlocks: any[] = [];
    if (contentType === "text" || (!mediaUrl && message)) {
      bodyBlocks.push({ type: "text", text: { text: message || "" } });
    } else if (contentType === "image" && mediaUrl) {
      bodyBlocks.push({ type: "image", image: { mediaUrl } });
      if (message) bodyBlocks.push({ type: "text", text: { text: message } });
    } else if ((contentType === "audio" || contentType === "voice") && mediaUrl) {
      bodyBlocks.push({ type: "audio", audio: { mediaUrl } });
    } else if (contentType === "file" && mediaUrl) {
      bodyBlocks.push({ type: "file", file: { mediaUrl } });
    }

    const payload = {
      receiver: {
        contacts: [{ identifierKey: "phonenumber", identifierValue: `+${phone}` }],
      },
      body: { type: bodyBlocks[0]?.type || "text", ...bodyBlocks[0] },
    };

    const url = `${BIRD_BASE}/workspaces/${workspaceId}/channels/${birdChannelId}/messages`;
    const start = Date.now();
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${birdKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const respText = await resp.text();
    console.log(`Bird send ${resp.status} in ${Date.now() - start}ms | ${respText.slice(0, 300)}`);

    if (!resp.ok) {
      // Salvar como failed pra rastreabilidade
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        content_type: contentType,
        content: message,
        media_url: mediaUrl || null,
        status: "failed",
        sent_by: "admin",
        ai_generated: false,
      });
      return new Response(
        JSON.stringify({ error: "Bird send failed", status: resp.status, body: respText.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let birdResult: any = {};
    try { birdResult = JSON.parse(respText); } catch {}

    // 4) Persistência em paralelo (não bloqueia resposta)
    const persistPromise = Promise.all([
      supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        messagebird_id: birdResult.id || null,
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
        last_message_preview: (message || "").substring(0, 100),
        ai_enabled: false,
      }).eq("id", conversationId),
    ]);

    // Aguarda mas com timeout curto pra não travar UI
    try {
      await Promise.race([
        persistPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error("persist timeout")), 3000)),
      ]);
    } catch (e) {
      console.warn("Persist demorou:", (e as any)?.message);
    }

    return new Response(
      JSON.stringify({ ok: true, birdId: birdResult.id, response: birdResult }),
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
