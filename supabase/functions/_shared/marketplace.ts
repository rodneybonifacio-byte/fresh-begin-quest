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

  // Payload conforme doc oficial v2.2 — POST /emissoes
  // Schema público: { remetente, destinatario, embalagem, cotacao, ... }
  // O backend Marketplace resolve customerId/cardpost do tenant automaticamente.
  const mpPayload: any = {
    remetente: emissaoPayload?.remetente,
    destinatario: emissaoPayload?.destinatario,
    embalagem: emissaoPayload?.embalagem,
    cotacao: emissaoPayload?.cotacao,
    valorDeclarado: emissaoPayload?.valorDeclarado ?? 0,
    valorNotaFiscal: emissaoPayload?.valorNotaFiscal ?? 0,
    itensDeclaracaoConteudo: emissaoPayload?.itensDeclaracaoConteudo,
    observacao: emissaoPayload?.observacao,
    chaveNFe: emissaoPayload?.chaveNFe,
    numeroNotaFiscal: emissaoPayload?.numeroNotaFiscal,
    logisticaReversa: emissaoPayload?.logisticaReversa ?? 'N',
    cienteObjetoNaoProibido: emissaoPayload?.cienteObjetoNaoProibido ?? true,
    externoId: emissaoPayload?.externoId,
  };

  console.log('[MP] POST /emissoes, codigoServico:', mpPayload.cotacao?.codigoServico);

  const r = await fetch(`${MARKETPLACE_BASE}/emissoes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': auth.apiKey,
      'Authorization': `Bearer ${auth.token}`,
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

/**
 * Rastreia uma emissão na API Marketplace.
 * Retorna no formato BRHUB-compatível para reuso da UI atual.
 */
export async function rastrearMarketplace(codigoObjeto: string): Promise<any> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new Error('Marketplace indisponível');

  const r = await fetch(
    `${MARKETPLACE_BASE}/emissoes/status/${encodeURIComponent(codigoObjeto)}`,
    { headers: { 'x-api-key': auth.apiKey } }
  );
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok) {
    console.error('[MP] rastreio falhou:', r.status, text.slice(0, 300));
    throw new Error(`Marketplace rastreio falhou (${r.status})`);
  }
  const data = j?.data || j;
  // Normalizar minimamente: garantir que tenha eventos[]
  const eventos = data?.eventos || data?.historico || [];
  return {
    codigoObjeto,
    dataPrevisaoEntrega: data?.dataPrevisaoEntrega || data?.previsao || null,
    servico: data?.servico || data?.nomeServico || null,
    eventos,
    origem: 'marketplace',
    raw: j,
  };
}

/**
 * Busca o PDF da etiqueta Marketplace pelo uuid.
 * Retorna { nome, dados (base64) } no formato esperado pela UI atual.
 */
export async function getPdfEtiquetaMarketplace(
  uuidMarketplace: string
): Promise<{ nome: string; dados: string }> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new Error('Marketplace indisponível');

  const r = await fetch(
    `${MARKETPLACE_BASE}/emissoes/etiqueta/pdf/${encodeURIComponent(uuidMarketplace)}`,
    { headers: { 'x-api-key': auth.apiKey } }
  );
  if (!r.ok) {
    const t = await r.text();
    console.error('[MP] pdf etiqueta falhou:', r.status, t.slice(0, 300));
    throw new Error(`Marketplace PDF falhou (${r.status})`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/pdf')) {
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { nome: `etiqueta_${uuidMarketplace}.pdf`, dados: btoa(bin) };
  }
  // JSON com base64
  const j = await r.json();
  const dados = j?.data?.dados || j?.dados || j?.pdf || j?.base64;
  const nome = j?.data?.nome || j?.nome || `etiqueta_${uuidMarketplace}.pdf`;
  if (!dados) throw new Error('Marketplace PDF: resposta sem dados');
  return { nome, dados };
}

/**
 * Cancela uma emissão Marketplace.
 */
export async function cancelarEmissaoMarketplace(
  uuidMarketplace: string,
  motivo: string
): Promise<any> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new Error('Marketplace indisponível');

  const r = await fetch(
    `${MARKETPLACE_BASE}/emissoes/${encodeURIComponent(uuidMarketplace)}/cancelar`,
    {
      method: 'DELETE',
      headers: { 'x-api-key': auth.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    }
  );
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok || j?.success === false) {
    console.error('[MP] cancelamento falhou:', r.status, text.slice(0, 300));
    throw new Error(`Marketplace cancelamento falhou (${r.status}): ${j?.message || text.slice(0, 200)}`);
  }
  return j;
}

/**
 * Cria uma reversa (logística reversa) na API Marketplace.
 */
export async function criarReversaMarketplace(payload: any): Promise<any> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new Error('Marketplace indisponível');

  const r = await fetch(`${MARKETPLACE_BASE}/emissoes/reversa`, {
    method: 'POST',
    headers: { 'x-api-key': auth.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok || j?.success === false) {
    console.error('[MP] reversa falhou:', r.status, text.slice(0, 300));
    throw new Error(`Marketplace reversa falhou (${r.status}): ${j?.message || text.slice(0, 200)}`);
  }
  return j?.data || j;
}
