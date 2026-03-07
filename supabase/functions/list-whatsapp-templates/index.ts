import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get channel_id from query or use default
    const url = new URL(req.url);
    const channelId = url.searchParams.get("channel_id");

    let accessKey: string;

    if (channelId) {
      const { data: ch } = await supabase
        .from("whatsapp_channels")
        .select("access_key")
        .eq("id", channelId)
        .single();
      accessKey = ch?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY")!;
    } else {
      const { data: def } = await supabase
        .from("whatsapp_channels")
        .select("access_key")
        .eq("is_default", true)
        .single();
      accessKey = def?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY")!;
    }

    // Fetch templates from MessageBird Integrations API
    const response = await fetch(
      "https://integrations.messagebird.com/v2/platforms/whatsapp/templates",
      {
        headers: {
          Authorization: `AccessKey ${accessKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("MessageBird templates error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Failed to fetch templates", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter only approved templates and format response
    const templates = (result.data || result.items || result || []).map((t: any) => ({
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      namespace: t.namespace,
      components: t.components,
    }));

    // Only return approved ones
    const approved = templates.filter(
      (t: any) => t.status === "approved" || t.status === "APPROVED"
    );

    console.log(`Found ${approved.length} approved templates out of ${templates.length} total`);

    // Auto-sync template_body for all existing notification templates
    const syncMode = url.searchParams.get("sync") === "true";
    if (syncMode) {
      const { data: existingTemplates } = await supabase
        .from("whatsapp_notification_templates")
        .select("id, template_name, template_body");

      if (existingTemplates) {
        for (const et of existingTemplates) {
          if (et.template_body) continue; // Already has body
          const meta = approved.find((a: any) => a.name === et.template_name);
          if (!meta?.components) continue;

          const getCompText = (type: string) => {
            const c = meta.components.find((c: any) => (c.type || '').toUpperCase() === type);
            return c?.text || '';
          };
          const header = meta.components.find((c: any) => (c.type || '').toUpperCase() === 'HEADER');
          const headerText = (header?.format === 'TEXT' || header?.format === 'text') ? header.text : '';
          const footer = getCompText('FOOTER');
          const btnComp = meta.components.find((c: any) => (c.type || '').toUpperCase() === 'BUTTONS');
          const buttons = (btnComp?.buttons || []).map((b: any) => ({ text: b.text, type: b.type, url: b.url }));

          const bodyData = JSON.stringify({
            body: getCompText('BODY'),
            header: headerText,
            footer,
            buttons,
          });

          await supabase
            .from("whatsapp_notification_templates")
            .update({ template_body: bodyData })
            .eq("id", et.id);

          console.log(`✅ Auto-synced template_body for: ${et.template_name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ templates: approved, total: templates.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
