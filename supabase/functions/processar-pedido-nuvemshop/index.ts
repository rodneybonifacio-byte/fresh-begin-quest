// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessarPedidoRequest {
  order: any;
  remetenteId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order, remetenteId }: ProcessarPedidoRequest = await req.json();
    console.log('🔄 [PROCESSAR] Iniciando processamento do pedido Nuvemshop:', order.number);

    // @ts-ignore
    const baseApiUrl = Deno.env.get('BASE_API_URL');
    if (!baseApiUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    // Fazer login no sistema BRHUB
    const loginResponse = await fetch(`${baseApiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // @ts-ignore
        email: Deno.env.get('API_ADMIN_EMAIL'),
        // @ts-ignore
        senha: Deno.env.get('API_ADMIN_PASSWORD'),
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Erro ao fazer login no BRHUB');
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;

    // Calcular peso e dimensões totais dos produtos
    let pesoTotal = 0;
    let maiorAltura = 0;
    let maiorLargura = 0;
    let maiorComprimento = 0;
    let valorTotal = 0;

    order.products.forEach((product: any) => {
      const peso = parseFloat(product.weight || '0') * product.quantity;
      const altura = parseFloat(product.height || '0');
      const largura = parseFloat(product.width || '0');
      const comprimento = parseFloat(product.depth || '0');
      const valor = parseFloat(product.price || '0') * product.quantity;

      pesoTotal += peso;
      valorTotal += valor;
      
      if (altura > maiorAltura) maiorAltura = altura;
      if (largura > maiorLargura) maiorLargura = largura;
      if (comprimento > maiorComprimento) maiorComprimento = comprimento;
    });

    // Valores padrão caso não estejam definidos
    if (pesoTotal === 0) pesoTotal = 0.3; // 300g padrão
    if (maiorAltura === 0) maiorAltura = 10;
    if (maiorLargura === 0) maiorLargura = 15;
    if (maiorComprimento === 0) maiorComprimento = 20;

    // Preparar dados do destinatário
    const destinatario = {
      nome: order.customer.name,
      cpfCnpj: order.customer.identification?.replace(/\D/g, '') || '',
      celular: order.customer.phone?.replace(/\D/g, '') || '',
      email: order.customer.email || '',
      logradouro: order.shipping_address.address,
      numero: order.shipping_address.number || 'S/N',
      complemento: order.shipping_address.floor || '',
      bairro: order.shipping_address.locality,
      localidade: order.shipping_address.city,
      uf: order.shipping_address.province,
      cep: order.shipping_address.zipcode?.replace(/\D/g, '') || '',
    };

    // Criar destinatário no sistema
    const destinatarioResponse = await fetch(`${baseApiUrl}/destinatarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(destinatario),
    });

    let destinatarioId: string;
    if (destinatarioResponse.ok) {
      const destinatarioData = await destinatarioResponse.json();
      destinatarioId = destinatarioData.data.id;
      console.log('✅ [PROCESSAR] Destinatário criado:', destinatarioId);
    } else {
      // Se falhar, tentar buscar destinatário existente pelo CPF
      const searchResponse = await fetch(
        `${baseApiUrl}/destinatarios?cpfCnpj=${destinatario.cpfCnpj}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          destinatarioId = searchData.data[0].id;
          console.log('✅ [PROCESSAR] Destinatário encontrado:', destinatarioId);
        } else {
          throw new Error('Não foi possível criar ou encontrar destinatário');
        }
      } else {
        throw new Error('Não foi possível criar ou encontrar destinatário');
      }
    }

    // Fazer cotação de frete
    const cotacaoPayload = {
      remetenteId,
      destinatarioId,
      embalagem: {
        altura: maiorAltura,
        largura: maiorLargura,
        comprimento: maiorComprimento,
        peso: pesoTotal,
        formatoObjeto: 'CAIXA_PACOTE',
      },
      valorDeclarado: valorTotal,
    };

    console.log('💰 [PROCESSAR] Cotando frete:', cotacaoPayload);

    const cotacaoResponse = await fetch(`${baseApiUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(cotacaoPayload),
    });

    if (!cotacaoResponse.ok) {
      const errorText = await cotacaoResponse.text();
      console.error('❌ [PROCESSAR] Erro na cotação:', errorText);
      throw new Error('Erro ao cotar frete');
    }

    const cotacaoData = await cotacaoResponse.json();
    console.log('✅ [PROCESSAR] Cotação realizada:', cotacaoData.data.length, 'opções');

    // Selecionar a opção de frete mais barata
    const freteEscolhido = cotacaoData.data.reduce((prev: any, current: any) => {
      const prevPreco = parseFloat(prev.preco.replace(',', '.'));
      const currentPreco = parseFloat(current.preco.replace(',', '.'));
      return currentPreco < prevPreco ? current : prev;
    });

    console.log('🚚 [PROCESSAR] Frete escolhido:', freteEscolhido.nomeServico, '- R$', freteEscolhido.preco);

    // Criar emissão de etiqueta
    const emissaoPayload = {
      remetenteId,
      destinatarioId,
      externoId: `NUVEMSHOP-${order.id}`,
      numeroNotaFiscal: order.number.toString(),
      cienteObjetoNaoProibido: true,
      cotacao: freteEscolhido,
      valorDeclarado: valorTotal,
      valorNotaFiscal: valorTotal,
      observacao: `Pedido Nuvemshop #${order.number} - ${order.shipping_option}`,
      itensDeclaracaoConteudo: order.products.map((product: any) => ({
        conteudo: product.name,
        quantidade: product.quantity.toString(),
        valor: product.price,
      })),
    };

    console.log('📦 [PROCESSAR] Criando emissão de etiqueta...');

    const emissaoResponse = await fetch(`${baseApiUrl}/frete/emitir-etiqueta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(emissaoPayload),
    });

    if (!emissaoResponse.ok) {
      const errorText = await emissaoResponse.text();
      console.error('❌ [PROCESSAR] Erro ao criar emissão:', errorText);
      throw new Error('Erro ao criar emissão de etiqueta');
    }

    const emissaoData = await emissaoResponse.json();
    console.log('✅ [PROCESSAR] Etiqueta criada com sucesso!');
    console.log('🏷️  [PROCESSAR] Código objeto:', emissaoData.data.codigoObjeto);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emissao: emissaoData.data,
        codigoObjeto: emissaoData.data.codigoObjeto,
        servico: freteEscolhido.nomeServico,
        valor: freteEscolhido.preco,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ [PROCESSAR] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
