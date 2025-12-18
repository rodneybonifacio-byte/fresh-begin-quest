// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// @ts-ignore
import { isValid as isValidCPF } from 'https://esm.sh/@fnando/cpf@1.0.2';
// @ts-ignore
import { isValid as isValidCNPJ } from 'https://esm.sh/@fnando/cnpj@2.0.0';

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

    // Extrair número do logradouro se não estiver separado
    let logradouro = pedido.destinatario_logradouro || '';
    let numero = pedido.destinatario_numero || '';
    
    // Se o número está vazio, tentar extrair do logradouro
    if (!numero && logradouro) {
      const match = logradouro.match(/,\s*(\d+)/);
      if (match) {
        numero = match[1];
        logradouro = logradouro.replace(/,\s*\d+.*$/, '').trim();
      }
    }

    // Formatar telefone (remover +55 e manter só dígitos)
    let celular = pedido.destinatario_telefone?.replace(/\D/g, '') || '';
    if (celular.startsWith('55') && celular.length > 11) {
      celular = celular.substring(2);
    }

    const toDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

    const pickCpfCnpj = (value: unknown): string | null => {
      const digits = toDigits(value);
      if (!digits) return null;
      if (digits.length === 11 && isValidCPF(digits)) return digits;
      if (digits.length === 14 && isValidCNPJ(digits)) return digits;
      return null;
    };

    const cpfCnpj =
      pickCpfCnpj(pedido.destinatario_cpf_cnpj) ||
      pickCpfCnpj(pedido.dados_originais?.shipping_address?.company) ||
      pickCpfCnpj(pedido.dados_originais?.billing_address?.company) ||
      pickCpfCnpj(pedido.dados_originais?.customer?.default_address?.company) ||
      '';

    if (!cpfCnpj) {
      console.error('❌ [SHOPIFY-PROC] CPF/CNPJ do destinatário ausente ou inválido', {
        destinatario_cpf_cnpj: pedido.destinatario_cpf_cnpj,
        shipping_company: pedido.dados_originais?.shipping_address?.company,
        billing_company: pedido.dados_originais?.billing_address?.company,
      });
      throw new Error('CPF/CNPJ do destinatário é obrigatório para emitir a etiqueta');
    }

    // Preparar dados do destinatário com valores padrão seguros
    const destinatario = {
      nome: pedido.destinatario_nome || 'Destinatário',
      cpfCnpj,
      celular: celular,
      email: pedido.destinatario_email || '',
      logradouro: logradouro || 'Endereço não informado',
      numero: numero || 'S/N',
      complemento: pedido.destinatario_complemento || '',
      bairro: pedido.destinatario_bairro || 'Centro',
      localidade: pedido.destinatario_cidade || 'São Paulo',
      uf: pedido.destinatario_estado || 'SP',
      cep: pedido.destinatario_cep?.replace(/\D/g, '') || '',
    };

    console.log('📍 [SHOPIFY-PROC] Destinatário preparado:', JSON.stringify(destinatario));

    // Criar destinatário no sistema (endpoint correto: clientes/destinatarios)
    const destinatarioResponse = await fetch(`${baseApiUrl}/clientes/destinatarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify(destinatario),
    });

    let destinatarioId: string;
    const destinatarioResponseText = await destinatarioResponse.text();
    console.log('📍 [SHOPIFY-PROC] Resposta destinatário:', destinatarioResponse.status, destinatarioResponseText);

    if (destinatarioResponse.ok) {
      const destinatarioData = JSON.parse(destinatarioResponseText);
      destinatarioId = destinatarioData.data?.id;
      if (!destinatarioId) {
        console.error('❌ [SHOPIFY-PROC] ID não encontrado na resposta:', destinatarioResponseText);
        throw new Error('ID do destinatário não retornado pela API');
      }
      console.log('✅ [SHOPIFY-PROC] Destinatário criado:', destinatarioId);
    } else {
      console.log('⚠️ [SHOPIFY-PROC] Falha ao criar, tentando buscar existente...');
      
      // Se falhar, tentar buscar destinatário existente pelo CEP
      const searchResponse = await fetch(
        `${baseApiUrl}/clientes/destinatarios?cep=${destinatario.cep}`,
        {
          headers: {
            'Authorization': `Bearer ${userToken}`,
          },
        }
      );
      
      const searchText = await searchResponse.text();
      console.log('📍 [SHOPIFY-PROC] Busca destinatário:', searchResponse.status, searchText);
      
      if (searchResponse.ok) {
        const searchData = JSON.parse(searchText);
        const encontrados = searchData.data || [];
        
        // Buscar por nome similar
        const encontrado = encontrados.find((d: any) => 
          d.nome?.toLowerCase().includes(destinatario.nome.toLowerCase().split(' ')[0])
        );
        
        if (encontrado) {
          destinatarioId = encontrado.id;
          console.log('✅ [SHOPIFY-PROC] Destinatário encontrado:', destinatarioId);
        } else if (encontrados.length > 0) {
          destinatarioId = encontrados[0].id;
          console.log('✅ [SHOPIFY-PROC] Usando primeiro destinatário do CEP:', destinatarioId);
        } else {
          console.error('❌ [SHOPIFY-PROC] Nenhum destinatário encontrado no CEP');
          throw new Error(`Não foi possível criar destinatário: ${destinatarioResponseText}`);
        }
      } else {
        throw new Error(`Erro ao buscar/criar destinatário: ${destinatarioResponseText}`);
      }
    }

    // Valores padrão para dimensões (Shopify não fornece)
    const altura = 10;
    const largura = 15;
    const comprimento = 20;

    // Obter CEP do remetente
    const remetente = pedido.remetentes;
    if (!remetente || !remetente.cep) {
      console.error('❌ [SHOPIFY-PROC] Remetente não encontrado ou sem CEP');
      throw new Error('Remetente não configurado ou sem CEP');
    }

    const cepOrigem = remetente.cep.replace(/\D/g, '');
    const cepDestino = pedido.destinatario_cep?.replace(/\D/g, '') || '';

    if (!cepDestino) {
      throw new Error('CEP do destinatário não informado');
    }

    // Fazer cotação de frete com CEPs
    const cotacaoPayload = {
      cepOrigem,
      cepDestino,
      embalagem: {
        altura: String(altura),
        largura: String(largura),
        comprimento: String(comprimento),
        peso: String(Math.round((pedido.peso_total || 0.3) * 1000)), // peso em gramas
        diametro: '0',
      },
      valorDeclarado: pedido.valor_total || 0,
      logisticaReversa: 'N',
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

    // Preparar objeto destinatario completo para emissão
    const destinatarioEmissao = {
      id: destinatarioId,
      nome: pedido.destinatario_nome || 'Destinatário',
      cpfCnpj,
      telefone: celular,
      celular: celular,
      email: pedido.destinatario_email || '',
      endereco: {
        cep: cepDestino,
        logradouro: logradouro,
        numero: numero || 'S/N',
        complemento: pedido.destinatario_complemento || '',
        bairro: pedido.destinatario_bairro || 'Centro',
        localidade: pedido.destinatario_cidade || '',
        uf: pedido.destinatario_estado || '',
      },
    };

    // Preparar objeto embalagem para emissão
    const embalagemEmissao = {
      id: '',
      descricao: 'Pacote Shopify',
      altura,
      largura,
      comprimento,
      peso: Math.round((pedido.peso_total || 0.3) * 1000), // peso em gramas
      diametro: 0,
      formatoObjeto: 'CAIXA_PACOTE',
    };

    // Criar emissão de etiqueta (endpoint: POST /emissoes)
    const emissaoPayload = {
      remetenteId: pedido.remetente_id,
      cienteObjetoNaoProibido: true,
      cadastrarDestinatario: false,
      logisticaReversa: 'N',
      cotacao: freteEscolhido,
      embalagem: embalagemEmissao,
      destinatario: destinatarioEmissao,
      valorDeclarado: pedido.valor_total || 0,
      numeroNotaFiscal: pedido.numero_pedido?.replace('#', '') || '',
      observacao: `Pedido Shopify ${pedido.numero_pedido}`,
      itensDeclaracaoConteudo: itensDeclaracao.length > 0 ? itensDeclaracao : [{
        conteudo: 'Mercadoria',
        quantidade: '1',
        valor: String(pedido.valor_total || 0),
      }],
    };

    console.log('📦 [SHOPIFY-PROC] Criando emissão de etiqueta...', JSON.stringify(emissaoPayload));

    const emissaoResponse = await fetch(`${baseApiUrl}/emissoes`, {
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
