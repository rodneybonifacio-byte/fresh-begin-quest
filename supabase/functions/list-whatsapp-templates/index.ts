// @ts-nocheck
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BIRD = "https://api.bird.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey = Deno.env.get("BIRD_API_KEY");
    const workspaceId = Deno.env.get("BIRD_WORKSPACE_ID");
    if (!accessKey || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "BIRD_API_KEY / BIRD_WORKSPACE_ID não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = { Authorization: `AccessKey ${accessKey}`, "Content-Type": "application/json" };

    // 1) Lista projetos do workspace
    const projRes = await fetch(`${BIRD}/workspaces/${workspaceId}/projects?limit=100`, { headers: auth });
    const projText = await projRes.text();
    if (!projRes.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao listar projects", status: projRes.status, body: projText.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const projJson = JSON.parse(projText);
    const projects: any[] = projJson.results || projJson.data || projJson.items || [];

    // 2) Para cada project, busca channel-templates
    const allTemplates: any[] = [];
    for (const p of projects) {
      const pid = p.id || p.projectId;
      if (!pid) continue;
      const tRes = await fetch(
        `${BIRD}/workspaces/${workspaceId}/projects/${pid}/channel-templates?limit=100`,
        { headers: auth }
      );
      const tText = await tRes.text();
      if (!tRes.ok) continue;
      try {
        const tJson = JSON.parse(tText);
        const items = tJson.results || tJson.data || tJson.items || [];
        for (const it of items) allTemplates.push({ ...it, _projectId: pid });
      } catch {}
    }

    // Converte blocos Bird -> componentes formato Meta/WhatsApp
    function blocksToMetaComponents(blocks: any[]): any[] {
      const components: any[] = [];
      const buttons: any[] = [];
      for (const b of blocks || []) {
        if (b.type === "text" && b.role !== "footer" && b.role !== "header") {
          components.push({ type: "BODY", text: b.text?.text || "" });
        } else if (b.type === "text" && b.role === "footer") {
          components.push({ type: "FOOTER", text: b.text?.text || "" });
        } else if (b.type === "text" && b.role === "header") {
          components.push({ type: "HEADER", format: "TEXT", text: b.text?.text || "" });
        } else if (b.type === "image") {
          components.push({ type: "HEADER", format: "IMAGE", example: { header_handle: [b.image?.mediaUrl] } });
        } else if (b.type === "video") {
          components.push({ type: "HEADER", format: "VIDEO" });
        } else if (b.type === "document" || b.type === "file") {
          components.push({ type: "HEADER", format: "DOCUMENT" });
        } else if (b.type === "reply-action") {
          buttons.push({ type: "QUICK_REPLY", text: b.replyAction?.text || "" });
        } else if (b.type === "link-action") {
          buttons.push({ type: "URL", text: b.linkAction?.text || "", url: b.linkAction?.url || "" });
        } else if (b.type === "call-action") {
          buttons.push({ type: "PHONE_NUMBER", text: b.callAction?.text || "", phone_number: b.callAction?.phoneNumber || "" });
        }
      }
      if (buttons.length) components.push({ type: "BUTTONS", buttons });
      return components;
    }

    const templates = allTemplates.map((t: any) => {
      const deployments: any[] = t.deployments || [];
      const nameDep = deployments.find((d) => d.key === "whatsappTemplateName");
      const catDep = deployments.find((d) => d.key === "whatsappCategory");
      const platformContent: any[] = t.platformContent || [];
      const wa = platformContent.find((p) => p.platform === "whatsapp") || platformContent[0] || {};
      const approval = (wa.approvals && wa.approvals[0]) || {};
      return {
        projectId: t.id || t._projectId,
        name: nameDep?.value || t.name || t.id,
        language: wa.locale || t.defaultLocale,
        status: approval.status || t.status,
        category: catDep?.value || t.category,
        components: blocksToMetaComponents(wa.blocks || []),
        namespace: "",
      };
    });

    const approved = templates.filter(
      (t) => !t.status || ["approved", "active"].includes(String(t.status).toLowerCase())
    );

    return new Response(
      JSON.stringify({
        projectsCount: projects.length,
        templates: approved,
        total: templates.length,
      }),
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
