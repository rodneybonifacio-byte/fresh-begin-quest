// @ts-nocheck
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
    const channelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
    if (!accessKey || !channelId) {
      return new Response(
        JSON.stringify({ error: "MESSAGEBIRD_ACCESS_KEY / MESSAGEBIRD_CHANNEL_ID não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = { Authorization: `AccessKey ${accessKey}`, "Content-Type": "application/json" };

    const candidates = [
      `https://integrations.messagebird.com/v3/platforms/whatsapp/${channelId}/templates`,
      `https://integrations.messagebird.com/v3/platforms/whatsapp/channels/${channelId}/templates`,
      `https://integrations.messagebird.com/v3/whatsapp/${channelId}/templates`,
      `https://integrations.messagebird.com/v3/whatsapp/templates?channelId=${channelId}`,
      `https://integrations.messagebird.com/v3/hsm/templates?channelId=${channelId}`,
      `https://integrations.messagebird.com/v2/platforms/whatsapp/${channelId}/templates`,
      `https://conversations.messagebird.com/v1/platforms/whatsapp/${channelId}/templates`,
    ];

    const attempts: any[] = [];
    let success: any = null;

    for (const url of candidates) {
      const r = await fetch(url, { headers: auth });
      const txt = await r.text();
      attempts.push({ url, status: r.status, snippet: txt.slice(0, 120) });
      if (r.ok) {
        try {
          success = { url, data: JSON.parse(txt) };
          break;
        } catch {
          success = { url, data: { raw: txt.slice(0, 500) } };
          break;
        }
      }
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Nenhum endpoint respondeu 2xx", attempts }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = success.data;
    const rawTemplates = result.items || result.results || result.data || result.templates || (Array.isArray(result) ? result : []);

    const templates = (Array.isArray(rawTemplates) ? rawTemplates : []).map((t: any) => ({
      name: t.name,
      language: t.language || t.locale,
      status: t.status,
      category: t.category,
      namespace: t.namespace || "",
      components: t.components || [],
      projectId: t.id || t.projectId,
    }));

    const approved = templates.filter(
      (t: any) => !t.status || ["approved", "active"].includes(String(t.status).toLowerCase())
    );

    return new Response(
      JSON.stringify({ endpoint: success.url, templates: approved, total: templates.length, attempts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
