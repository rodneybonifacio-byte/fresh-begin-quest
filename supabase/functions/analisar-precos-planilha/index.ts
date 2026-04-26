// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function getAdminToken(): Promise<string> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  const res = await fetch(`${BASE_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: Deno.env.get('API_ADMIN_EMAIL'), password: Deno.env.get('API_ADMIN_PASSWORD') }),
  });
  if (!res.ok) throw new Error(`Login falhou: ${res.status}`);
  const d = await res.json();
  return d.token || d.accessToken;
}

async function buscarEmissao(cod: string, token: string) {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  const r = await fetch(`${BASE_API_URL}/emissoes/admin?codigoObjeto=${cod}&limit=1&offset=0`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) return null;
  const d = await r.json();
  const arr = d?.data || d;
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

async function atualizarPreco(emissaoId: string, tipo: string, valor: number, token: string) {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  const r = await fetch(`${BASE_API_URL}/emissoes/${emissaoId}/atualizar-precos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ emissaoId, tipoAtualizacao: tipo, valor }),
  });
  if (r.ok) return { ok: true };
  return { ok: false, erro: await r.text() };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { etiquetas, margemMinima = 18, executar = false, modo } = body;
    // modo: 'corrigir_venda' | 'corrigir_custo' | undefined (legacy = both analysis)

    if (!etiquetas?.length) {
      return new Response(JSON.stringify({ error: 'Lista vazia' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`📋 ${etiquetas.length} etiquetas | modo=${modo} | executar=${executar} | margem=${margemMinima}%`);
    const token = await getAdminToken();

    const resultados = [];
    const naoEncontradas = [];

    for (const et of etiquetas) {
      const emissao = await buscarEmissao(et.codigoObjeto, token);
      if (!emissao) { naoEncontradas.push(et.codigoObjeto); continue; }

      const valorVenda = parseFloat(emissao.valor || emissao.valorPostagem || '0');
      const custoSistema = parseFloat(emissao.valorPostagem || emissao.valorCusto || '0');
      const custoPlanilha = et.valorCustoPlanilha;
      const remetente = emissao.remetenteNome || emissao.remetente?.nome || 'N/A';
      const data = emissao.criadoEm || emissao.dataPostagem || emissao.createdAt || '';

      // Classify
      const custoPlanilhaMaior = custoPlanilha > custoSistema + 0.01;
      const custoPlanilhaMenor = custoPlanilha < custoSistema - 0.01;
      const margemAtual = custoPlanilha > 0 ? ((valorVenda - custoPlanilha) / custoPlanilha) * 100 : 0;

      let cenario: string;
      let novoValorVenda: number | null = null;
      let novoCusto: number | null = null;

      if (custoPlanilhaMaior) {
        // Etapa 1: custo planilha > custo sistema → corrigir custo + venda
        cenario = 'CUSTO_PLANILHA_MAIOR';
        novoCusto = custoPlanilha;
        novoValorVenda = parseFloat((custoPlanilha * (1 + margemMinima / 100)).toFixed(2));
      } else if (custoPlanilhaMenor) {
        // Etapa 2: custo planilha < custo sistema → só corrigir custo
        cenario = 'CUSTO_PLANILHA_MENOR';
        novoCusto = custoPlanilha;
      } else {
        cenario = 'OK';
      }

      resultados.push({
        codigoObjeto: et.codigoObjeto,
        dataPostagem: data,
        remetenteNome: remetente,
        emissaoId: emissao.id,
        valorCustoPlanilha: custoPlanilha,
        valorCustoSistema: custoSistema,
        valorVendaAtual: valorVenda,
        margemAtual: parseFloat(margemAtual.toFixed(2)),
        novoValorVenda,
        novoCusto,
        cenario,
      });

      await new Promise(r => setTimeout(r, 80));
    }

    // Filter by mode
    const etapa1 = resultados.filter(r => r.cenario === 'CUSTO_PLANILHA_MAIOR');
    const etapa2 = resultados.filter(r => r.cenario === 'CUSTO_PLANILHA_MENOR');
    const ok = resultados.filter(r => r.cenario === 'OK');

    const resumo = {
      total: resultados.length,
      ok: ok.length,
      etapa1: etapa1.length,
      etapa2: etapa2.length,
      naoEncontradas: naoEncontradas.length,
    };

    if (!executar) {
      return new Response(JSON.stringify({ success: true, resumo, resultados, naoEncontradas }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute updates
    const atualizadosVenda = [];
    const atualizadosCusto = [];
    const erros = [];

    // Determine which items to process based on modo
    let items = [];
    const apenasCusto = modo === 'apenas_custo';
    if (modo === 'corrigir_venda') {
      // Etapa 1: custo planilha > sistema → update cost + sale
      items = etapa1;
    } else if (modo === 'corrigir_custo') {
      // Etapa 2: custo planilha < sistema → update cost only
      items = etapa2;
    } else if (apenasCusto) {
      // Apenas custo: qualquer item com divergência, atualiza só o custo (ignora venda)
      items = resultados.filter(r => r.cenario !== 'OK');
    } else {
      // Legacy: all that have changes
      items = resultados.filter(r => r.cenario !== 'OK');
    }

    // Apply overrides from frontend (only when not apenas_custo)
    const overrideMap = new Map(etiquetas.map(e => [e.codigoObjeto, e.novoValorVendaOverride]));

    for (const item of items) {
      try {
        // Update cost (always force to custo planilha when apenasCusto)
        const novoCustoFinal = apenasCusto ? item.valorCustoPlanilha : item.novoCusto;
        if (novoCustoFinal !== null && novoCustoFinal !== undefined) {
          const res = await atualizarPreco(item.emissaoId, 'VALOR_CUSTO', novoCustoFinal, token);
          if (res.ok) {
            atualizadosCusto.push(item.codigoObjeto);
            console.log(`✅ Custo: ${item.codigoObjeto} → R$ ${novoCustoFinal}`);
          } else {
            erros.push({ codigoObjeto: item.codigoObjeto, erro: `Custo: ${res.erro}` });
          }
          await new Promise(r => setTimeout(r, 100));
        }

        // Update sale ONLY if not apenasCusto
        if (!apenasCusto) {
          const vendaOverride = overrideMap.get(item.codigoObjeto);
          const vendaFinal = vendaOverride ?? item.novoValorVenda;
          if (vendaFinal !== null && vendaFinal > 0) {
            const res = await atualizarPreco(item.emissaoId, 'VALOR_VENDA', vendaFinal, token);
            if (res.ok) {
              atualizadosVenda.push(item.codigoObjeto);
              console.log(`✅ Venda: ${item.codigoObjeto} → R$ ${vendaFinal}`);
            } else {
              erros.push({ codigoObjeto: item.codigoObjeto, erro: `Venda: ${res.erro}` });
            }
            await new Promise(r => setTimeout(r, 100));
          }
        }
      } catch (err) {
        erros.push({ codigoObjeto: item.codigoObjeto, erro: err.message });
      }
      await new Promise(r => setTimeout(r, 50));
    }

    return new Response(JSON.stringify({
      success: true,
      resumo: { ...resumo, atualizadosVenda: atualizadosVenda.length, atualizadosCusto: atualizadosCusto.length, erros: erros.length },
      atualizadosVenda, atualizadosCusto, erros, resultados, naoEncontradas,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
