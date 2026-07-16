// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MB_BASE = "https://conversations.messagebird.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
    const channelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!accessKey || !channelId) {
      return new Response(
        JSON.stringify({ error: "MESSAGEBIRD_ACCESS_KEY / MESSAGEBIRD_CHANNEL_ID não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/messagebird-webhook`;
    const authHeader = { Authorization: `AccessKey ${accessKey}`, "Content-Type": "application/json" };

    // 1) Listar webhooks existentes
    const listRes = await fetch(`${MB_BASE}/webhooks?channelId=${channelId}&limit=50`, {
      headers: authHeader,
    });
    const listData = await listRes.json();
    const existing = (listData?.items || []).filter((w: any) => w.channelId === channelId);

    // 2) Deletar duplicados/obsoletos que não apontam para o URL correto
    const toDelete = existing.filter((w: any) => w.url !== webhookUrl);
    const kept = existing.find((w: any) => w.url === webhookUrl);
    const deleted: any[] = [];
    for (const w of toDelete) {
      const del = await fetch(`${MB_BASE}/webhooks/${w.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      deleted.push({ id: w.id, url: w.url, status: del.status });
    }

    const events = [
      "message.created",
      "message.updated",
      "conversation.created",
      "conversation.updated",
    ];

    let webhook: any = kept;
    if (!kept) {
      // 3) Criar webhook novo
      const createRes = await fetch(`${MB_BASE}/webhooks`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ events, channelId, url: webhookUrl }),
      });
      webhook = await createRes.json();
      if (!createRes.ok) {
        return new Response(
          JSON.stringify({ error: "Falha ao criar webhook", details: webhook, deleted }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, webhook, deleted, webhookUrl, channelId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
