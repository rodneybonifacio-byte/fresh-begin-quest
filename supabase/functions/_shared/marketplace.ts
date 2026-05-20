// Helpers compartilhados para a API Marketplace BRHUB (contrato público v3.1)
// Docs: https://app.brhubenvios.com.br/apidocs?v=31
//
// O servidor Marketplace já resolve internamente customerId, cardpost, CEP de
// origem, tradução para MaisEnvios e fallback de tracking. O cliente envia
// apenas o payload documentado — sem campos legacy (`sender`, `delivery`,
// `contact`, `object`, `complement`, `service`, `dc`, `nf`...).

export const MARKETPLACE_BASE =
  'https://icnwmceefmgavmbzsomo.supabase.co/functions/v1/marketplace-api';

// ──────────────────────────────────────────────────────────────────────
// Auth (cache in-memory por instância)
// ──────────────────────────────────────────────────────────────────────

let mpTokenCache: { token: string; apiKey: string; exp: number } | null = null;

export async function getMarketplaceAuth(
  forceRefresh = false,
): Promise<{ apiKey: string; token: string } | null> {
  // @ts-ignore - Deno global
  const email = Deno.env.get('MARKETPLACE_EMAIL');
  // @ts-ignore - Deno global
  const password = Deno.env.get('MARKETPLACE_PASSWORD');
  if (!email || !password) {
    console.log('[MP] credenciais não configuradas');
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (!forceRefresh && mpTokenCache && mpTokenCache.exp - 300 > now) {
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

function mpHeaders(auth: { apiKey: string; token: string }) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': auth.apiKey,
    'Authorization': `Bearer ${auth.token}`,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Helpers de normalização
// ──────────────────────────────────────────────────────────────────────

const digits = (s: any) => String(s ?? '').replace(/\D/g, '');
const trim = (s: any) => String(s ?? '').trim();

function isValidNFeAccessKey(raw: any): boolean {
  const chave = digits(raw);
  if (chave.length !== 44) return false;
  if (/^(\d)\1{43}$/.test(chave)) return false;

  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(chave[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  const checkDigit = mod < 2 ? 0 : 11 - mod;
  return checkDigit === Number(chave[43]);
}

const cleanObject = <T extends Record<string, any>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as T;

/**
 * Lista de codigoServico que exigem NF (Manual MaisEnvios v6.3 + v3.0).
 * Cobertura: SAME DAY, NEXT DAY, HOT 3H, EXPRESSO 1, ECONOMICO 1, Jadlog, .Package.
 */
const PRIVATE_CARRIERS_REQUIRING_NF = new Set([
  'sameday', 'same_day',
  'nextday', 'nextdayhub', 'next_day', 'next_day_hub',
  'hot3h', 'hot3horas', 'hot_3h', 'hot_3horas',
  'expresso1', '+expresso1', 'expresso_1',
  'economico1', '+economico1', 'economico_1',
  'jadlog', '.package', 'package',
]);

export function carrierRequiresNF(codigoServico: string, requerNotaFiscal?: boolean): boolean {
  if (requerNotaFiscal === true) return true;
  if (!codigoServico) return false;
  const k = String(codigoServico).trim().toLowerCase();
  return PRIVATE_CARRIERS_REQUIRING_NF.has(k);
}

function normalizePessoa(p: any) {
  if (!p) return undefined;
  const end = p?.endereco || {};
  const cep = digits(end?.cep || p?.cep);
  const cidade = trim(end?.cidade || end?.localidade || p?.cidade || p?.localidade);
  return cleanObject({
    nome: trim(p?.nome),
    cpfCnpj: digits(p?.cpfCnpj || p?.cpf_cnpj),
    celular: digits(p?.celular || p?.telefone || ''),
    email: trim(p?.email),
    cep,
    logradouro: trim(end?.logradouro || p?.logradouro),
    numero: trim(end?.numero || p?.numero) || 'S/N',
    complemento: trim(end?.complemento || p?.complemento),
    bairro: trim(end?.bairro || p?.bairro),
    cidade,
    uf: trim(end?.uf || p?.uf).toUpperCase(),
  });
}

function normalizeEmbalagem(e: any) {
  const peso = Number(e?.peso ?? 0);
  return {
    peso: peso > 30 ? peso / 1000 : peso, // sempre em kg (API converte p/ gramas em Correios)
    altura: Number(e?.altura ?? 2),
    largura: Number(e?.largura ?? 11),
    comprimento: Number(e?.comprimento ?? 16),
    diametro: Number(e?.diametro ?? 0),
  };
}

function normalizeItens(itens: any): Array<{ conteudo: string; quantidade: number; valor: number }> | undefined {
  if (!Array.isArray(itens) || itens.length === 0) return undefined;
  return itens.map((it: any) => ({
    conteudo: trim(it?.conteudo || it?.descricao || 'Mercadoria').slice(0, 50),
    quantidade: Math.max(1, Math.trunc(Number(it?.quantidade || 1) || 1)),
    valor: Number(Number(String(it?.valor ?? 0).replace(',', '.') || 0).toFixed(2)),
  }));
}

// ──────────────────────────────────────────────────────────────────────
// Tipos públicos
// ──────────────────────────────────────────────────────────────────────

export interface NormalizedEmissaoResult {
  id: string | null;
  codigoObjeto: string | null;
  uuidMarketplace?: string | null;
  pdfUrl?: string | null;
  pdfBase64?: string | null;
  frete: { valorTotal: number };
  origem: 'brhub' | 'marketplace';
  raw: any;
}

export class MarketplaceApiError extends Error {
  status: number;
  details?: string[];
  raw?: any;
  constructor(message: string, status: number, details?: string[], raw?: any) {
    super(message);
    this.name = 'MarketplaceApiError';
    this.status = status;
    this.details = details;
    this.raw = raw;
  }
}

function extractError(status: number, j: any, fallback: string): MarketplaceApiError {
  const message =
    j?.error ||
    j?.message ||
    (Array.isArray(j?.details) ? j.details.join(' | ') : null) ||
    fallback;
  const details = Array.isArray(j?.details) ? j.details : undefined;
  return new MarketplaceApiError(String(message), status, details, j);
}

// ──────────────────────────────────────────────────────────────────────
// Emissão  — POST /emissoes
// ──────────────────────────────────────────────────────────────────────

export async function emitirEtiquetaMarketplace(
  emissaoPayload: any,
): Promise<NormalizedEmissaoResult> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new MarketplaceApiError('Marketplace indisponível: credenciais ausentes', 502);

  const destinatario = normalizePessoa(emissaoPayload?.destinatario);
  const remetente = normalizePessoa(emissaoPayload?.remetente);
  const embalagem = normalizeEmbalagem(emissaoPayload?.embalagem);

  // Cotacao = objeto OPACO retornado por /frete/cotacao — não mexer no shape.
  const cotacao = { ...(emissaoPayload?.cotacao || {}) };
  // strip apenas campos internos nossos que não fazem parte do contrato
  delete cotacao.origem;
  delete cotacao.embalagem;
  delete cotacao.grupoRegraAplicada;
  delete cotacao.valorOriginalSemGrupo;
  delete cotacao.transportadora;
  delete cotacao.imagem;
  delete cotacao.isNotaFiscal;

  const codigoServico = trim(cotacao?.codigoServico || cotacao?.codigo);
  const isCorreios = /^0\d{4}$/.test(codigoServico);

  // Validação celular destinatário (v2.8)
  if (!destinatario?.celular) {
    throw new MarketplaceApiError(
      'destinatario.celular (ou telefone) é obrigatório — a transportadora não aceita envios sem telefone',
      400,
      ['destinatario.celular obrigatório'],
    );
  }

  // Validação NF (v2.3 + v3.0)
  const chaveNFe = digits(emissaoPayload?.chaveNFe);
  const numeroNotaFiscal = trim(emissaoPayload?.numeroNotaFiscal);
  const requerNF = carrierRequiresNF(codigoServico, cotacao?.requerNotaFiscal);
  const chaveNFeValida = isValidNFeAccessKey(chaveNFe);
  if (chaveNFe && chaveNFe.length === 44 && !chaveNFeValida) {
    console.warn('[MP] chaveNFe com 44 dígitos, mas DV inválido; emitindo como declaração quando permitido');
  }
  if (requerNF && (!chaveNFeValida || !numeroNotaFiscal)) {
    throw new MarketplaceApiError(
      `O serviço ${cotacao?.nomeServico || codigoServico} é operado por transportadora privada e exige Nota Fiscal.`,
      400,
      ['numeroNotaFiscal obrigatório', 'chaveNFe válida (44 dígitos com DV correto) obrigatória'],
    );
  }

  // numeroPedido (v2.9) — usado para reconciliação no painel da transportadora.
  // IMPORTANTE: quando omitido, a MP gera fallback "MKT-<uuid>" (>20 chars) que
  // estoura o campo `nf.numero` da Correios (max 20). Sempre forçamos um valor
  // curto (≤20 chars) — timestamp em base36 + sufixo aleatório.
  let numeroPedido = trim(
    emissaoPayload?.numeroPedido ||
    emissaoPayload?.pedido ||
    emissaoPayload?.codigoPedido ||
    '',
  ).slice(0, 20);
  if (!numeroPedido) {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    numeroPedido = `BRH${ts}${rnd}`.slice(0, 20);
  }

  // Correios sem NF deve seguir como declaração de conteúdo, mas sem campos
  // de NF/valor declarado. Se omitirmos a declaração, o upstream tenta montar
  // uma NF placeholder e o Correios rejeita com PPN-353.
  const temNFValida = chaveNFeValida && Boolean(numeroNotaFiscal);
  const valorDeclaradoRaw = Number(emissaoPayload?.valorDeclarado ?? 0) || 0;
  const itensDeclaracaoNormalizados = normalizeItens(emissaoPayload?.itensDeclaracaoConteudo);
  const deveEnviarNF = !isCorreios || temNFValida;
  const deveEnviarDeclaracaoConteudo = isCorreios && !temNFValida;
  const valorDeclaradoMp = deveEnviarNF && valorDeclaradoRaw > 0 ? valorDeclaradoRaw : undefined;

  const buildMpPayload = (override?: { valorDeclarado?: number; enviarItens?: boolean }) => {
    const enviarItens = override?.enviarItens ?? (deveEnviarNF || deveEnviarDeclaracaoConteudo);
    return cleanObject({
      remetenteId: emissaoPayload?.remetente ? undefined : emissaoPayload?.remetenteId,
      remetente: emissaoPayload?.remetente ? remetente : undefined,
      destinatario,
      embalagem,
      cotacao,
      valorDeclarado: override?.valorDeclarado ?? valorDeclaradoMp,
      itensDeclaracaoConteudo: enviarItens ? itensDeclaracaoNormalizados : undefined,
      chaveNFe: temNFValida ? chaveNFe : undefined,
      numeroNotaFiscal: temNFValida ? numeroNotaFiscal : undefined,
      numeroPedido: numeroPedido || undefined,
      logisticaReversa: emissaoPayload?.logisticaReversa === 'S' ? 'S' : undefined,
      cienteObjetoNaoProibido:
        emissaoPayload?.cienteObjetoNaoProibido === undefined
          ? true
          : Boolean(emissaoPayload.cienteObjetoNaoProibido),
    });
  };

  let mpPayload = buildMpPayload();

  console.log('[MP] POST /emissoes', JSON.stringify({
    codigoServico,
    nomeServico: cotacao?.nomeServico,
    requerNF,
    isCorreios,
    valorDeclarado: valorDeclaradoMp,
    enviaNF: deveEnviarNF,
    enviaDeclaracaoConteudo: deveEnviarDeclaracaoConteudo,
    temRemetenteId: Boolean(mpPayload.remetenteId),
    temRemetenteObj: Boolean(mpPayload.remetente),
    cep_dest: destinatario?.cep,
    peso_kg: embalagem.peso,
  }));

  const postEmissao = (payload: any) => fetch(`${MARKETPLACE_BASE}/emissoes`, {
    method: 'POST',
    headers: mpHeaders(auth),
    body: JSON.stringify(payload),
  });

  let r = await postEmissao(mpPayload);
  let text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }

  if ((!r.ok || j?.success === false) && isCorreios && !temNFValida && text.includes('PPN-353')) {
    console.warn('[MP] PPN-353 em Correios sem NF; retentando só com declaração, sem valor declarado/NF');
    mpPayload = buildMpPayload({ enviarItens: true });
    delete mpPayload.valorDeclarado;
    delete mpPayload.chaveNFe;
    delete mpPayload.numeroNotaFiscal;
    r = await postEmissao(mpPayload);
    text = await r.text();
    try { j = JSON.parse(text); } catch { j = { raw: text }; }
  }

  if (!r.ok || j?.success === false) {
    console.error('[MP] emissão falhou:', r.status, text.slice(0, 500));
    throw extractError(r.status, j, `Marketplace emissão falhou (${r.status})`);
  }

  // A MP pode aninhar a etiqueta em vários lugares: j.data, j.emissao,
  // j.data.emissao, j.etiqueta, j.result, etc. Procuramos recursivamente
  // pelos campos chave (uuidEmissao, codigoRastreio).
  const findFirst = (obj: any, keys: string[], depth = 0): any => {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') {
        const found = findFirst(v, keys, depth + 1);
        if (found) return found;
      }
    }
    return null;
  };

  const data = j?.data || j;
  const uuid = findFirst(j, ['uuidEmissao', 'uuid', 'id', 'uuidMarketplace']);
  const codigoRastreio = findFirst(j, ['codigoRastreio', 'codigoObjeto', 'tracking', 'codigoEtiqueta']);
  const pdfUrl = findFirst(j, ['pdfUrl', 'urlEtiqueta', 'linkEtiqueta', 'url']);
  const pdfBase64 = findFirst(j, ['pdfBase64', 'pdf_base64']);
  const valor = findFirst(j, ['valorTotal', 'preco', 'valor']);

  const result: NormalizedEmissaoResult = {
    id: uuid || codigoRastreio || null,
    codigoObjeto: codigoRastreio || null,
    uuidMarketplace: uuid || null,
    pdfUrl: pdfUrl || null,
    pdfBase64: typeof pdfBase64 === 'string' && pdfBase64.length > 100 ? pdfBase64 : null,
    frete: {
      valorTotal: Number(valor ?? cotacao?.valorTotal ?? cotacao?.preco ?? 0),
    },
    origem: 'marketplace',
    raw: j,
  };

  if (!result.id || !result.codigoObjeto) {
    // Resposta inesperada — logamos o JSON inteiro para mapear o shape real.
    console.error('[MP] emissão sem id/codigoRastreio — RAW:', JSON.stringify(j).slice(0, 1500));
  } else {
    console.log('[MP] emissão ok:', {
      id: result.id,
      codigoObjeto: result.codigoObjeto,
      valor: result.frete.valorTotal,
    });
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Rastreio  — GET /emissoes/status/{codigo}
// ──────────────────────────────────────────────────────────────────────

export async function rastrearMarketplace(codigoObjeto: string): Promise<any> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new MarketplaceApiError('Marketplace indisponível', 502);

  const r = await fetch(
    `${MARKETPLACE_BASE}/emissoes/status/${encodeURIComponent(codigoObjeto)}`,
    { headers: mpHeaders(auth) },
  );
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok || j?.success === false) {
    console.error('[MP] rastreio falhou:', r.status, text.slice(0, 300));
    throw extractError(r.status, j, `Marketplace rastreio falhou (${r.status})`);
  }
  const data = j?.data || j?.rastreio || j;
  return {
    codigoObjeto,
    status: data?.status || null,
    statusDescricao: data?.statusDescricao || null,
    transportadora: data?.transportadora || null,     // v3.1
    formatoCodigo: data?.formatoCodigo || null,        // v3.1
    fonteStatus: data?.fonteStatus || null,            // v3.1
    dataPrevisaoEntrega: data?.dataPrevisaoEntrega || data?.previsao || null,
    servico: data?.servico || data?.nomeServico || null,
    eventos: data?.eventos || data?.historico || [],
    ultimaAtualizacao: data?.ultimaAtualizacao || null,
    origem: 'marketplace',
    raw: j,
  };
}

// ──────────────────────────────────────────────────────────────────────
// PDF da etiqueta — GET /emissoes/etiqueta/pdf/{uuid}
// ──────────────────────────────────────────────────────────────────────

export async function getPdfEtiquetaMarketplace(
  uuidMarketplace: string,
): Promise<{ nome: string; dados: string }> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new MarketplaceApiError('Marketplace indisponível', 502);

  const r = await fetch(
    `${MARKETPLACE_BASE}/emissoes/etiqueta/pdf/${encodeURIComponent(uuidMarketplace)}`,
    { headers: mpHeaders(auth) },
  );
  if (!r.ok) {
    const t = await r.text();
    console.error('[MP] pdf etiqueta falhou:', r.status, t.slice(0, 300));
    let j: any; try { j = JSON.parse(t); } catch { /* noop */ }
    throw extractError(r.status, j, `Marketplace PDF falhou (${r.status})`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/pdf')) {
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { nome: `etiqueta_${uuidMarketplace}.pdf`, dados: btoa(bin) };
  }
  const j = await r.json();
  const findFirst = (obj: any, keys: string[], depth = 0): any => {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    for (const k of keys) if (obj[k]) return obj[k];
    for (const v of Object.values(obj)) {
      const found = findFirst(v, keys, depth + 1);
      if (found) return found;
    }
    return null;
  };
  let dados = findFirst(j, ['dados', 'pdf', 'base64', 'pdfBase64']);
  const url = findFirst(j, ['url', 'pdfUrl', 'urlEtiqueta', 'linkEtiqueta']);
  const nome = j?.data?.nome || j?.nome || `etiqueta_${uuidMarketplace}.pdf`;
  if (!dados && typeof url === 'string') {
    const pdfResp = await fetch(url);
    const buf = new Uint8Array(await pdfResp.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    dados = btoa(bin);
  }
  if (!dados && j?.labelData) {
    const label = j.labelData;
    const stripUnit = (v: any) => String(v ?? '').replace(/\s*(kg|g|cm|mm)\s*/gi, '').trim();
    const weight = stripUnit(label.weight ?? label.measures?.weight);
    const dimensions = stripUnit(label.dimensions
      || [label.measures?.length, label.measures?.width, label.measures?.height].filter(Boolean).join('x'));
    const trackingCode = label.trackingCode || j?.codigoRastreio || uuidMarketplace;
    const declarationItems = (label.declaration?.items || []).map((it: any) => ({
      descricao: it.conteudo ?? it.descricao ?? it.description ?? it.name ?? it.produto ?? 'Mercadoria',
      quantidade: Number(it.quantidade ?? it.quantity ?? it.qty ?? 1),
      valor: Number(it.valor ?? it.value ?? it.unitValue ?? it.price ?? 0),
    }));
    const senderCityState = label.senderCityState
      || [label.sender?.cidade, label.sender?.uf].filter(Boolean).join('/');
    const recipientCityState = label.recipientCityState
      || [label.recipient?.cidade, label.recipient?.uf].filter(Boolean).join('/');

    const { buildMarketplaceLabelPdf, uint8ToBase64 } = await import('./marketplace-pdf.ts');
    const bytes = await buildMarketplaceLabelPdf({
      trackingCode,
      serviceName: label.serviceName || label.service || 'BRHUB SEDEX',
      serviceCode: label.serviceCode || '',
      contract: label.contract || label.contrato || j?.contrato || j?.contractId || '',
      orderId: label.orderId || label.pedido || j?.pedido || '',
      volume: label.volume || '1/1',
      weight,
      dimensions,
      sender: {
        name: label.senderName || label.sender?.nome || '',
        cpfCnpj: label.senderCpfCnpj || label.sender?.cpfCnpj || '',
        address: label.senderAddress
          || [label.sender?.logradouro, label.sender?.numero].filter(Boolean).join(', '),
        neighborhood: label.senderNeighborhood || label.sender?.bairro || '',
        cityState: senderCityState,
        cep: label.senderCep || label.sender?.cep || '',
        phone: label.senderPhone || label.sender?.celular || '',
      },
      recipient: {
        name: label.recipientName || label.recipient?.nome || '',
        cpfCnpj: label.recipientCpfCnpj || label.recipient?.cpfCnpj || '',
        address: label.recipientAddress
          || [label.recipient?.logradouro, label.recipient?.numero].filter(Boolean).join(', '),
        neighborhood: label.recipientNeighborhood || label.recipient?.bairro || '',
        cityState: recipientCityState,
        cep: label.recipientCep || label.recipient?.cep || '',
        phone: label.recipientPhone || label.recipient?.celular || '',
      },
      items: declarationItems,
    });
    dados = uint8ToBase64(bytes);
  }
  if (!dados) console.error('[MP] pdf resposta sem dados — RAW:', JSON.stringify(j).slice(0, 1000));
  if (!dados) throw new MarketplaceApiError('Marketplace PDF: resposta sem dados', 502);
  return { nome, dados };
}

// ──────────────────────────────────────────────────────────────────────
// Cancelamento — DELETE /emissoes/{uuid}/cancelar
// ──────────────────────────────────────────────────────────────────────

export async function cancelarEmissaoMarketplace(
  uuidMarketplace: string,
  motivo: string,
): Promise<any> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new MarketplaceApiError('Marketplace indisponível', 502);

  const r = await fetch(
    `${MARKETPLACE_BASE}/emissoes/${encodeURIComponent(uuidMarketplace)}/cancelar`,
    {
      method: 'DELETE',
      headers: mpHeaders(auth),
      body: JSON.stringify({ motivo }),
    },
  );
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok || j?.success === false) {
    console.error('[MP] cancelamento falhou:', r.status, text.slice(0, 300));
    throw extractError(r.status, j, `Marketplace cancelamento falhou (${r.status})`);
  }
  return j;
}

// ──────────────────────────────────────────────────────────────────────
// Reversa — POST /emissoes/reversa
// ──────────────────────────────────────────────────────────────────────

/**
 * Para logística reversa: `remetente` = cliente final (origem),
 * `destinatario` = sua loja (destino). A API resolve o sentido automaticamente.
 * Não enviamos `reverse: true` top-level (removido em v2.9).
 */
export async function criarReversaMarketplace(emissaoPayload: any): Promise<any> {
  const auth = await getMarketplaceAuth();
  if (!auth) throw new MarketplaceApiError('Marketplace indisponível', 502);

  const destinatario = normalizePessoa(emissaoPayload?.destinatario);
  const remetente = normalizePessoa(emissaoPayload?.remetente);
  const embalagem = normalizeEmbalagem(emissaoPayload?.embalagem);
  const cotacao = { ...(emissaoPayload?.cotacao || {}) };
  delete cotacao.origem;
  delete cotacao.isNotaFiscal;

  if (!destinatario?.celular) {
    throw new MarketplaceApiError(
      'destinatario.celular é obrigatório',
      400,
      ['destinatario.celular obrigatório'],
    );
  }

  const chaveNFe = digits(emissaoPayload?.chaveNFe);
  const numeroNotaFiscal = trim(emissaoPayload?.numeroNotaFiscal);
  let numeroPedido = trim(emissaoPayload?.numeroPedido || emissaoPayload?.pedido || '').slice(0, 20);
  if (!numeroPedido) {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    numeroPedido = `BRR${ts}${rnd}`.slice(0, 20);
  }

  const body = cleanObject({
    remetenteId: emissaoPayload?.remetenteId,
    remetente: emissaoPayload?.remetenteId ? undefined : remetente,
    destinatario,
    embalagem,
    cotacao,
    valorDeclarado: Number(emissaoPayload?.valorDeclarado ?? 0) || 0,
    itensDeclaracaoConteudo: normalizeItens(emissaoPayload?.itensDeclaracaoConteudo),
    chaveNFe: chaveNFe.length === 44 ? chaveNFe : undefined,
    numeroNotaFiscal: numeroNotaFiscal || undefined,
    numeroPedido: numeroPedido || undefined,
    cienteObjetoNaoProibido:
      emissaoPayload?.cienteObjetoNaoProibido === undefined
        ? true
        : Boolean(emissaoPayload.cienteObjetoNaoProibido),
  });

  const r = await fetch(`${MARKETPLACE_BASE}/emissoes/reversa`, {
    method: 'POST',
    headers: mpHeaders(auth),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok || j?.success === false) {
    console.error('[MP] reversa falhou:', r.status, text.slice(0, 300));
    throw extractError(r.status, j, `Marketplace reversa falhou (${r.status})`);
  }
  return j?.data || j;
}
