// Debug: probe endpoints de emissão do Marketplace
import { getMarketplaceAuth, MARKETPLACE_BASE } from '../_shared/marketplace.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await getMarketplaceAuth();
  if (!auth) return new Response(JSON.stringify({ error: 'no auth' }), { status: 500, headers: corsHeaders });

  const payload = {
    codigoServico: 'nextdayhub',
    cepOrigem: '02076040',
    cepDestino: '03027000',
    embalagem: { altura: 30, largura: 30, comprimento: 30, peso: 500, diametro: 0 },
    valorDeclarado: 20,
    remetente: {
      nomeRemetente: 'TESTE', cpfCnpjRemetente: '11111111111', celularRemetente: '11999999999',
      endereco: { cep: '02076040', logradouro: 'Rua A', numero: '1', bairro: 'X', localidade: 'São Paulo', uf: 'SP' },
    },
    destinatario: {
      nome: 'RODNEY', cpfCnpj: '22571976826', celular: '11911544095',
      endereco: { cep: '03027000', logradouro: 'Rua X', numero: '1', bairro: 'Brás', localidade: 'São Paulo', uf: 'SP' },
    },
    itensDeclaracaoConteudo: [{ conteudo: 'calca', quantidade: '1', valor: '20.00' }],
  };

  const candidates = [
    '/emissoes', '/emissao', '/emissoes/criar', '/emissoes/emitir',
    '/frete/emissoes', '/frete/emitir', '/etiquetas', '/etiquetas/emitir',
    '/frete/etiqueta', '/frete/etiquetas',
  ];

  const results: any[] = [];
  for (const path of candidates) {
    try {
      const r = await fetch(`${MARKETPLACE_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify(payload),
      });
      const t = (await r.text()).slice(0, 400);
      results.push({ path, status: r.status, body: t });
    } catch (e: any) {
      results.push({ path, error: e?.message });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
