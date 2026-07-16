// @ts-nocheck
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
    const channelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");

    if (!accessKey || !channelId) {
      return new Response(
        JSON.stringify({ error: "MESSAGEBIRD_ACCESS_KEY / MESSAGEBIRD_CHANNEL_ID não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MessageBird clássico: HSM templates
    // GET https://integrations.messagebird.com/v3/platforms/whatsapp/{channelId}/templates
    const endpoint = `https://integrations.messagebird.com/v3/platforms/whatsapp/${channelId}/templates?limit=100`;

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
      console.error("MessageBird templates error:", response.status, JSON.stringify(result).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to fetch templates", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawTemplates = result.items || result.results || result.data || (Array.isArray(result) ? result : []);

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

    console.log(`Found ${approved.length} templates out of ${templates.length} total`);

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
