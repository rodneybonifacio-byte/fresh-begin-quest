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

const digits = (s: any) => String(s || '').replace(/\D/g, '');
const normalizeText = (s: any) => String(s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();

const normalizeMarketplaceEmbalagem = (embalagem: any) => {
  const peso = Number(embalagem?.peso ?? 0);
  return {
    peso: peso > 30 ? peso / 1000 : peso,
    altura: Number(embalagem?.altura ?? 2),
    largura: Number(embalagem?.largura ?? 11),
    comprimento: Number(embalagem?.comprimento ?? 16),
    diametro: Number(embalagem?.diametro ?? 0),
  };
};

const normalizeMarketplacePessoa = (pessoa: any) => {
  if (!pessoa) return undefined;
  const endereco = pessoa?.endereco || {};
  const cep = digits(endereco?.cep || pessoa?.cep);
  const cidade = String(endereco?.cidade || endereco?.localidade || pessoa?.cidade || pessoa?.localidade || '').trim();
  return {
    nome: String(pessoa?.nome || '').trim(),
    cpfCnpj: digits(pessoa?.cpfCnpj || pessoa?.cpf_cnpj),
    celular: digits(pessoa?.celular || pessoa?.telefone || ''),
    email: String(pessoa?.email || '').trim(),
    endereco: {
      cep,
      logradouro: String(endereco?.logradouro || pessoa?.logradouro || '').trim(),
      numero: String(endereco?.numero || pessoa?.numero || '').trim(),
      complemento: String(endereco?.complemento || pessoa?.complemento || '').trim(),
      bairro: String(endereco?.bairro || pessoa?.bairro || '').trim(),
      cidade,
      uf: String(endereco?.uf || pessoa?.uf || '').trim().toUpperCase(),
    },
  };
};

const cleanObject = (obj: Record<string, any>) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const normalizeMarketplaceItem = (item: any) => {
  const quantidade = Math.max(1, Math.trunc(Number(item?.quantidade || 1) || 1));
  const valor = Number(String(item?.valor ?? 0).replace(',', '.')) || 0;
  const conteudo = String(item?.conteudo || item?.descricao || 'Mercadoria').trim().slice(0, 50);
  return { conteudo, quantidade, valor: Number(valor.toFixed(2)) };
};

/**
 * Emite uma etiqueta via API Marketplace (POST /emissoes).
 * Contrato oficial v2.2: remetenteId|remetente, destinatario, embalagem, cotacao.
 * O servidor resolve customerId/cardpost e CEP de origem internamente.
 */
export async function emitirEtiquetaMarketplace(
  emissaoPayload: any
): Promise<NormalizedEmissaoResult> {
  const auth = await getMarketplaceAuth();
  if (!auth) {
    throw new Error('Marketplace indisponível: credenciais ausentes');
  }

  const destinatario = normalizeMarketplacePessoa(emissaoPayload?.destinatario);
  const remetente = normalizeMarketplacePessoa(emissaoPayload?.remetente);

  const pesoBruto = Number(emissaoPayload?.embalagem?.peso ?? 0);
  const embalagem = {
    peso: pesoBruto > 30 ? pesoBruto / 1000 : pesoBruto,
    altura: Number(emissaoPayload?.embalagem?.altura ?? 2),
    largura: Number(emissaoPayload?.embalagem?.largura ?? 11),
    comprimento: Number(emissaoPayload?.embalagem?.comprimento ?? 16),
    diametro: Number(emissaoPayload?.embalagem?.diametro ?? 0),
  };

  // Preserva campos opacos da cotação (id, cardpost, codigoServico, preco, prazo…) intactos.
  const cotacao = { ...(emissaoPayload?.cotacao || {}) };
  delete cotacao.origem;
  delete cotacao.embalagem;
  delete cotacao.grupoRegraAplicada;
  delete cotacao.valorOriginalSemGrupo;

  const itensDeclaracaoConteudo = Array.isArray(emissaoPayload?.itensDeclaracaoConteudo)
    ? emissaoPayload.itensDeclaracaoConteudo.map(normalizeMarketplaceItem)
    : undefined;

  const chaveNFe = digits(emissaoPayload?.chaveNFe);
  const numeroNotaFiscal = String(emissaoPayload?.numeroNotaFiscal || '').trim();

  // v2.3: SAME DAY / NEXT DAY / HOT 3HORAS exigem NF (validação local antes de chamar a API)
  const requerNF = cotacao?.requerNotaFiscal === true;
  if (requerNF && (chaveNFe.length !== 44 || !numeroNotaFiscal)) {
    throw new Error(
      `O serviço ${cotacao?.nomeServico || cotacao?.codigoServico} exige Nota Fiscal: informe numeroNotaFiscal e chaveNFe (44 dígitos).`
    );
  }

  // Payload conforme doc oficial v2.3 — POST /emissoes

  const mpPayload: any = cleanObject({
    remetenteId: emissaoPayload?.remetenteId,
    remetente,
    destinatario,
    embalagem,
    cotacao,
    valorDeclarado: Number(emissaoPayload?.valorDeclarado ?? 0),
    itensDeclaracaoConteudo,
    logisticaReversa: emissaoPayload?.logisticaReversa ?? 'N',
    cienteObjetoNaoProibido: emissaoPayload?.cienteObjetoNaoProibido ?? true,
    chaveNFe: chaveNFe.length === 44 ? chaveNFe : undefined,
    numeroNotaFiscal: emissaoPayload?.numeroNotaFiscal || undefined,
    observacao: emissaoPayload?.observacao || undefined,
  });

  console.log('[MP] POST /emissoes', JSON.stringify({
    codigoServico: cotacao?.codigoServico,
    nomeServico: cotacao?.nomeServico,
    usandoRemetenteId: Boolean(mpPayload.remetenteId),
    temRemetenteObj: Boolean(remetente),
    cepDestino: destinatario?.endereco?.cep,
  }));

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
          emissaoPayload?.cotacao?.preco ??
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
