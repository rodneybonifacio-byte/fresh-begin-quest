// Bird API compatibility shim.
//
// Migração de MessageBird (legacy) -> Bird API (api.bird.com).
// Esta camada aceita o payload no formato legado que o codebase já usa
// ({to, from, type, content}) e traduz para o formato da Bird API:
//   POST https://api.bird.com/workspaces/{wsId}/channels/{chId}/messages
//
// Uso (drop-in replacement de `fetch`):
//   import { birdSend } from "../_shared/bird-compat.ts";
//   const resp = await birdSend("https://conversations.messagebird.com/v1/send", {
//     method: "POST",
//     headers: { Authorization: `AccessKey ${accessKey}`, "Content-Type": "application/json" },
//     body: JSON.stringify({ to, from, type: "text", content: { text: "..." } }),
//   });
//   const result = await resp.json(); // { id, status, ... }
//
// A resposta é normalizada: `result.id` continua presente.

const BIRD_BASE = "https://api.bird.com";

function getWorkspaceId(): string {
  const wsId = Deno.env.get("BIRD_WORKSPACE_ID");
  if (!wsId) throw new Error("BIRD_WORKSPACE_ID não configurado");
  return wsId;
}

interface LegacyPayload {
  to: string;
  from: string; // channel ID
  type: string;
  content?: any;
}

/** Traduz payload legado MessageBird para o body da Bird API. */
function translateToBird(legacy: LegacyPayload): { channelId: string; birdBody: any } {
  const channelId = legacy.from;
  const phone = String(legacy.to || "").replace(/^\+?/, "+");
  const receiver = {
    contacts: [{ identifierValue: phone.startsWith("+") ? phone : `+${phone}` }],
  };

  const t = (legacy.type || "text").toLowerCase();
  const c = legacy.content || {};

  let body: any;

  if (t === "text" || (!t && c.text)) {
    body = { type: "text", text: { text: c.text || "" } };
  } else if (t === "image") {
    body = {
      type: "image",
      image: {
        files: [{ mediaUrl: c.image?.url || c.url }],
        caption: c.text || c.caption || c.image?.caption,
      },
    };
  } else if (t === "audio" || t === "voice" || t === "ptt") {
    body = {
      type: "audio",
      audio: { files: [{ mediaUrl: c.audio?.url || c.voice?.url || c.url }] },
    };
  } else if (t === "video") {
    body = {
      type: "video",
      video: { files: [{ mediaUrl: c.video?.url || c.url }], caption: c.text },
    };
  } else if (t === "file" || t === "document") {
    body = {
      type: "file",
      file: {
        files: [{ mediaUrl: c.file?.url || c.document?.url || c.url, filename: c.file?.filename || c.document?.filename }],
      },
    };
  } else if (t === "hsm") {
    // HSM/template legado -> Bird template body
    const h = c.hsm || {};
    const parameters: any[] = [];
    // achatamos os components numa lista de parâmetros key/value
    for (const comp of h.components || []) {
      const ctype = (comp.type || "").toLowerCase();
      for (let i = 0; i < (comp.parameters || []).length; i++) {
        const p = comp.parameters[i];
        const key = ctype === "button"
          ? `button.${comp.index ?? 0}.${i + 1}`
          : ctype === "header"
            ? `header.${i + 1}`
            : `body.${i + 1}`;
        if (p.type === "text") parameters.push({ type: "string", key, value: p.text ?? "" });
        else if (p.type === "image") parameters.push({ type: "string", key, value: p.image?.url ?? "" });
        else parameters.push({ type: "string", key, value: String(p.text ?? p.value ?? "") });
      }
    }
    body = {
      type: "template",
      template: {
        projectId: h.templateName,
        version: "latest",
        locale: h.language?.code || "pt_BR",
        parameters,
      },
    };
  } else {
    // fallback texto
    body = { type: "text", text: { text: c.text || JSON.stringify(c) } };
  }

  return { channelId, birdBody: { receiver, body } };
}

/**
 * Drop-in replacement de `fetch()` para os call sites legados.
 * Quando o URL é a legacy `conversations.messagebird.com/v1/send`,
 * traduz para Bird API. Caso contrário, repassa para fetch nativo.
 */
export async function birdSend(url: string | URL, init?: RequestInit): Promise<Response> {
  const urlStr = String(url);
  if (!urlStr.includes("conversations.messagebird.com") && !urlStr.includes("api.bird.com")) {
    return fetch(url, init);
  }

  const headers = new Headers(init?.headers || {});
  const accessKey = (headers.get("authorization") || "").replace(/^AccessKey\s+/i, "").replace(/^Bearer\s+/i, "");
  const legacy = init?.body ? JSON.parse(typeof init.body === "string" ? init.body : new TextDecoder().decode(init.body as ArrayBuffer)) : {};

  const { channelId, birdBody } = translateToBird(legacy);
  const wsId = getWorkspaceId();
  const birdUrl = `${BIRD_BASE}/workspaces/${wsId}/channels/${channelId}/messages`;

  const apiKey = accessKey || Deno.env.get("BIRD_API_KEY") || "";

  const birdResp = await fetch(birdUrl, {
    method: "POST",
    headers: {
      Authorization: `AccessKey ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(birdBody),
  });

  // Normaliza erro pra parecer com o que MessageBird devolvia
  if (!birdResp.ok) {
    const errText = await birdResp.text();
    let errJson: any;
    try { errJson = JSON.parse(errText); } catch { errJson = { error: errText }; }
    console.error(`[BIRD ${birdResp.status}] ${birdUrl} payload=${JSON.stringify(birdBody).slice(0,300)} response=${errText.slice(0,500)}`);
    return new Response(JSON.stringify({
      errors: [{
        description: errJson?.errors?.[0]?.message || errJson?.message || errJson?.error || errText,
        code: birdResp.status,
      }],
    }), { status: birdResp.status, headers: { "Content-Type": "application/json" } });
  }

  // Sucesso: a resposta Bird já tem `id` no top-level, compatível com o legado
  return birdResp;
}
