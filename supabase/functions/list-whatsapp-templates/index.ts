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
    const endpoint = `${BIRD_BASE}/workspaces/${workspaceId}/channels/${channelId}/templates`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `AccessKey ${accessKey}`,
        "Content-Type": "application/json",
      },
    });

    const rawText = await response.text();
    let result: any;
    try { result = JSON.parse(rawText); } catch { result = { raw: rawText.slice(0, 500) }; }

    if (!response.ok) {
      console.error("Bird templates error:", response.status, JSON.stringify(result).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to fetch templates", status: response.status, details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawTemplates = result.results || result.data || result.items || (Array.isArray(result) ? result : []);

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

    console.log(`Found ${approved.length} templates (Bird) out of ${templates.length} total`);

    return new Response(
      JSON.stringify({ templates: approved, total: templates.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
