import { getMarketplaceAuth, MARKETPLACE_BASE } from '../_shared/marketplace.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await getMarketplaceAuth();
  if (!auth) return new Response('{"error":"no auth"}', { status: 500 });
  const url = new URL(req.url);
  let body: any = {};
  try { body = await req.clone().json(); } catch (_) { /* noop */ }
  if (url.searchParams.get('mode') === 'docs' || body?.mode === 'docs') {
    const docs: Record<string, any> = {};
    for (const path of ['/docs', '/openapi.json', '/swagger.json']) {
      const resp = await fetch(`${MARKETPLACE_BASE}${path}`, {
        headers: { 'x-api-key': auth.apiKey, Authorization: `Bearer ${auth.token}` },
      });
      const text = await resp.text();
      docs[path] = { status: resp.status, contentType: resp.headers.get('content-type'), body: text.slice(0, 12000) };
    }
    return new Response(JSON.stringify(docs, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const embalagem = { altura: 15, largura: 20, comprimento: 25, peso: 500, diametro: 0 };
  const cepOrigem = '02076040';
  const cepDestino = '03027000';

  // 1) Cotar e pegar uma cotacao real
  const rCot = await fetch(`${MARKETPLACE_BASE}/frete/cotacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify({ cepOrigem, cepDestino, embalagem, valorDeclarado: 50 }),
  });
  const cotJson = await rCot.json();
  const cotacaoEscolhida = (cotJson?.cotacoes || []).find((c: any) => c.codigoServico === 'nextdayhub')
    || (cotJson?.cotacoes || [])[0];

  // 2) Payload mínimo conforme doc v2.2
  const remetente = {
    nome: 'BRHUB TESTES',
    cpfCnpj: '11144477735',
    celular: '11999999999',
    email: 'teste@brhub.com',
    endereco: { cep: cepOrigem, logradouro: 'Rua Voluntários da Pátria', numero: '4234', complemento: '', bairro: 'Mandaqui', localidade: 'São Paulo', uf: 'SP' },
  };
  const destinatario = {
    nome: 'Rodney Bonifacio',
    cpfCnpj: '22571976826',
    celular: '11911544095',
    email: 'rodney@brhub.com',
    endereco: { cep: cepDestino, logradouro: 'Rua dos Xavantes', numero: '718', complemento: 'Sala 120', bairro: 'Brás', localidade: 'São Paulo', uf: 'SP' },
  };

  const payload = {
    remetente,
    destinatario,
    embalagem,
    cotacao: cotacaoEscolhida,
    valorDeclarado: 50,
    itensDeclaracaoConteudo: [{ conteudo: 'Camiseta', quantidade: '1', valor: '50.00' }],
    cienteObjetoNaoProibido: true,
    logisticaReversa: 'N',
  };

  const r = await fetch(`${MARKETPLACE_BASE}/emissoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  return new Response(JSON.stringify({ status: r.status, body: text.slice(0, 2000), cotacaoUsada: cotacaoEscolhida, payload }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
