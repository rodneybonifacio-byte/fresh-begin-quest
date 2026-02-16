// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EtiquetaPlanilha {
  dataPostagem: string;
  codigoObjeto: string;
  valorCustoPlanilha: number;
}

interface ResultadoAnalise {
  codigoObjeto: string;
  dataPostagem: string;
  emissaoId: string | null;
  valorCustoPlanilha: number;
  valorCustoSistema: number;
  valorVendaAtual: number;
  margemAtual: number;
  novoValorVenda: number | null;
  novaMargemCalculada: number | null;
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
  const emissoes = data.data || data;
  
  if (Array.isArray(emissoes) && emissoes.length > 0) {
    return emissoes[0];
  }
  
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { etiquetas, margemMinima = 18, executar = false } = await req.json() as {
      etiquetas: EtiquetaPlanilha[];
      margemMinima?: number;
      executar?: boolean;
    };

    if (!etiquetas || !Array.isArray(etiquetas) || etiquetas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Lista de etiquetas é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Analisando ${etiquetas.length} etiquetas (margemMinima: ${margemMinima}%, executar: ${executar})`);

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

      // Calculate current margin based on spreadsheet cost
      const margemAtual = valorVendaAtual > 0 && valorCustoPlanilha > 0
        ? ((valorVendaAtual - valorCustoPlanilha) / valorCustoPlanilha) * 100
        : 0;

      const valorVendaMinimo = valorCustoPlanilha * (1 + margemMinima / 100);
      
      let cenario: 'OK' | 'MARGEM_BAIXA' | 'CUSTO_MENOR';
      let novoValorVenda: number | null = null;
      let novaMargemCalculada: number | null = null;
      let descricao: string;

      if (valorCustoPlanilha < valorCustoSistema) {
        // Spreadsheet cost is LOWER than system cost
        cenario = 'CUSTO_MENOR';
        descricao = `Custo planilha (R$ ${valorCustoPlanilha.toFixed(2)}) menor que sistema (R$ ${valorCustoSistema.toFixed(2)})`;
        // Still check if margin is ok
        if (margemAtual < margemMinima) {
          novoValorVenda = parseFloat(valorVendaMinimo.toFixed(2));
          novaMargemCalculada = margemMinima;
          descricao += ` | Margem ${margemAtual.toFixed(1)}% < ${margemMinima}%, ajuste necessário`;
        }
      } else if (margemAtual < margemMinima) {
        // Margin is below minimum
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
        dataPostagem: etiqueta.dataPostagem,
        emissaoId: emissao.id,
        valorCustoPlanilha,
        valorCustoSistema,
        valorVendaAtual,
        margemAtual: parseFloat(margemAtual.toFixed(2)),
        novoValorVenda,
        novaMargemCalculada,
        cenario,
        descricao,
      });

      await new Promise(resolve => setTimeout(resolve, 80));
    }

    // Summary counts
    const resumo = {
      total: resultados.length,
      ok: resultados.filter(r => r.cenario === 'OK').length,
      margemBaixa: resultados.filter(r => r.cenario === 'MARGEM_BAIXA').length,
      custoMenor: resultados.filter(r => r.cenario === 'CUSTO_MENOR').length,
      naoEncontradas: naoEncontradas.length,
      paraAtualizar: resultados.filter(r => r.novoValorVenda !== null).length,
    };

    console.log(`📊 Resumo: OK=${resumo.ok}, Margem Baixa=${resumo.margemBaixa}, Custo Menor=${resumo.custoMenor}, Não encontradas=${resumo.naoEncontradas}`);

    // If executar=true, update the ones that need it
    if (executar) {
      const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
      const atualizados: string[] = [];
      const erros: { codigoObjeto: string; erro: string }[] = [];

      const paraAtualizar = resultados.filter(r => r.novoValorVenda !== null && r.emissaoId);

      for (const item of paraAtualizar) {
        try {
          const updateResponse = await fetch(`${BASE_API_URL}/emissoes/${item.emissaoId}/atualizar-precos`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              emissaoId: item.emissaoId,
              tipoAtualizacao: 'VALOR_VENDA',
              valor: item.novoValorVenda,
            }),
          });

          if (updateResponse.ok) {
            atualizados.push(item.codigoObjeto);
            console.log(`✅ Atualizada: ${item.codigoObjeto} → R$ ${item.novoValorVenda}`);
          } else {
            const errorText = await updateResponse.text();
            erros.push({ codigoObjeto: item.codigoObjeto, erro: errorText });
            console.error(`❌ Erro: ${item.codigoObjeto} - ${errorText}`);
          }
        } catch (err) {
          erros.push({ codigoObjeto: item.codigoObjeto, erro: err.message });
        }

        await new Promise(resolve => setTimeout(resolve, 150));
      }

      return new Response(
        JSON.stringify({
          success: true,
          executado: true,
          resumo: {
            ...resumo,
            atualizados: atualizados.length,
            erros: erros.length,
          },
          atualizados,
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
