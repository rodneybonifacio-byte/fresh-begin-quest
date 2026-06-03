import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BIRD_BASE = "https://api.bird.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const channelDbId = url.searchParams.get("channel_id");

    let accessKey: string | undefined;
    let birdChannelId: string | undefined;
    let workspaceId: string | undefined;

    if (channelDbId) {
      const { data: ch } = await supabase
        .from("whatsapp_channels")
        .select("access_key, channel_id, bird_workspace_id")
        .eq("id", channelDbId)
        .single();
      accessKey = ch?.access_key;
      birdChannelId = ch?.channel_id;
      workspaceId = ch?.bird_workspace_id || undefined;
    } else {
      const { data: def } = await supabase
        .from("whatsapp_channels")
        .select("access_key, channel_id, bird_workspace_id")
        .eq("is_default", true)
        .single();
      accessKey = def?.access_key;
      birdChannelId = def?.channel_id;
      workspaceId = def?.bird_workspace_id || undefined;
    }

    accessKey = accessKey || Deno.env.get("BIRD_API_KEY")!;
    birdChannelId = birdChannelId || Deno.env.get("BIRD_WHATSAPP_CHANNEL_ID")!;
    workspaceId = workspaceId || Deno.env.get("BIRD_WORKSPACE_ID")!;

    // Bird API: GET /workspaces/{wsId}/channels/{chId}/templates
    const endpoint = `${BIRD_BASE}/workspaces/${workspaceId}/channels/${birdChannelId}/templates`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `AccessKey ${accessKey}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Bird templates error:", response.status, JSON.stringify(result).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to fetch templates", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawTemplates = result.results || result.data || result.items || result || [];

    // Normaliza para o formato esperado pelo restante do app
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
      (t: any) => !t.status || String(t.status).toLowerCase() === "approved" || String(t.status).toLowerCase() === "active"
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
