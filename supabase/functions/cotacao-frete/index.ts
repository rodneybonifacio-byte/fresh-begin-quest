// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MARKETPLACE_BASE = 'https://icnwmceefmgavmbzsomo.supabase.co/functions/v1/marketplace-api';

// Cache de token Marketplace (in-memory por instância)
let mpTokenCache: { token: string; apiKey: string; exp: number } | null = null;

async function getMarketplaceAuth(): Promise<{ apiKey: string } | null> {
  const email = Deno.env.get('MARKETPLACE_EMAIL');
  const password = Deno.env.get('MARKETPLACE_PASSWORD');
  if (!email || !password) {
    console.log('ℹ️ Marketplace: credenciais não configuradas, pulando');
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (mpTokenCache && mpTokenCache.exp - 300 > now) {
    return { apiKey: mpTokenCache.apiKey };
  }
  try {
    const r = await fetch(`${MARKETPLACE_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json();
    if (!j?.success || !j?.tenant?.apiKey) {
      console.error('❌ Marketplace login falhou:', JSON.stringify(j));
      return null;
    }
    // decodifica exp do JWT
    let exp = now + 3600;
    try {
      const payload = JSON.parse(atob(j.token.split('.')[1]));
      if (payload?.exp) exp = payload.exp;
    } catch (_) { /* noop */ }
    mpTokenCache = { token: j.token, apiKey: j.tenant.apiKey, exp };
    console.log('✅ Marketplace autenticado, tenant:', j.tenant.id);
    return { apiKey: j.tenant.apiKey };
  } catch (e) {
    console.error('❌ Marketplace login erro:', e?.message);
    return null;
  }
}

async function cotarMarketplace(payload: any): Promise<any[]> {
  const auth = await getMarketplaceAuth();
  if (!auth) return [];
  try {
    const r = await fetch(`${MARKETPLACE_BASE}/frete/cotacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKey },
      body: JSON.stringify({
        cepOrigem: payload.cepOrigem,
        cepDestino: payload.cepDestino,
        embalagem: payload.embalagem,
      }),
    });
    const j = await r.json();
    if (!j?.success || !Array.isArray(j.cotacoes)) {
      console.error('❌ Marketplace cotação falhou:', JSON.stringify(j).slice(0, 300));
      return [];
    }
    console.log(`✅ Marketplace retornou ${j.cotacoes.length} cotações`);
    // Normaliza para o formato BRHUB
    // Mapa de modalidades BRHub (nome amigável)
    const mapModalidade = (nome: string): string => {
      const n = (nome || '').toUpperCase();
      if (n.includes('SAME DAY')) return 'BRHUB SAME DAY';
      if (n.includes('NEXT DAY')) return 'BRHUB NEXT DAY';
      if (n.includes('EXPRESSO')) return 'BRHUB RÁPIDO';
      if (n.includes('ECONÔMICO MINI') || n.includes('ECONOMICO MINI')) return 'BRHUB ECONÔMICO MINI';
      if (n.includes('ECONÔMICO') || n.includes('ECONOMICO')) return 'BRHUB ECONÔMICO';
      // fallback: remove o "+" inicial e prefixa
      return `BRHUB ${nome.replace(/^\+\s*/, '').trim()}`.toUpperCase();
    };
    return j.cotacoes.map((c: any) => {
      const precoNum = Number(c.preco ?? 0);
      const precoStr = precoNum.toFixed(2);
      return {
        codigoServico: c.codigoServico,
        nomeServico: mapModalidade(c.nomeServico),
        preco: precoStr,
        valorTotal: precoStr,
        valor: precoStr,
        prazo: c.prazo,
        transportadora: 'BRHub',
        imagem: c.imagem,
        origem: 'marketplace',
      };
    });
  } catch (e) {
    console.error('❌ Marketplace cotação erro:', e?.message);
    return [];
  }
}

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
      ...(isLogisticaReversa && requestData.cpfCnpjLoja && { cpfCnpjLoja: requestData.cpfCnpjLoja }),
    };

    if (isLogisticaReversa) {
      console.log('🔄 [REVERSA] Cotação sem logisticaReversa para obter serviços Correios; flag será enviada apenas na emissão');
    }

    console.log('📊 Realizando cotação com clienteId:', clienteId);
    console.log('📦 Payload:', JSON.stringify(cotacaoPayload));

    // ✅ Dispara BRHUB + Marketplace em paralelo
    const [brhubRes, marketplaceCotacoes] = await Promise.all([
      fetch(`${baseUrl}/frete/cotacao`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotacaoPayload),
      }),
      // Marketplace apenas se não for reversa (endpoint não suporta CPF loja)
      isLogisticaReversa ? Promise.resolve([]) : cotarMarketplace(cotacaoPayload),
    ]);

    const responseText = await brhubRes.text();
    console.log('📄 Resposta da cotação (status):', brhubRes.status);
    if (isLogisticaReversa) {
      console.log('🔄 [REVERSA] Resposta bruta da BRHUB:', responseText);
    }

    if (!brhubRes.ok) {
      console.error('❌ Erro na cotação:', responseText);
      return new Response(
        JSON.stringify({
          error: `Erro na cotação: ${responseText}`,
          status: brhubRes.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: brhubRes.status,
        }
      );
    }

    const cotacaoData = JSON.parse(responseText);
    const totalBrhub = cotacaoData.data?.length || 0;
    console.log(`✅ BRHUB retornou ${totalBrhub} cotações`);

    // Marca origem nos itens BRHUB
    if (Array.isArray(cotacaoData.data)) {
      cotacaoData.data = cotacaoData.data.map((c: any) => ({ ...c, origem: c.origem || 'brhub' }));
    } else {
      cotacaoData.data = [];
    }

    // Mescla com Marketplace
    if (marketplaceCotacoes && marketplaceCotacoes.length > 0) {
      cotacaoData.data = [...cotacaoData.data, ...marketplaceCotacoes];
      console.log(`🔀 Mesclado: ${totalBrhub} BRHUB + ${marketplaceCotacoes.length} Marketplace = ${cotacaoData.data.length}`);
    }

    // Verificar se o cliente pertence a um grupo de regras
    const grupoRegras = await getGrupoRegras(clienteId);

    if (grupoRegras && !grupoRegras.primeiraEtiquetaEmitida && grupoRegras.aplicarEmSimulacao) {
      console.log('🎯 Aplicando multiplicador do grupo:', grupoRegras.multiplicador);

      cotacaoData.data = cotacaoData.data.map((cotacao: any) => {
        const valorOriginal = parseFloat(cotacao.valorTotal || cotacao.valor || cotacao.preco || '0');
        const valorComMultiplicador = (valorOriginal * grupoRegras.multiplicador).toFixed(2);

        console.log(`  📦 [${cotacao.origem}] ${cotacao.nomeServico}: R$ ${valorOriginal} → R$ ${valorComMultiplicador} (×${grupoRegras.multiplicador})`);

        return {
          ...cotacao,
          preco: valorComMultiplicador,
          valorTotal: valorComMultiplicador,
          valor: valorComMultiplicador,
          valorOriginalSemGrupo: valorOriginal,
          grupoRegraAplicada: true,
        };
      });
    } else if (grupoRegras) {
      console.log('ℹ️ Cliente já emitiu primeira etiqueta - cotação normal do plano');
    }

    // Ordena por preço (mais barato primeiro)
    const parsePreco = (c: any) => {
      const n = parseFloat(c.valorTotal || c.valor || '0');
      if (n > 0) return n;
      // fallback: parse de "R$ 19,70"
      const s = String(c.preco || '').replace(/[^\d,.-]/g, '').replace(',', '.');
      return parseFloat(s) || 0;
    };
    cotacaoData.data.sort((a: any, b: any) => parsePreco(a) - parsePreco(b));

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
