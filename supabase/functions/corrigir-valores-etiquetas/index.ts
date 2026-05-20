// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EtiquetaCorrecao {
  codigoObjeto: string;
  valorCobrado: number;
  novoValorVenda: number;
}

async function getAdminToken(): Promise<string> {
  return await getAdminTokenCached();
}


async function buscarEmissaoPorCodigo(codigoObjeto: string, token: string): Promise<any | null> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  
  // Usar endpoint admin para buscar por código objeto
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
    const { etiquetas, dryRun = true } = await req.json() as {
      etiquetas: EtiquetaCorrecao[];
      dryRun?: boolean;
    };

    if (!etiquetas || !Array.isArray(etiquetas) || etiquetas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Lista de etiquetas é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Processando ${etiquetas.length} etiquetas (dryRun: ${dryRun})`);

    // Login admin
    const adminToken = await getAdminToken();
    console.log('✅ Login admin realizado');

    // Buscar cada etiqueta e preparar preview
    const preview: any[] = [];
    const naoEncontradas: string[] = [];

    for (const etiqueta of etiquetas) {
      const emissao = await buscarEmissaoPorCodigo(etiqueta.codigoObjeto, adminToken);
      
      if (emissao) {
        preview.push({
          codigoObjeto: etiqueta.codigoObjeto,
          emissaoId: emissao.id,
          valorVendaAtual: emissao.valor || emissao.valorPostagem || 0,
          valorCobrado: etiqueta.valorCobrado,
          novoValorVenda: etiqueta.novoValorVenda,
          diferenca: (etiqueta.novoValorVenda - (emissao.valor || emissao.valorPostagem || 0)).toFixed(2),
        });
      } else {
        naoEncontradas.push(etiqueta.codigoObjeto);
        console.warn(`⚠️ Etiqueta não encontrada: ${etiqueta.codigoObjeto}`);
      }

      // Delay para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 Encontradas: ${preview.length}, Não encontradas: ${naoEncontradas.length}`);

    // Se dryRun, retorna apenas preview
    if (dryRun) {
      const totalAtual = preview.reduce((sum, p) => sum + parseFloat(p.valorVendaAtual), 0);
      const totalNovo = preview.reduce((sum, p) => sum + parseFloat(p.novoValorVenda), 0);

      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: `Preview: ${preview.length} etiquetas encontradas para atualização`,
          resumo: {
            encontradas: preview.length,
            naoEncontradas: naoEncontradas.length,
            totalValorAtual: totalAtual.toFixed(2),
            totalNovoValor: totalNovo.toFixed(2),
            diferencaTotal: (totalNovo - totalAtual).toFixed(2),
          },
          preview,
          etiquetasNaoEncontradas: naoEncontradas,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Executar atualizações
    console.log('🔄 Executando atualizações...');
    const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const resultados: any[] = [];
    const erros: any[] = [];

    for (const item of preview) {
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
          resultados.push({
            codigoObjeto: item.codigoObjeto,
            emissaoId: item.emissaoId,
            novoValorVenda: item.novoValorVenda,
          });
          console.log(`✅ Atualizada: ${item.codigoObjeto} → R$ ${item.novoValorVenda}`);
        } else {
          const errorText = await updateResponse.text();
          erros.push({ codigoObjeto: item.codigoObjeto, error: errorText });
          console.error(`❌ Erro: ${item.codigoObjeto} - ${errorText}`);
        }
      } catch (err) {
        erros.push({ codigoObjeto: item.codigoObjeto, error: err.message });
        console.error(`❌ Exceção: ${item.codigoObjeto}`, err);
      }

      // Delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const totalAtual = preview.reduce((sum, p) => sum + parseFloat(p.valorVendaAtual), 0);
    const totalNovo = preview.reduce((sum, p) => sum + parseFloat(p.novoValorVenda), 0);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: false,
        message: `${resultados.length} etiquetas atualizadas${erros.length > 0 ? `, ${erros.length} com erro` : ''}`,
        resumo: {
          atualizadas: resultados.length,
          erros: erros.length,
          naoEncontradas: naoEncontradas.length,
          totalValorAtual: totalAtual.toFixed(2),
          totalNovoValor: totalNovo.toFixed(2),
          diferencaTotal: (totalNovo - totalAtual).toFixed(2),
        },
        resultados,
        erros,
        etiquetasNaoEncontradas: naoEncontradas,
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
