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
    const { trigger_key, phone, variables }: {
      trigger_key: string;
      phone: string;
      variables: Record<string, string>;
    } = await req.json();

    if (!trigger_key || !phone) {
      return new Response(
        JSON.stringify({ error: "trigger_key and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch template config
    const { data: template, error: tErr } = await supabase
      .from("whatsapp_notification_templates")
      .select("*")
      .eq("trigger_key", trigger_key)
      .eq("is_active", true)
      .single();

    if (tErr || !template) {
      console.log(`Template '${trigger_key}' not found or inactive`);
      return new Response(
        JSON.stringify({ error: "Template not found or inactive", trigger_key }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve channel
    let channelId: string;
    let accessKey: string;

    if (template.channel_id) {
      const { data: ch } = await supabase
        .from("whatsapp_channels")
        .select("channel_id, access_key")
        .eq("id", template.channel_id)
        .single();

      if (ch) {
        channelId = ch.channel_id;
        accessKey = ch.access_key;
      } else {
        const { data: def } = await supabase
          .from("whatsapp_channels")
          .select("channel_id, access_key")
          .eq("is_default", true)
          .single();
        channelId = def?.channel_id || Deno.env.get("MESSAGEBIRD_CHANNEL_ID")!;
        accessKey = def?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY")!;
      }
    } else {
      const { data: def } = await supabase
        .from("whatsapp_channels")
        .select("channel_id, access_key")
        .eq("is_default", true)
        .single();
      channelId = def?.channel_id || Deno.env.get("MESSAGEBIRD_CHANNEL_ID")!;
      accessKey = def?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY")!;
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone.startsWith("55")) {
      normalizedPhone = "55" + normalizedPhone;
    }

    // Build template components with variables grouped by component_type
    const templateVars = (template.variables || []) as {
      key: string;
      label: string;
      system_field?: string;
      component_type?: string;
      component_var_index?: number;
    }[];

    // Group variables by component type
    const headerVars = templateVars.filter(v => v.component_type === 'HEADER');
    const bodyVars = templateVars.filter(v => v.component_type === 'BODY' || !v.component_type);
    const buttonVars = templateVars.filter(v => v.component_type === 'BUTTONS');

    const resolveVar = (v: { system_field?: string; key: string }) => ({
      type: "text",
      text: variables[v.system_field || v.key] || variables[v.key] || "",
    });

    const components: any[] = [];

    // Header component parameters
    if (headerVars.length > 0) {
      components.push({
        type: "header",
        parameters: headerVars.map(resolveVar),
      });
    }

    // Body component parameters
    if (bodyVars.length > 0) {
      components.push({
        type: "body",
        parameters: bodyVars.map(resolveVar),
      });
    }

    // Button component parameters (each button is a separate component entry)
    if (buttonVars.length > 0) {
      // Group button vars by their component_var_index (button index)
      const buttonGroups: Record<number, typeof buttonVars> = {};
      buttonVars.forEach(v => {
        const idx = v.component_var_index || 0;
        if (!buttonGroups[idx]) buttonGroups[idx] = [];
        buttonGroups[idx].push(v);
      });

      Object.entries(buttonGroups).forEach(([btnIdx, vars]) => {
        components.push({
          type: "button",
          sub_type: "url",
          index: parseInt(btnIdx),
          parameters: vars.map(resolveVar),
        });
      });
    }

    // Build MessageBird HSM payload
    const payload: any = {
      to: normalizedPhone,
      from: channelId,
      type: "hsm",
      content: {
        hsm: {
          namespace: template.template_namespace || "",
          templateName: template.template_name,
          language: {
            policy: "deterministic",
            code: template.template_language,
          },
          components,
        },
      },
    };

    console.log(`Sending template '${template.template_name}' to ${normalizedPhone}`, JSON.stringify(components));

    const response = await fetch("https://conversations.messagebird.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${accessKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("MessageBird error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Failed to send template", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Template sent successfully: ${result.id}`);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id, trigger_key }),
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
