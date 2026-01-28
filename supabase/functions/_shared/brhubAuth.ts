// @ts-nocheck

/**
 * Valida o token BRHUB chamando a API externa (/account/profile).
 * Isso evita confiar apenas em decode de JWT sem verificação.
 */
export async function validateBrhubToken(req: Request): Promise<
  | { ok: true; token: string; payload: any; isAdmin: boolean; clienteId: string | null }
  | { ok: false; status: number; error: string }
> {
  const brhubAuthHeader = req.headers.get("x-brhub-authorization") || req.headers.get("authorization");
  if (!brhubAuthHeader) {
    return { ok: false, status: 401, error: "Token de autorização não fornecido" };
  }

  const token = brhubAuthHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.split(".").length < 2) {
    return { ok: false, status: 401, error: "Token inválido" };
  }

  const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";

  // 1) Valida o token na API externa
  try {
    const profileResp = await fetch(`${BASE_API_URL}/account/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!profileResp.ok) {
      const text = await profileResp.text().catch(() => "");
      return {
        ok: false,
        status: profileResp.status === 401 ? 401 : 403,
        error: `Token inválido ou expirado (profile ${profileResp.status}) ${text}`.trim(),
      };
    }
  } catch (_err) {
    return { ok: false, status: 502, error: "Falha ao validar token na API externa" };
  }

  // 2) Agora que o token foi validado, podemos confiar no payload decodificado
  let payload: any;
  try {
    const payloadBase64 = token.split(".")[1];
    payload = JSON.parse(atob(payloadBase64));
  } catch (_err) {
    return { ok: false, status: 401, error: "Token inválido (payload)" };
  }

  const clienteId = payload?.clienteId || payload?.cliente_id || payload?.sub || payload?.id || null;
  const role = payload?.role;
  const permissoes = Array.isArray(payload?.permissoes) ? payload.permissoes : [];
  const isAdmin = role === "ADMIN" || role === "admin" || permissoes.some((p: string) => p?.toLowerCase?.().includes("admin"));

  return { ok: true, token, payload, isAdmin, clienteId };
}
