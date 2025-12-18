// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessarPedidoRequest {
  pedidoId: string;
  clienteId: string;
  userToken: string; // Token do usuário para chamar API BRHUB
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pedidoId, clienteId, userToken }: ProcessarPedidoRequest = await req.json();
    
    console.log('🔄 [SHOPIFY-PROC] Iniciando processamento do pedido:', pedidoId);

    // Inicializa Supabase
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // @ts-ignore
    const baseApiUrl = Deno.env.get('BASE_API_URL');
    if (!baseApiUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    // Buscar pedido importado
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_importados')
      .select('*, remetentes(*)')
      .eq('id', pedidoId)
      .eq('cliente_id', clienteId)
      .single();

    if (pedidoError || !pedido) {
      console.error('❌ [SHOPIFY-PROC] Pedido não encontrado:', pedidoError);
      throw new Error('Pedido não encontrado');
    }

    if (pedido.status === 'processado') {
      throw new Error('Pedido já foi processado');
    }

    console.log('✅ [SHOPIFY-PROC] Pedido encontrado:', pedido.numero_pedido);

    // Preparar dados do destinatário
    const destinatario = {
      nome: pedido.destinatario_nome,
      cpfCnpj: pedido.destinatario_cpf_cnpj || '',
      celular: pedido.destinatario_telefone?.replace(/\D/g, '') || '',
      email: pedido.destinatario_email || '',
      logradouro: pedido.destinatario_logradouro,
      numero: pedido.destinatario_numero || 'S/N',
      complemento: pedido.destinatario_complemento || '',
      bairro: pedido.destinatario_bairro || 'Centro',
      localidade: pedido.destinatario_cidade,
      uf: pedido.destinatario_estado,
      cep: pedido.destinatario_cep?.replace(/\D/g, '') || '',
    };

    console.log('📍 [SHOPIFY-PROC] Destinatário:', destinatario);

    // Criar destinatário no sistema
    const destinatarioResponse = await fetch(`${baseApiUrl}/destinatarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify(destinatario),
    });

    let destinatarioId: string;
    if (destinatarioResponse.ok) {
      const destinatarioData = await destinatarioResponse.json();
      destinatarioId = destinatarioData.data.id;
      console.log('✅ [SHOPIFY-PROC] Destinatário criado:', destinatarioId);
    } else {
      // Se falhar, tentar buscar destinatário existente pelo nome/CEP
      const searchResponse = await fetch(
        `${baseApiUrl}/destinatarios?nome=${encodeURIComponent(destinatario.nome)}&cep=${destinatario.cep}`,
        {
          headers: {
            'Authorization': `Bearer ${userToken}`,
          },
        }
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          destinatarioId = searchData.data[0].id;
          console.log('✅ [SHOPIFY-PROC] Destinatário encontrado:', destinatarioId);
        } else {
          const errorText = await destinatarioResponse.text();
          console.error('❌ [SHOPIFY-PROC] Erro ao criar destinatário:', errorText);
          throw new Error('Não foi possível criar ou encontrar destinatário');
        }
      } else {
        throw new Error('Não foi possível criar ou encontrar destinatário');
      }
    }

    // Valores padrão para dimensões (Shopify não fornece)
    const altura = 10;
    const largura = 15;
    const comprimento = 20;

    // Fazer cotação de frete
    const cotacaoPayload = {
      remetenteId: pedido.remetente_id,
      destinatarioId,
      embalagem: {
        altura,
        largura,
        comprimento,
        peso: pedido.peso_total || 0.3,
        formatoObjeto: 'CAIXA_PACOTE',
      },
      valorDeclarado: pedido.valor_total || 0,
    };

    console.log('💰 [SHOPIFY-PROC] Cotando frete:', cotacaoPayload);

    const cotacaoResponse = await fetch(`${baseApiUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify(cotacaoPayload),
    });

    if (!cotacaoResponse.ok) {
      const errorText = await cotacaoResponse.text();
      console.error('❌ [SHOPIFY-PROC] Erro na cotação:', errorText);
      throw new Error('Erro ao cotar frete');
    }

    const cotacaoData = await cotacaoResponse.json();
    console.log('✅ [SHOPIFY-PROC] Cotação realizada:', cotacaoData.data?.length || 0, 'opções');

    if (!cotacaoData.data || cotacaoData.data.length === 0) {
      throw new Error('Nenhuma opção de frete disponível');
    }

    // Selecionar a opção de frete mais barata
    const freteEscolhido = cotacaoData.data.reduce((prev: any, current: any) => {
      const prevPreco = typeof prev.preco === 'string' 
        ? parseFloat(prev.preco.replace(',', '.')) 
        : prev.preco;
      const currentPreco = typeof current.preco === 'string' 
        ? parseFloat(current.preco.replace(',', '.')) 
        : current.preco;
      return currentPreco < prevPreco ? current : prev;
    });

    console.log('🚚 [SHOPIFY-PROC] Frete escolhido:', freteEscolhido.nomeServico, '- R$', freteEscolhido.preco);

    // Preparar itens para declaração de conteúdo
    const itens = pedido.itens || [];
    const itensDeclaracao = itens.map((item: any) => ({
      conteudo: item.nome?.substring(0, 50) || 'Produto',
      quantidade: String(item.quantidade || 1),
      valor: String(item.preco || 0),
    }));

    // Criar emissão de etiqueta
    const emissaoPayload = {
      remetenteId: pedido.remetente_id,
      destinatarioId,
      externoId: pedido.externo_id,
      numeroNotaFiscal: pedido.numero_pedido,
      cienteObjetoNaoProibido: true,
      cotacao: freteEscolhido,
      valorDeclarado: pedido.valor_total || 0,
      valorNotaFiscal: pedido.valor_total || 0,
      observacao: `Pedido Shopify ${pedido.numero_pedido}`,
      itensDeclaracaoConteudo: itensDeclaracao.length > 0 ? itensDeclaracao : [{
        conteudo: 'Mercadoria',
        quantidade: '1',
        valor: String(pedido.valor_total || 0),
      }],
    };

    console.log('📦 [SHOPIFY-PROC] Criando emissão de etiqueta...');

    const emissaoResponse = await fetch(`${baseApiUrl}/frete/emitir-etiqueta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify(emissaoPayload),
    });

    if (!emissaoResponse.ok) {
      const errorText = await emissaoResponse.text();
      console.error('❌ [SHOPIFY-PROC] Erro ao criar emissão:', errorText);
      throw new Error('Erro ao criar emissão de etiqueta');
    }

    const emissaoData = await emissaoResponse.json();
    console.log('✅ [SHOPIFY-PROC] Etiqueta criada com sucesso!');
    console.log('🏷️  [SHOPIFY-PROC] Código objeto:', emissaoData.data?.codigoObjeto);

    // Atualizar status do pedido importado
    const { error: updateError } = await supabase
      .from('pedidos_importados')
      .update({
        status: 'processado',
        emissao_id: emissaoData.data?.id,
        codigo_rastreio: emissaoData.data?.codigoObjeto,
        servico_frete: freteEscolhido.nomeServico,
        valor_frete: typeof freteEscolhido.preco === 'string' 
          ? parseFloat(freteEscolhido.preco.replace(',', '.')) 
          : freteEscolhido.preco,
        processado_em: new Date().toISOString(),
      })
      .eq('id', pedidoId);

    if (updateError) {
      console.error('⚠️ [SHOPIFY-PROC] Erro ao atualizar pedido:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emissao: emissaoData.data,
        codigoObjeto: emissaoData.data?.codigoObjeto,
        servico: freteEscolhido.nomeServico,
        valor: freteEscolhido.preco,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ [SHOPIFY-PROC] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
