import { getMarketplaceAuth, MARKETPLACE_BASE } from '../_shared/marketplace.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await getMarketplaceAuth();
  if (!auth) return new Response('{"error":"no auth"}', { status: 500 });

  const endereco = (cep: string, log: string, num: string, comp: string, bairro: string) => ({
    cep, logradouro: log, numero: num, complemento: comp, bairro, localidade: 'São Paulo', uf: 'SP',
  });
  const sender = {
    nome: 'TESTE EMISSOR', cpfCnpj: '11144477735', celular: '11999999999', email: 'teste@teste.com',
    endereco: endereco('02076040', 'Rua A', '1', '', 'X'),
  };
  const destinatario = {
    nome: 'RODNEY BONIFACIO', cpfCnpj: '22571976826', celular: '11911544095', email: 'r@r.com',
    endereco: endereco('03027000', 'Rua Xavantes', '718', 'Sala 120', 'Brás'),
  };
  const base = {
    cotacao: { codigoServico: 'nextdayhub', nomeServico: 'BRHUB NEXT DAY', preco: '10.92', valorTotal: '10.92', valor: '10.92', prazo: 1 },
    sender, remetente: sender,
    contact: destinatario, destinatario, recipient: destinatario,
    delivery: {
      cepOrigem: '02076040', cepDestino: '03027000',
      embalagem: { altura: 30, largura: 30, comprimento: 30, peso: 500, diametro: 0 },
    },
    embalagem: { altura: 30, largura: 30, comprimento: 30, peso: 500, diametro: 0 },
    cepOrigem: '02076040', cepDestino: '03027000',
    valorDeclarado: 20,
    itensDeclaracaoConteudo: [{ conteudo: 'calca', quantidade: '1', valor: '20.00' }],
  };

  const r = await fetch(`${MARKETPLACE_BASE}/emissoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, 'Authorization': `Bearer ${auth.token}` },
    body: JSON.stringify(base),
  });
  const text = await r.text();
  return new Response(JSON.stringify({ status: r.status, body: text.slice(0, 1500) }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
