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

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const targetChannelId = "1d361180-7a89-4b2f-9a3c-ec5b4715916d";
    const channels = [targetChannelId];

    const accessKeys = [
      { label: "MESSAGEBIRD_ACCESS_KEY", value: Deno.env.get("MESSAGEBIRD_ACCESS_KEY") },
      { label: "BIRD_API_KEY", value: Deno.env.get("BIRD_API_KEY") },
    ].filter((k) => Boolean(k.value));

    if (accessKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma chave MessageBird configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let items: any[] = [];
    let channelIdUsed: string | null = null;
    let keySourceUsed: string | null = null;
    const attempts: Array<{ keySource: string; channelId: string | null; count: number; error?: string }> = [];

    for (const key of accessKeys) {
      const auth = {
        Authorization: `AccessKey ${key.value}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      for (const channelId of channels) {
        try {
          const fetched = await fetchAllTemplates(auth, channelId);
          attempts.push({ keySource: key.label, channelId, count: fetched.length });
          if (fetched.length > 0) {
            items = fetched;
            channelIdUsed = channelId;
            keySourceUsed = key.label;
            break;
          }
        } catch (err: any) {
          attempts.push({
            keySource: key.label,
            channelId,
            count: 0,
            error: String(err?.message || err).slice(0, 180),
          });
        }
      }

      if (items.length > 0) break;
    }

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
        channelIdUsed,
        keySourceUsed,
        attempts,
        message: approved.length === 0
          ? "Nenhum template aprovado encontrado para o channelId novo. A chave configurada autentica em outra conta ou o template ainda não está vinculado a este canal."
          : undefined,
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
