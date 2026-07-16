// @ts-nocheck
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MB = "https://integrations.messagebird.com";

// Converte componentes/HSM da MessageBird para o formato Meta esperado pelo modal
function normalizeComponents(components: any[]): any[] {
  if (!Array.isArray(components)) return [];
  return components.map((c: any) => {
    const type = String(c.type || "").toUpperCase();
    const out: any = { type };
    if (c.format) out.format = String(c.format).toUpperCase();
    if (c.text) out.text = c.text;
    if (Array.isArray(c.buttons)) {
      out.buttons = c.buttons.map((b: any) => ({
        type: String(b.type || "").toUpperCase(),
        text: b.text || "",
        url: b.url,
        phone_number: b.phone_number || b.phoneNumber,
      }));
    }
    if (c.example) out.example = c.example;
    return out;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
    const channelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
    if (!accessKey) {
      return new Response(
        JSON.stringify({ error: "MESSAGEBIRD_ACCESS_KEY não configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = {
      Authorization: `AccessKey ${accessKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Descobrir wabaId a partir do canal (templates são por WABA, não por canal)
    let wabaId: string | null = null;
    let channelInfo: any = null;
    if (channelId) {
      const chRes = await fetch(
        `${MB}/v3/platforms/whatsapp/channels/${channelId}`,
        { headers: auth }
      );
      if (chRes.ok) {
        try {
          channelInfo = await chRes.json();
          wabaId =
            channelInfo?.wabaId ||
            channelInfo?.waba?.id ||
            channelInfo?.arguments?.wabaId ||
            channelInfo?.details?.wabaId ||
            null;
        } catch {}
      }
    }

    // MessageBird Integrations API - HSM Templates
    const qs = new URLSearchParams({ limit: "200" });
    if (wabaId) qs.set("wabaId", wabaId);
    const url = `${MB}/v3/platforms/whatsapp/templates?${qs.toString()}`;
    const res = await fetch(url, { headers: auth });
    const text = await res.text();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Falha ao buscar templates na MessageBird",
          status: res.status,
          details: text.slice(0, 800),
          wabaId,
          channelInfo,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let json: any = {};
    try { json = JSON.parse(text); } catch {}
    const items: any[] = json.items || json.results || json.data || [];

    // Se um channelId estiver definido, filtramos por ele quando o template expõe channelId
    const scoped = channelId
      ? items.filter((t: any) => !t.channelId || t.channelId === channelId)
      : items;

    const templates = scoped.map((t: any) => ({
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      namespace: t.wabaId || t.namespace || "",
      components: normalizeComponents(t.components || []),
      channelId: t.channelId || null,
    }));

    const approved = templates.filter(
      (t) => !t.status || String(t.status).toLowerCase() === "approved"
    );

    return new Response(
      JSON.stringify({
        templates: approved,
        total: templates.length,
        approvedCount: approved.length,
        channelIdUsed: channelId || null,
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
