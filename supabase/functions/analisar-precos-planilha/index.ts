// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EtiquetaPlanilha {
  codigoObjeto: string;
  valorCustoPlanilha: number;
  novoValorVendaOverride?: number;
}

interface ResultadoAnalise {
  codigoObjeto: string;
  dataPostagem: string;
  remetenteNome: string;
  emissaoId: string | null;
  valorCustoPlanilha: number;
  valorCustoSistema: number;
  valorVendaAtual: number;
  margemAtual: number;
  novoValorVenda: number | null;
  novaMargemCalculada: number | null;
  custoAtualizado: boolean;
  cenario: 'OK' | 'MARGEM_BAIXA' | 'CUSTO_MENOR';
  descricao: string;
}

async function getAdminToken(): Promise<string> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL');
  const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD');

  const loginResponse = await fetch(`${BASE_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: API_ADMIN_EMAIL, password: API_ADMIN_PASSWORD }),
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    console.error('Login error:', errorText);
    throw new Error(`Falha no login admin: ${loginResponse.status}`);
  }

  const loginData = await loginResponse.json();
  return loginData.token || loginData.accessToken;
}

async function buscarEmissaoPorCodigo(codigoObjeto: string, token: string): Promise<any | null> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  
  const searchParams = new URLSearchParams({
    codigoObjeto: codigoObjeto,
    limit: '1',
    offset: '0',
  });

  const response = await fetch(`${BASE_API_URL}/emissoes/admin?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Erro ao buscar ${codigoObjeto}: ${response.status} - ${errorText}`);
    return null;
  }

  const data = await response.json();
  if (!data) return null;
  const emissoes = data.data || data;
  
  if (Array.isArray(emissoes) && emissoes.length > 0) {
    return emissoes[0];
  }
  
  return null;
}

async function atualizarPreco(emissaoId: string, tipoAtualizacao: string, valor: number, token: string): Promise<{ ok: boolean; erro?: string }> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  
  const response = await fetch(`${BASE_API_URL}/emissoes/${emissaoId}/atualizar-precos`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      emissaoId,
      tipoAtualizacao,
      valor,
    }),
  });

  if (response.ok) {
    return { ok: true };
  }
  const errorText = await response.text();
  return { ok: false, erro: errorText };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { etiquetas, margemMinima = 18, executar = false, atualizarCusto = false } = await req.json() as {
      etiquetas: EtiquetaPlanilha[];
      margemMinima?: number;
      executar?: boolean;
      atualizarCusto?: boolean;
    };

    if (!etiquetas || !Array.isArray(etiquetas) || etiquetas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Lista de etiquetas é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Analisando ${etiquetas.length} etiquetas (margemMinima: ${margemMinima}%, executar: ${executar}, atualizarCusto: ${atualizarCusto})`);

    const adminToken = await getAdminToken();
    console.log('✅ Login admin realizado');

    const resultados: ResultadoAnalise[] = [];
    const naoEncontradas: string[] = [];

    for (const etiqueta of etiquetas) {
      const emissao = await buscarEmissaoPorCodigo(etiqueta.codigoObjeto, adminToken);
      
      if (!emissao) {
        naoEncontradas.push(etiqueta.codigoObjeto);
        console.warn(`⚠️ Não encontrada: ${etiqueta.codigoObjeto}`);
        continue;
      }

      const valorVendaAtual = parseFloat(emissao.valor || emissao.valorPostagem || '0');
      const valorCustoSistema = parseFloat(emissao.valorPostagem || emissao.valorCusto || '0');
      const valorCustoPlanilha = etiqueta.valorCustoPlanilha;
      const remetenteNome = emissao.remetenteNome || emissao.remetente?.nome || 'N/A';
      const dataPostagem = emissao.criadoEm || emissao.dataPostagem || emissao.createdAt || '';

      const margemAtual = valorVendaAtual > 0 && valorCustoPlanilha > 0
        ? ((valorVendaAtual - valorCustoPlanilha) / valorCustoPlanilha) * 100
        : 0;

      const valorVendaMinimo = valorCustoPlanilha * (1 + margemMinima / 100);
      
      let cenario: 'OK' | 'MARGEM_BAIXA' | 'CUSTO_MENOR';
      let novoValorVenda: number | null = null;
      let novaMargemCalculada: number | null = null;
      let descricao: string;
      const custoDiferente = Math.abs(valorCustoPlanilha - valorCustoSistema) > 0.01;

      if (valorCustoPlanilha < valorCustoSistema) {
        cenario = 'CUSTO_MENOR';
        descricao = `Custo planilha (R$ ${valorCustoPlanilha.toFixed(2)}) menor que sistema (R$ ${valorCustoSistema.toFixed(2)})`;
        if (margemAtual < margemMinima) {
          novoValorVenda = parseFloat(valorVendaMinimo.toFixed(2));
          novaMargemCalculada = margemMinima;
          descricao += ` | Margem ${margemAtual.toFixed(1)}% < ${margemMinima}%, ajuste necessário`;
        }
      } else if (margemAtual < margemMinima) {
        cenario = 'MARGEM_BAIXA';
        novoValorVenda = parseFloat(valorVendaMinimo.toFixed(2));
        novaMargemCalculada = margemMinima;
        descricao = `Margem ${margemAtual.toFixed(1)}% < ${margemMinima}% mínimo. Novo valor: R$ ${novoValorVenda.toFixed(2)}`;
      } else {
        cenario = 'OK';
        descricao = `Margem ${margemAtual.toFixed(1)}% ≥ ${margemMinima}%. Sem alteração.`;
      }

      resultados.push({
        codigoObjeto: etiqueta.codigoObjeto,
        dataPostagem,
        remetenteNome,
        emissaoId: emissao.id,
        valorCustoPlanilha,
        valorCustoSistema,
        valorVendaAtual,
        margemAtual: parseFloat(margemAtual.toFixed(2)),
        novoValorVenda,
        novaMargemCalculada,
        custoAtualizado: custoDiferente,
        cenario,
        descricao,
      });

      await new Promise(resolve => setTimeout(resolve, 80));
    }

    const resumo = {
      total: resultados.length,
      ok: resultados.filter(r => r.cenario === 'OK').length,
      margemBaixa: resultados.filter(r => r.cenario === 'MARGEM_BAIXA').length,
      custoMenor: resultados.filter(r => r.cenario === 'CUSTO_MENOR').length,
      naoEncontradas: naoEncontradas.length,
      paraAtualizar: resultados.filter(r => r.novoValorVenda !== null).length,
      custoDivergente: resultados.filter(r => r.custoAtualizado).length,
    };

    console.log(`📊 Resumo: OK=${resumo.ok}, Margem Baixa=${resumo.margemBaixa}, Custo Menor=${resumo.custoMenor}, Custo Divergente=${resumo.custoDivergente}`);

    if (executar) {
      const atualizados: string[] = [];
      const custosAtualizados: string[] = [];
      const erros: { codigoObjeto: string; erro: string }[] = [];

      const overrideMap = new Map(etiquetas.map(e => [e.codigoObjeto, e.novoValorVendaOverride]));
      const paraAtualizar = resultados
        .filter(r => r.emissaoId)
        .map(r => ({
          ...r,
          novoValorVenda: overrideMap.get(r.codigoObjeto) ?? r.novoValorVenda,
        }));

      for (const item of paraAtualizar) {
        try {
          // 1. Update VALOR_VENDA if there's a new value
          if (item.novoValorVenda !== null && item.novoValorVenda > 0) {
            const res = await atualizarPreco(item.emissaoId!, 'VALOR_VENDA', item.novoValorVenda, adminToken);
            if (res.ok) {
              atualizados.push(item.codigoObjeto);
              console.log(`✅ Venda atualizada: ${item.codigoObjeto} → R$ ${item.novoValorVenda}`);
            } else {
              erros.push({ codigoObjeto: item.codigoObjeto, erro: `Venda: ${res.erro}` });
              console.error(`❌ Erro venda: ${item.codigoObjeto} - ${res.erro}`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // 2. Update VALOR_CUSTO with spreadsheet value if enabled and cost differs
          if (atualizarCusto && item.custoAtualizado) {
            const res = await atualizarPreco(item.emissaoId!, 'VALOR_CUSTO', item.valorCustoPlanilha, adminToken);
            if (res.ok) {
              custosAtualizados.push(item.codigoObjeto);
              console.log(`✅ Custo atualizado: ${item.codigoObjeto} → R$ ${item.valorCustoPlanilha}`);
            } else {
              erros.push({ codigoObjeto: item.codigoObjeto, erro: `Custo: ${res.erro}` });
              console.error(`❌ Erro custo: ${item.codigoObjeto} - ${res.erro}`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          erros.push({ codigoObjeto: item.codigoObjeto, erro: err.message });
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return new Response(
        JSON.stringify({
          success: true,
          executado: true,
          resumo: {
            ...resumo,
            atualizados: atualizados.length,
            custosAtualizados: custosAtualizados.length,
            erros: erros.length,
          },
          atualizados,
          custosAtualizados,
          erros,
          resultados,
          naoEncontradas,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        executado: false,
        resumo,
        resultados,
        naoEncontradas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
