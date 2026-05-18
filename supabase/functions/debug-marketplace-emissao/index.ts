import { getMarketplaceAuth, MARKETPLACE_BASE } from '../_shared/marketplace.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await getMarketplaceAuth();
  if (!auth) return new Response('{"error":"no auth"}', { status: 500 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'cotar';

  if (action === 'cotar') {
    const r = await fetch(`${MARKETPLACE_BASE}/frete/cotacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        cepOrigem: '02076040', cepDestino: '03027000',
        embalagem: { altura: 15, largura: 20, comprimento: 25, peso: 500, diametro: 0 },
        valorDeclarado: 50,
      }),
    });
    const text = await r.text();
    return new Response(JSON.stringify({ status: r.status, body: text.slice(0, 3000) }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // action=emitir&servico=xxx
  const codigoServico = url.searchParams.get('servico') || 'nextdayhub';
  const endereco = (cep: string, log: string, num: string, comp: string, bairro: string, loc = 'São Paulo', uf = 'SP') => ({
    cep, logradouro: log, numero: num, complemento: comp, bairro, localidade: loc, uf,
  });
  const sender = {
    nome: 'BRHUB TESTES', cpfCnpj: '11144477735', celular: '11999999999', email: 'teste@brhub.com',
    endereco: endereco('02076040', 'Rua Voluntários da Pátria', '4234', '', 'Mandaqui'),
  };
  const destinatario = {
    nome: 'Rodney Bonifacio', cpfCnpj: '22571976826', celular: '11911544095', email: 'rodney@brhub.com',
    endereco: endereco('03027000', 'Rua dos Xavantes', '718', 'Sala 120', 'Brás'),
  };
  const payload = {
    cotacao: { codigoServico, nomeServico: 'TESTE', preco: '15.00', valorTotal: '15.00', valor: '15.00', prazo: 2 },
    sender, remetente: sender,
    contact: destinatario, destinatario, recipient: destinatario,
    delivery: { cepOrigem: '02076040', cepDestino: '03027000', embalagem: { altura: 15, largura: 20, comprimento: 25, peso: 500, diametro: 0 } },
    embalagem: { altura: 15, largura: 20, comprimento: 25, peso: 500, diametro: 0 },
    cepOrigem: '02076040', cepDestino: '03027000',
    valorDeclarado: 50, valorNotaFiscal: 0,
    itensDeclaracaoConteudo: [{ conteudo: 'Camiseta', quantidade: '1', valor: '50.00' }],
    logisticaReversa: 'N', cienteObjetoNaoProibido: true,
    observacao: 'TESTE INTEGRACAO',
  };
  const r = await fetch(`${MARKETPLACE_BASE}/emissoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  return new Response(JSON.stringify({ status: r.status, body: text.slice(0, 3000), enviado: payload }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
