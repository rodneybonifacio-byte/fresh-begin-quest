import { emitirEtiquetaMarketplace, getMarketplaceAuth, MARKETPLACE_BASE } from '../_shared/marketplace.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await getMarketplaceAuth();
  if (!auth) return new Response('{"error":"no auth"}', { status: 500 });
  const body: any = await req.json().catch(() => ({}));

  // 1) Pega cotação real
  const cepOrigem = body?.cepOrigem || '02076040';
  const cepDestino = body?.cepDestino || '03027000';
  const embalagem = body?.embalagem || { peso: 0.3, altura: 30, largura: 30, comprimento: 30, diametro: 0 };
  const valorDeclarado = body?.valorDeclarado ?? 50;

  const rCot = await fetch(`${MARKETPLACE_BASE}/frete/cotacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify({ cepOrigem, cepDestino, embalagem, valorDeclarado }),
  });
  const cotJson = await rCot.json();
  const cotacoes = cotJson?.cotacoes || [];
  if (body?.mode === 'cotacao') {
    return new Response(JSON.stringify({ status: rCot.status, cotJson }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const wantedCodigo = body?.codigoServico || '03220';
  const cotacao = cotacoes.find((c: any) => String(c.codigoServico) === String(wantedCodigo)) || cotacoes[0];
  if (!cotacao) {
    return new Response(JSON.stringify({ erro: 'sem cotações', cotJson }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const remetente = body?.remetente || {
    nome: 'BRHUB TESTES', cpfCnpj: '11144477735', celular: '11999999999', email: 't@b.com',
    endereco: { cep: cepOrigem, logradouro: 'Rua A', numero: '1', complemento: '', bairro: 'B', localidade: 'São Paulo', uf: 'SP' },
  };
  const destinatario = body?.destinatario || {
    nome: 'Rodney', cpfCnpj: '22571976826', celular: '11911544095', email: 'r@b.com',
    endereco: { cep: cepDestino, logradouro: 'Rua X', numero: '718', complemento: '', bairro: 'Brás', localidade: 'São Paulo', uf: 'SP' },
  };

  // Permite "variantes" para descobrir o que estoura o campo nota
  const itens = body?.itensDeclaracaoConteudo || [{ conteudo: 'PROD', quantidade: 1, valor: 50, peso: 300 }];
  const extra = body?.extra || {};

  const payload = {
    remetente,
    destinatario,
    embalagem,
    cotacao,
    valorDeclarado,
    itensDeclaracaoConteudo: itens,
    cienteObjetoNaoProibido: true,
    logisticaReversa: 'N',
    ...extra,
  };

  if (body?.mode === 'helper') {
    try {
      const result = await emitirEtiquetaMarketplace(payload);
      return new Response(JSON.stringify({ ok: true, result, payloadBase: payload }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e?.message, payloadBase: payload }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
  }

  const r = await fetch(`${MARKETPLACE_BASE}/emissoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey, Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  return new Response(JSON.stringify({ status: r.status, body: text, payloadEnviado: payload }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
