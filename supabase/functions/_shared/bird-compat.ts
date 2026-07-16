// MessageBird clássico passthrough.
//
// Após o retorno para o MessageBird clássico (conversations.messagebird.com),
// este shim mantém a assinatura `birdSend()` usada pelos call sites legados,
// mas encaminha a chamada direto para o MessageBird, forçando as credenciais
// do env (MESSAGEBIRD_ACCESS_KEY / MESSAGEBIRD_CHANNEL_ID) sempre que
// disponíveis — assim uma troca de canal no dashboard precisa apenas de
// atualizar os secrets.

/**
 * Drop-in replacement de `fetch()` para os call sites legados.
 * - URLs para conversations.messagebird.com são enviadas ao MessageBird clássico.
 * - Authorization é sobrescrito por MESSAGEBIRD_ACCESS_KEY quando presente.
 * - Payloads com `from` são reescritos para MESSAGEBIRD_CHANNEL_ID quando presente.
 * - URLs de outros hosts são repassadas para `fetch` nativo sem mudança.
 */
export async function birdSend(url: string | URL, init?: RequestInit): Promise<Response> {
  const urlStr = String(url);
  if (!urlStr.includes("conversations.messagebird.com")) {
    return fetch(url, init);
  }

  const envAccessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
  const envChannelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");

  const headers = new Headers(init?.headers || {});
  if (envAccessKey) {
    headers.set("Authorization", `AccessKey ${envAccessKey}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Reescreve `from` (channel_id) quando um novo canal está definido no env
  let body = init?.body;
  if (envChannelId && body) {
    try {
      const parsed = JSON.parse(typeof body === "string" ? body : new TextDecoder().decode(body as ArrayBuffer));
      if (parsed && typeof parsed === "object" && "from" in parsed) {
        parsed.from = envChannelId;
        body = JSON.stringify(parsed);
      }
    } catch {
      // body não é JSON — repassa como está
    }
  }

  const resp = await fetch(urlStr, { ...init, headers, body });

  if (!resp.ok) {
    const errText = await resp.clone().text();
    console.error(`[MessageBird ${resp.status}] ${urlStr} response=${errText.slice(0, 500)}`);
  }
  return resp;
}
