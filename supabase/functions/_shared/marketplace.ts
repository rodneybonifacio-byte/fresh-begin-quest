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
  const endereco = pessoa?.endereco || pessoa || {};
  const cep = digits(endereco?.cep || pessoa?.cep);
  const cidade = String(endereco?.cidade || endereco?.localidade || pessoa?.cidade || pessoa?.localidade || '').trim();
  return {
    nome: String(pessoa?.nome || '').trim(),
    cpfCnpj: digits(pessoa?.cpfCnpj || pessoa?.cpf_cnpj),
    documentoEstrangeiro: pessoa?.documentoEstrangeiro || pessoa?.documento_estrangeiro || '',
    celular: digits(pessoa?.celular || pessoa?.telefone || ''),
    telefone: digits(pessoa?.telefone || pessoa?.celular || ''),
    email: String(pessoa?.email || '').trim(),
    cep,
    logradouro: String(endereco?.logradouro || pessoa?.logradouro || '').trim(),
    numero: String(endereco?.numero || pessoa?.numero || '').trim(),
    complemento: String(endereco?.complemento || pessoa?.complemento || '').trim(),
    bairro: String(endereco?.bairro || pessoa?.bairro || '').trim(),
    cidade,
    localidade: cidade,
    uf: String(endereco?.uf || pessoa?.uf || '').trim().toUpperCase(),
  };
};

async function refreshMarketplaceCotacao(auth: { apiKey: string; token: string }, emissaoPayload: any, remetenteObj: any): Promise<any> {
  const cotacaoAtual = emissaoPayload?.cotacao || {};
  const cepOrigem = digits(remetenteObj?.endereco?.cep || emissaoPayload?.cepOrigem);
  const cepDestino = digits(emissaoPayload?.destinatario?.endereco?.cep || emissaoPayload?.cepDestino);

  if (!cepOrigem || !cepDestino || !emissaoPayload?.embalagem) return cotacaoAtual;

  try {
    const r = await fetch(`${MARKETPLACE_BASE}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': auth.apiKey,
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        cepOrigem,
        cepDestino,
        embalagem: normalizeMarketplaceEmbalagem(emissaoPayload.embalagem),
        valorDeclarado: emissaoPayload?.valorDeclarado ?? 0,
      }),
    });
    const j = await r.json();
    const cotacoes = Array.isArray(j?.cotacoes) ? j.cotacoes : [];
    if (!r.ok || !cotacoes.length) {
      console.warn('[MP] recotação não retornou opções:', r.status, JSON.stringify(j).slice(0, 300));
      return cotacaoAtual;
    }

    const codigo = String(cotacaoAtual?.codigoServico || '').trim();
    const nome = normalizeText(cotacaoAtual?.nomeServico);
    const isRapido = nome.includes('RAPIDO') || nome.includes('EXPRESSO');
    const isSameDay = nome.includes('SAME DAY');
    const isNextDay = nome.includes('NEXT DAY');
    const isEcoMini = nome.includes('ECON') && nome.includes('MINI');
    const isEco = nome.includes('ECON') && !nome.includes('MINI');

    const escolhida = cotacoes.find((c: any) => String(c?.codigoServico || '') === codigo)
      || cotacoes.find((c: any) => isRapido && (normalizeText(c?.nomeServico).includes('RAPIDO') || normalizeText(c?.nomeServico).includes('EXPRESSO')))
      || cotacoes.find((c: any) => isSameDay && normalizeText(c?.nomeServico).includes('SAME DAY'))
      || cotacoes.find((c: any) => isNextDay && normalizeText(c?.nomeServico).includes('NEXT DAY'))
      || cotacoes.find((c: any) => isEcoMini && normalizeText(c?.nomeServico).includes('MINI'))
      || cotacoes.find((c: any) => isEco && normalizeText(c?.nomeServico).includes('ECON'))
      || cotacoes[0];

    console.log('[MP] cotação hidratada antes da emissão:', {
      codigoAtual: codigo,
      codigoEscolhido: escolhida?.codigoServico,
      temCardpost: Boolean(escolhida?.cardpost),
      temId: Boolean(escolhida?.id),
    });

    // Trim para evitar campos longos (ex: imagem URL) que a API v2.2 rejeita como "nota inválida"
    return {
      id: escolhida?.id ?? cotacaoAtual?.id,
      codigoServico: escolhida?.codigoServico ?? cotacaoAtual?.codigoServico,
      cardpost: escolhida?.cardpost ?? cotacaoAtual?.cardpost,
      customerId: escolhida?.customerId ?? cotacaoAtual?.customerId,
      preco: escolhida?.preco ?? cotacaoAtual?.preco,
      prazo: escolhida?.prazo ?? cotacaoAtual?.prazo,
    };
  } catch (e: any) {
    console.warn('[MP] erro na recotação antes da emissão:', e?.message);
    return cotacaoAtual;
  }
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

  // Hidratar objeto remetente a partir do remetenteId (Supabase) quando necessário
  let remetenteObj: any = emissaoPayload?.remetente;
  if (!remetenteObj && emissaoPayload?.remetenteId) {
    try {
      // @ts-ignore - Deno global
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      // @ts-ignore
      const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
      const { data: rem } = await sb.from('remetentes').select('*').eq('id', emissaoPayload.remetenteId).maybeSingle();
      if (rem) {
        remetenteObj = {
          nome: rem.nome?.trim(),
          cpfCnpj: digits(rem.cpf_cnpj),
          documentoEstrangeiro: rem.documento_estrangeiro || '',
          celular: digits(rem.celular || rem.telefone || ''),
          telefone: digits(rem.telefone || rem.celular || ''),
          email: rem.email?.trim() || '',
          endereco: {
            cep: digits(rem.cep),
            logradouro: rem.logradouro?.trim() || '',
            numero: rem.numero?.trim() || '',
            complemento: rem.complemento?.trim() || '',
            bairro: rem.bairro?.trim() || '',
            localidade: rem.localidade?.trim() || '',
            uf: rem.uf?.trim() || '',
          },
        };
        console.log('[MP] remetente hidratado do Supabase:', rem.nome);
      } else {
        console.warn('[MP] remetenteId não encontrado no Supabase:', emissaoPayload.remetenteId);
      }
    } catch (e: any) {
      console.error('[MP] erro hidratando remetente:', e?.message);
    }
  }

  const remetenteMarketplace = normalizeMarketplacePessoa(remetenteObj);
  const destinatarioMarketplace = normalizeMarketplacePessoa(emissaoPayload?.destinatario);
  const embalagemMarketplace = normalizeMarketplaceEmbalagem(emissaoPayload?.embalagem);
  const cotacaoObj = await refreshMarketplaceCotacao(auth, emissaoPayload, remetenteObj);
  const itensDeclaracaoConteudo = Array.isArray(emissaoPayload?.itensDeclaracaoConteudo)
    ? emissaoPayload.itensDeclaracaoConteudo.map((item: any) => ({
        descricao: String(item?.descricao || item?.conteudo || 'Mercadoria').trim(),
        conteudo: String(item?.conteudo || item?.descricao || 'Mercadoria').trim(),
        quantidade: Number(item?.quantidade || 1),
        valor: Number(String(item?.valor || 0).replace(',', '.')),
      }))
    : emissaoPayload?.itensDeclaracaoConteudo;

  // Payload conforme doc oficial v2.2 — POST /emissoes
  const mpPayload: any = {
    remetente: remetenteMarketplace,
    destinatario: destinatarioMarketplace,
    embalagem: embalagemMarketplace,
    cotacao: cotacaoObj,
    valorDeclarado: emissaoPayload?.valorDeclarado ?? 0,
    valorNotaFiscal: emissaoPayload?.valorNotaFiscal ?? 0,
    itensDeclaracaoConteudo,
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
