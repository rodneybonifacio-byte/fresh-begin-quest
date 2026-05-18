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
  if (requerNF && (chaveNFe.length !== 44 || !numeroNotaFiscal)) {
    throw new MarketplaceApiError(
      `O serviço ${cotacao?.nomeServico || codigoServico} é operado por transportadora privada e exige Nota Fiscal.`,
      400,
      ['numeroNotaFiscal obrigatório', 'chaveNFe (44 dígitos) obrigatória'],
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

  // valorDeclarado só pode ser enviado quando há NF válida (chaveNFe 44 dígitos).
  // Sem NF, o Correios devolve PPN-353 ("Chave NFe inválida") porque a MP
  // tenta preencher o campo nf.chaveNFe com placeholder. Quando omitimos,
  // a MP usa o preço do frete como fallback (mínimo R$ 1,00) — v2.1.
  const temNFValida = chaveNFe.length === 44 && Boolean(numeroNotaFiscal);
  const valorDeclaradoRaw = Number(emissaoPayload?.valorDeclarado ?? 0) || 0;

  const mpPayload = cleanObject({
    remetenteId: emissaoPayload?.remetenteId,
    remetente: emissaoPayload?.remetenteId ? undefined : remetente,
    destinatario,
    embalagem,
    cotacao,
    valorDeclarado: temNFValida && valorDeclaradoRaw > 0 ? valorDeclaradoRaw : undefined,
    itensDeclaracaoConteudo: normalizeItens(emissaoPayload?.itensDeclaracaoConteudo),
    chaveNFe: temNFValida ? chaveNFe : undefined,
    numeroNotaFiscal: temNFValida ? numeroNotaFiscal : undefined,
    numeroPedido: numeroPedido || undefined,
    logisticaReversa: emissaoPayload?.logisticaReversa === 'S' ? 'S' : undefined,
    cienteObjetoNaoProibido:
      emissaoPayload?.cienteObjetoNaoProibido === undefined
        ? true
        : Boolean(emissaoPayload.cienteObjetoNaoProibido),
  });

  console.log('[MP] POST /emissoes', JSON.stringify({
    codigoServico,
    nomeServico: cotacao?.nomeServico,
    requerNF,
    temRemetenteId: Boolean(mpPayload.remetenteId),
    temRemetenteObj: Boolean(mpPayload.remetente),
    cep_dest: destinatario?.cep,
    peso_kg: embalagem.peso,
  }));

  const r = await fetch(`${MARKETPLACE_BASE}/emissoes`, {
    method: 'POST',
    headers: mpHeaders(auth),
    body: JSON.stringify(mpPayload),
  });
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }

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
  const valor = findFirst(j, ['valorTotal', 'preco', 'valor']);

  const result: NormalizedEmissaoResult = {
    id: uuid || codigoRastreio || null,
    codigoObjeto: codigoRastreio || null,
    uuidMarketplace: uuid || null,
    pdfUrl: pdfUrl || null,
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
    // v3.2: prefere shape FLAT (senderName/recipientName/…); fallback p/ nested
    const senderName = label.senderName || label.sender?.nome || '';
    const senderAddress = label.senderAddress
      || [label.sender?.logradouro, label.sender?.numero, label.sender?.bairro].filter(Boolean).join(', ');
    const senderCityState = label.senderCityState
      || [label.sender?.cidade, label.sender?.uf].filter(Boolean).join('/');
    const senderCep = label.senderCep || label.sender?.cep || '';
    const recipientName = label.recipientName || label.recipient?.nome || '';
    const recipientAddress = label.recipientAddress
      || [label.recipient?.logradouro, label.recipient?.numero].filter(Boolean).join(', ');
    const recipientNeighborhood = label.recipientNeighborhood || label.recipient?.bairro || '';
    const recipientCityState = label.recipientCityState
      || [label.recipient?.cidade, label.recipient?.uf].filter(Boolean).join('/');
    const recipientCep = label.recipientCep || label.recipient?.cep || '';
    const recipientPhone = label.recipientPhone || label.recipient?.celular || '';
    const weight = label.weight ?? label.measures?.weight ?? '';
    const dimensions = label.dimensions
      || [label.measures?.length, label.measures?.width, label.measures?.height].filter(Boolean).join('x');
    const serviceName = label.serviceName || label.service || '';
    const serviceCode = label.serviceCode || '';
    const trackingCode = label.trackingCode || j?.codigoRastreio || uuidMarketplace;
    const declarationItems = label.declaration?.items || [];
    const totalValue = label.declaration?.totalValue ?? label.value?.price ?? '';

    const escapePdf = (v: any) => String(v ?? '').replace(/[\\()]/g, '\\$&');
    const lines = [
      'BRHUB ENVIOS - ETIQUETA',
      `Codigo: ${trackingCode}`,
      `Servico: ${serviceName} ${serviceCode}`.trim(),
      '',
      'REMETENTE',
      senderName,
      senderAddress,
      `${senderCityState} CEP ${senderCep}`,
      '',
      'DESTINATARIO',
      recipientName,
      `${recipientAddress} - ${recipientNeighborhood}`,
      `${recipientCityState} CEP ${recipientCep}`,
      `Telefone: ${recipientPhone}`,
      '',
      'DECLARACAO DE CONTEUDO',
      ...declarationItems.map((it: any) => `${it.quantidade}x ${it.conteudo} - R$ ${it.valor}`),
      '',
      `Peso: ${weight}kg | ${dimensions}cm`,
      `Valor declarado: R$ ${totalValue}`,
    ].filter((line) => line !== undefined && line !== null && line !== '');
    const text = lines.map((line, idx) => `${idx === 0 ? 'BT /F1 16 Tf 50 790 Td' : '0 -22 Td'} (${escapePdf(line)}) Tj`).join('\n') + '\nET';
    const pdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${text.length} >> stream\n${text}\nendstream endobj\nxref\n0 6\n0000000000 65535 f \ntrailer << /Root 1 0 R /Size 6 >>\nstartxref\n0\n%%EOF`;
    dados = btoa(pdf);
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
