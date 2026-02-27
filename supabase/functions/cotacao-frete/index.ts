// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Buscar regras de grupo do cliente
async function getGrupoRegras(clienteId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase
    .from('grupo_regras_clientes')
    .select(`
      primeira_etiqueta_emitida,
      grupos_regras_precificacao (
        multiplicador_primeira_etiqueta,
        aplicar_em_simulacao,
        percentual_plano_pos_primeira,
        ativo
      )
    `)
    .eq('cliente_id', clienteId)
    .limit(1)
    .single();

  if (error || !data) {
    console.log('ℹ️ Cliente não pertence a nenhum grupo de regras');
    return null;
  }

  const grupo = data.grupos_regras_precificacao;
  if (!grupo || !grupo.ativo) {
    console.log('ℹ️ Grupo do cliente está inativo');
    return null;
  }

  return {
    multiplicador: grupo.multiplicador_primeira_etiqueta,
    aplicarEmSimulacao: grupo.aplicar_em_simulacao,
    primeiraEtiquetaEmitida: data.primeira_etiqueta_emitida,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    console.log('🚚 Iniciando cotação de frete...');

    const baseUrl = Deno.env.get('BASE_API_URL');

    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    const userToken = requestData.userToken;
    
    if (!userToken) {
      console.error('❌ Token do usuário não fornecido');
      throw new Error('Token de autenticação não fornecido');
    }

    let clienteId = null;
    try {
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      clienteId = tokenPayload.clienteId;
      console.log('👤 ClienteId do usuário:', clienteId);
    } catch (e) {
      console.error('❌ Erro ao extrair clienteId do token:', e.message);
      throw new Error('Token inválido - não foi possível identificar o cliente');
    }

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    const isLogisticaReversa = requestData.logisticaReversa === 'S';
    
    if (isLogisticaReversa) {
      console.log('🔄 Logística reversa ativa');
    }
    
    const normalizeCep = (cep: string) => cep?.replace(/\D/g, '').padStart(8, '0') || '';

    const cotacaoPayload = {
      cepOrigem: normalizeCep(requestData.cepOrigem),
      cepDestino: normalizeCep(requestData.cepDestino),
      embalagem: requestData.embalagem,
      valorDeclarado: requestData.valorDeclarado || 0,
      clienteId,
      ...(isLogisticaReversa && { logisticaReversa: 'S' }),
      ...(requestData.cpfCnpjLoja && { cpfCnpjLoja: requestData.cpfCnpjLoja }),
    };

    console.log('📊 Realizando cotação com clienteId:', clienteId);
    console.log('📦 Payload:', JSON.stringify(cotacaoPayload));
    
    const cotacaoResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cotacaoPayload),
    });

    const responseText = await cotacaoResponse.text();
    console.log('📄 Resposta da cotação (status):', cotacaoResponse.status);

    if (!cotacaoResponse.ok) {
      console.error('❌ Erro na cotação:', responseText);
      return new Response(
        JSON.stringify({
          error: `Erro na cotação: ${responseText}`,
          status: cotacaoResponse.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: cotacaoResponse.status,
        }
      );
    }

    const cotacaoData = JSON.parse(responseText);
    console.log('✅ Cotação realizada com sucesso:', cotacaoData.data?.length || 0, 'opções');

    // Verificar se o cliente pertence a um grupo de regras
    const grupoRegras = await getGrupoRegras(clienteId);
    
    if (grupoRegras && !grupoRegras.primeiraEtiquetaEmitida && grupoRegras.aplicarEmSimulacao) {
      console.log('🎯 Aplicando multiplicador do grupo:', grupoRegras.multiplicador);
      
      if (cotacaoData.data && Array.isArray(cotacaoData.data)) {
        cotacaoData.data = cotacaoData.data.map((cotacao: any) => {
          const valorOriginal = parseFloat(cotacao.valorTotal || cotacao.valor || '0');
          const valorComMultiplicador = (valorOriginal * grupoRegras.multiplicador).toFixed(2);
          
          console.log(`  📦 ${cotacao.nomeServico}: R$ ${valorOriginal} → R$ ${valorComMultiplicador} (×${grupoRegras.multiplicador})`);
          
          return {
            ...cotacao,
            valorTotal: valorComMultiplicador,
            valor: valorComMultiplicador,
            valorOriginalSemGrupo: valorOriginal,
            grupoRegraAplicada: true,
          };
        });
      }
    } else if (grupoRegras) {
      console.log('ℹ️ Cliente já emitiu primeira etiqueta - cotação normal do plano');
    }

    return new Response(
      JSON.stringify(cotacaoData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao calcular frete';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
