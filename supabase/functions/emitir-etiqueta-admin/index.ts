// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';
import { emitirEtiquetaMarketplace } from '../_shared/marketplace.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cleanSecret = (v: string | undefined): string =>
    (v ?? '')
      .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();

  try {
    const requestData = await req.json();
    const baseUrl = cleanSecret(Deno.env.get('BASE_API_URL'));

    if (!baseUrl) {
      throw new Error('Configuração incompleta');
    }

    // 1. Token admin via cache compartilhado
    console.log('🔐 Token admin (cache)...');
    const adminToken = await getAdminTokenCached();
    if (!adminToken) throw new Error('Falha ao obter token admin');

    const { clienteId, emissaoData } = requestData;
    console.log('👤 ClienteId:', clienteId);

    // Auto-desabilitar rastreio via WhatsApp (preservando demais campos da config)
    try {
      const getRes = await fetch(`${baseUrl}/clientes/${clienteId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      if (getRes.ok) {
        const j = await getRes.json();
        const cli = j?.data || j || {};
        const cfg = cli.configuracoes || {};
        const configuracoesCorrigidas = {
          periodo_faturamento: cfg.periodo_faturamento || 'SEMANAL',
          horario_coleta: cfg.horario_coleta || '08:00',
          link_whatsapp: String(cfg.link_whatsapp || ''),
          incluir_valor_declarado_na_nota: false,
          aplicar_valor_declarado: false,
          rastreio_via_whatsapp: false,
          fatura_via_whatsapp: false,
          valor_disparo_evento_rastreio_whatsapp: String(cfg.valor_disparo_evento_rastreio_whatsapp || '0'),
          eventos_rastreio_habilitados_via_whatsapp: [],
        };
        const transportadoraCorrigidas = (cli.transportadoraConfiguracoes || []).map((t: any) => ({
          ...t,
          valorAcrescimo: typeof t.valorAcrescimo === 'string' ? parseFloat(t.valorAcrescimo) || 0 : (t.valorAcrescimo ?? 0),
          sobrepreco: typeof t.sobrepreco === 'string' ? parseFloat(t.sobrepreco) || 0 : (t.sobrepreco ?? 0),
        }));
        const body = {
          nomeEmpresa: cli.nomeEmpresa,
          nomeResponsavel: cli.nomeResponsavel,
          cpfCnpj: cli.cpfCnpj,
          email: cli.email,
          telefone: cli.telefone || '',
          celular: cli.celular,
          role: cli.role || 'CLIENTE',
          endereco: cli.endereco,
          status: cli.status || 'ATIVO',
          configuracoes: configuracoesCorrigidas,
          transportadoraConfiguracoes: transportadoraCorrigidas,
          senha: '__MANTER__',
        };
        const putRes = await fetch(`${baseUrl}/clientes/${clienteId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        console.log('🔧 PUT /clientes:', putRes.status);
      } else {
        console.warn('⚠️ GET cliente falhou:', getRes.status);
      }
    } catch (e) {
      console.warn('⚠️ Falha ao normalizar config WhatsApp:', e?.message || e);
    }





    // 4. Preparar payload de emissão
    const digitsOnly = (v: any) => String(v ?? '').replace(/\D/g, '');
    
    // Buscar remetente do Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: remetente } = await supabase
      .from('remetentes')
      .select('*')
      .eq('id', emissaoData.remetenteId)
      .single();

    const remetenteObj = remetente ? {
      nome: remetente.nome?.trim(),
      cpfCnpj: remetente.cpf_cnpj?.replace(/\D/g, ''),
      documentoEstrangeiro: remetente.documento_estrangeiro || '',
      celular: digitsOnly(remetente.celular || remetente.telefone || ''),
      telefone: digitsOnly(remetente.telefone || remetente.celular || ''),
      email: remetente.email?.trim() || '',
      endereco: {
        cep: remetente.cep?.replace(/\D/g, ''),
        logradouro: remetente.logradouro?.trim() || '',
        numero: remetente.numero?.trim() || '',
        complemento: remetente.complemento?.trim() || '',
        bairro: remetente.bairro?.trim() || '',
        localidade: remetente.localidade?.trim() || '',
        uf: remetente.uf?.trim() || '',
      },
    } : undefined;

    // Sanitizar destinatário
    if (emissaoData.destinatario?.cpfCnpj) {
      emissaoData.destinatario.cpfCnpj = digitsOnly(emissaoData.destinatario.cpfCnpj);
    }
    if (emissaoData.destinatario?.celular) {
      emissaoData.destinatario.celular = digitsOnly(emissaoData.destinatario.celular);
    }
    if (emissaoData.destinatario?.endereco?.cep) {
      emissaoData.destinatario.endereco.cep = digitsOnly(emissaoData.destinatario.endereco.cep);
    }

    // 4.5 Se cotacao não tem idLote, fazer cotação automática
    if (emissaoData.cotacao && !emissaoData.cotacao.idLote) {
      console.log('🔄 Cotação sem idLote - realizando cotação automática...');
      const cepOrigem = remetenteObj?.endereco?.cep || remetente?.cep?.replace(/\D/g, '') || '';
      const cepDestino = emissaoData.destinatario?.endereco?.cep || '';
      
      const cotacaoPayload = {
        cepOrigem,
        cepDestino,
        embalagem: emissaoData.embalagem,
        valorDeclarado: emissaoData.valorDeclarado || 0,
        clienteId,
      };
      
      console.log('📊 Cotação payload:', JSON.stringify(cotacaoPayload));
      
      const cotacaoRes = await fetch(`${baseUrl}/frete/cotacao`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotacaoPayload),
      });
      
      const cotacaoText = await cotacaoRes.text();
      console.log('📄 Cotação resposta:', cotacaoRes.status, cotacaoText.substring(0, 500));
      
      if (!cotacaoRes.ok) {
        return new Response(JSON.stringify({ error: `Erro na cotação: ${cotacaoText}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      const cotacaoResult = JSON.parse(cotacaoText);
      const cotacoes = cotacaoResult.data || cotacaoResult;
      
      // Encontrar o serviço solicitado pelo codigoServico
      const servicoDesejado = emissaoData.cotacao.codigoServico;
      const cotacaoEncontrada = Array.isArray(cotacoes) 
        ? cotacoes.find((c: any) => c.codigoServico === servicoDesejado)
        : null;
      
      if (!cotacaoEncontrada) {
        console.error('❌ Serviço não encontrado:', servicoDesejado, 'Disponíveis:', cotacoes?.map?.((c: any) => c.codigoServico));
        return new Response(JSON.stringify({ 
          error: `Serviço ${servicoDesejado} não disponível para esta rota. Disponíveis: ${cotacoes?.map?.((c: any) => `${c.nomeServico} (${c.codigoServico})`)?.join(', ')}` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      console.log('✅ Cotação encontrada:', cotacaoEncontrada.nomeServico, 'R$', cotacaoEncontrada.preco || cotacaoEncontrada.valorTotal);
      
      // Atualizar cotacao com dados completos incluindo idLote
      emissaoData.cotacao = {
        idLote: cotacaoEncontrada.idLote,
        codigoServico: cotacaoEncontrada.codigoServico,
        nomeServico: cotacaoEncontrada.nomeServico,
        preco: cotacaoEncontrada.preco || cotacaoEncontrada.valorTotal || '0',
        prazo: cotacaoEncontrada.prazo || cotacaoEncontrada.prazoEntrega || 0,
      };
    }

    const payload: any = {
      ...emissaoData,
      clienteId,
      cienteObjetoNaoProibido: true,
    };

    if (remetenteObj) {
      payload.remetente = remetenteObj;
      delete payload.remetenteId;
    }

    if (payload.embalagem) {
      payload.embalagem.quantidadeVolumes = payload.embalagem.quantidadeVolumes || 1;
    }
    payload.quantidadeVolumes = payload.quantidadeVolumes || 1;

    payload.notificarWhatsapp = false;
    payload.rastreamentoWhatsapp = false;

    console.log('📦 Payload:', JSON.stringify(payload));

    // 5. Emitir com ADMIN TOKEN
    console.log('🏷️ Emitindo etiqueta...');
    const emissaoRes = await fetch(`${baseUrl}/emissoes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await emissaoRes.text();
    console.log('📄 Resposta:', emissaoRes.status, responseText.substring(0, 500));

    if (!emissaoRes.ok) {
      return new Response(JSON.stringify({ error: responseText, status: emissaoRes.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: emissaoRes.status,
      });
    }

    const emissaoResult = JSON.parse(responseText);
    console.log('✅ Etiqueta emitida!');

    // 6. Bloquear créditos
    try {
      const emissaoId = emissaoResult?.data?.id || emissaoResult?.id;
      const codigoObjeto = emissaoResult?.data?.codigoObjeto || emissaoResult?.codigoObjeto;
      const valorFrete = parseFloat(emissaoResult?.data?.frete?.valorTotal || emissaoResult?.frete?.valorTotal || emissaoData?.cotacao?.preco || '0');

      if (emissaoId && clienteId && valorFrete > 0) {
        await supabase.rpc('bloquear_credito_etiqueta', {
          p_cliente_id: clienteId,
          p_emissao_id: emissaoId,
          p_valor: valorFrete,
          p_codigo_objeto: codigoObjeto || null,
        });
        console.log('💰 Créditos bloqueados');
      }
    } catch (e) {
      console.error('⚠️ Erro ao bloquear créditos:', e);
    }

    return new Response(JSON.stringify(emissaoResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
