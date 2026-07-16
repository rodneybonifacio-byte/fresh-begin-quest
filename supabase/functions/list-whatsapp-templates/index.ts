// @ts-nocheck
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BIRD_BASE = "https://api.bird.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey = Deno.env.get("BIRD_API_KEY");
    const workspaceId = Deno.env.get("BIRD_WORKSPACE_ID");
    const channelId = Deno.env.get("BIRD_WHATSAPP_CHANNEL_ID");

    if (!accessKey || !workspaceId || !channelId) {
      return new Response(
        JSON.stringify({
          error: "BIRD_API_KEY / BIRD_WORKSPACE_ID / BIRD_WHATSAPP_CHANNEL_ID não configurados",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bird API: templates ficam no workspace/canal (mesmo pra números MessageBird migrados)
    const mbChannelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
    const mbAccessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");

    const attempts: Array<{ url: string; status: number; snippet: string }> = [];

    // 1) Bird API (workspace/channel)
    const birdCandidates = [
      `${BIRD_BASE}/workspaces/${workspaceId}/channels/${channelId}/presets`,
      `${BIRD_BASE}/workspaces/${workspaceId}/channels/${mbChannelId}/presets`,
      `${BIRD_BASE}/workspaces/${workspaceId}/presets?channelId=${channelId}`,
      `${BIRD_BASE}/workspaces/${workspaceId}/presets?channelId=${mbChannelId}`,
      `${BIRD_BASE}/workspaces/${workspaceId}/channels/${channelId}/templates`,
      `${BIRD_BASE}/workspaces/${workspaceId}/channels/${mbChannelId}/templates`,
    ];
    for (const url of birdCandidates) {
      const r = await fetch(url, {
        headers: { Authorization: `AccessKey ${accessKey}`, "Content-Type": "application/json" },
      });
      const txt = await r.text();
      attempts.push({ url, status: r.status, snippet: txt.slice(0, 160) });
      if (r.ok) {
        const result = JSON.parse(txt);
        return normalizeAndRespond(result);
      }
    }

    // 2) MessageBird clássico
    const mbCandidates = [
      `https://conversations.messagebird.com/v1/platforms/whatsapp/${mbChannelId}/templates`,
      `https://integrations.messagebird.com/v3/hsms?channelId=${mbChannelId}`,
      `https://integrations.messagebird.com/v3/hsms`,
    ];
    for (const url of mbCandidates) {
      const r = await fetch(url, {
        headers: { Authorization: `AccessKey ${mbAccessKey}`, "Content-Type": "application/json" },
      });
      const txt = await r.text();
      attempts.push({ url, status: r.status, snippet: txt.slice(0, 160) });
      if (r.ok) {
        try {
          const result = JSON.parse(txt);
          return normalizeAndRespond(result);
        } catch {}
      }
    }

    return new Response(
      JSON.stringify({ error: "Nenhum endpoint de templates respondeu 2xx", attempts }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    function normalizeAndRespond(result: any) {
      const rawTemplates = result.results || result.data || result.items || result.templates || (Array.isArray(result) ? result : []);
      const templates = (Array.isArray(rawTemplates) ? rawTemplates : []).map((t: any) => ({
        name: t.name || t.template?.name || t.projectId,
        language: t.locale || t.language || t.template?.locale,
        status: t.status || "approved",
        category: t.category,
        namespace: t.namespace || "",
        components: t.components || t.template?.components || [],
        projectId: t.projectId || t.id,
      }));
      const approved = templates.filter(
        (t: any) => !t.status || ["approved", "active"].includes(String(t.status).toLowerCase())
      );
      return new Response(
        JSON.stringify({ templates: approved, total: templates.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
