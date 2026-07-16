// @ts-nocheck
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MB = "https://integrations.messagebird.com";

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

// Faz paginação: MessageBird limita a 50 por página
async function fetchAllTemplates(headers: Record<string, string>, channelId: string | null) {
  const collected: any[] = [];
  let offset = 0;
  const limit = 50;
  for (let i = 0; i < 20; i++) { // guard: no máx 1000 templates
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (channelId) qs.set("channelId", channelId);
    const res = await fetch(`${MB}/v3/platforms/whatsapp/templates?${qs.toString()}`, { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MessageBird ${res.status}: ${body.slice(0, 400)}`);
    }
    const json = await res.json();
    const items: any[] = json.items || [];
    collected.push(...items);
    const total = json.totalCount ?? collected.length;
    if (collected.length >= total || items.length === 0) break;
    offset += limit;
  }
  return collected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
    const channelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID") || null;
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

    const items = await fetchAllTemplates(auth, channelId);

    const templates = items.map((t: any) => ({
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      namespace: t.wabaId || t.namespace || "",
      components: normalizeComponents(t.components || []),
    }));

    const approved = templates.filter(
      (t) => !t.status || String(t.status).toLowerCase() === "approved"
    );

    return new Response(
      JSON.stringify({
        templates: approved,
        total: templates.length,
        approvedCount: approved.length,
        channelIdUsed: channelId,
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
