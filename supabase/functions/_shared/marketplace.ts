// Helpers compartilhados para a API Marketplace
// Reutilizado por cotacao-frete e emitir-etiqueta

export const MARKETPLACE_BASE =
  'https://icnwmceefmgavmbzsomo.supabase.co/functions/v1/marketplace-api';

// Cache de token Marketplace (in-memory por instância da edge function)
let mpTokenCache: { token: string; apiKey: string; exp: number } | null = null;

export async function getMarketplaceAuth(): Promise<
  { apiKey: string; token: string } | null
> {
  // @ts-ignore - Deno global
  const email = Deno.env.get('MARKETPLACE_EMAIL');
  // @ts-ignore - Deno global
  const password = Deno.env.get('MARKETPLACE_PASSWORD');
  if (!email || !password) {
    console.log('[MP] credenciais não configuradas');
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (mpTokenCache && mpTokenCache.exp - 300 > now) {
    return { apiKey: mpTokenCache.apiKey, token: mpTokenCache.token };
  }
  try {
    const r = await fetch(`${MARKETPLACE_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json();
    if (!j?.success || !j?.tenant?.apiKey) {
      console.error('[MP] login falhou:', JSON.stringify(j).slice(0, 300));
      return null;
    }
    let exp = now + 3600;
    try {
      const payload = JSON.parse(atob(j.token.split('.')[1]));
      if (payload?.exp) exp = payload.exp;
    } catch (_) { /* noop */ }
    mpTokenCache = { token: j.token, apiKey: j.tenant.apiKey, exp };
    console.log('[MP] autenticado, tenant:', j.tenant.id);
    return { apiKey: j.tenant.apiKey, token: j.token };
  } catch (e: any) {
    console.error('[MP] login erro:', e?.message);
    return null;
  }
}

export interface NormalizedEmissaoResult {
  id: string | null;
  codigoObjeto: string | null;
  uuidMarketplace?: string | null;
  pdfUrl?: string | null;
  frete: { valorTotal: number };
  origem: 'brhub' | 'marketplace';
  raw: any;
}

/**
 * Emite uma etiqueta via API Marketplace.
 * Recebe um payload no formato BRHUB e adapta para o contrato Marketplace.
 */
export async function emitirEtiquetaMarketplace(
  emissaoPayload: any
): Promise<NormalizedEmissaoResult> {
  const auth = await getMarketplaceAuth();
  if (!auth) {
    throw new Error('Marketplace indisponível: credenciais ausentes');
  }

  // Mapeamento BRHUB -> Marketplace
  const mpPayload: any = {
    codigoServico: emissaoPayload?.cotacao?.codigoServico,
    cepOrigem: emissaoPayload?.remetente?.endereco?.cep,
    cepDestino: emissaoPayload?.destinatario?.endereco?.cep,
    embalagem: emissaoPayload?.embalagem,
    valorDeclarado: emissaoPayload?.valorDeclarado ?? 0,
    remetente: emissaoPayload?.remetente,
    destinatario: emissaoPayload?.destinatario,
    itensDeclaracaoConteudo: emissaoPayload?.itensDeclaracaoConteudo,
    observacao: emissaoPayload?.observacao,
  };

  console.log('[MP] emitindo etiqueta, codigoServico:', mpPayload.codigoServico);

  const r = await fetch(`${MARKETPLACE_BASE}/frete/emissao`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': auth.apiKey,
    },
    body: JSON.stringify(mpPayload),
  });

  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }

  if (!r.ok || j?.success === false) {
    console.error('[MP] emissão falhou:', r.status, text.slice(0, 500));
    throw new Error(
      `Marketplace emissão falhou (${r.status}): ${j?.message || j?.error || text.slice(0, 200)}`
    );
  }

  // Resposta esperada do Marketplace (campos podem variar — parsing resiliente)
  const data = j?.data || j;
  const result: NormalizedEmissaoResult = {
    id: data?.id || data?.uuid || data?.uuidEmissao || null,
    codigoObjeto: data?.codigoObjeto || data?.codigoRastreio || data?.tracking || null,
    uuidMarketplace: data?.uuid || data?.uuidEmissao || data?.id || null,
    pdfUrl: data?.pdfUrl || data?.urlEtiqueta || null,
    frete: {
      valorTotal: Number(
        data?.frete?.valorTotal ??
          data?.valorTotal ??
          data?.preco ??
          emissaoPayload?.cotacao?.valorTotal ??
          0
      ),
    },
    origem: 'marketplace',
    raw: j,
  };

  console.log('[MP] emissão ok:', {
    id: result.id,
    codigoObjeto: result.codigoObjeto,
    valor: result.frete.valorTotal,
  });

  return result;
}
