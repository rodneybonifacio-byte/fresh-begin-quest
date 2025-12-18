// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  email: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    province_code: string;
    zip: string;
    country: string;
    phone: string;
    company: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: string;
    grams: number;
    sku: string;
  }>;
}

interface ImportarPedidosRequest {
  integracaoId: string;
  clienteId: string;
  remetenteId: string;
  status?: string; // unfulfilled, fulfilled, partial, any
  limit?: number;
  orderNumbers?: string[]; // Lista de números de pedido específicos para importar
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integracaoId, clienteId, remetenteId, status = 'any', limit = 250, orderNumbers }: ImportarPedidosRequest = await req.json();
    
    console.log('🛒 [SHOPIFY] Iniciando importação de pedidos...');
    console.log('📋 [SHOPIFY] Parâmetros:', { integracaoId, clienteId, remetenteId, status, limit, orderNumbers });

    // Inicializa Supabase
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Buscar credenciais da integração
    const { data: integracao, error: integracaoError } = await supabase
      .from('integracoes')
      .select('*')
      .eq('id', integracaoId)
      .eq('cliente_id', clienteId)
      .single();

    if (integracaoError || !integracao) {
      console.error('❌ [SHOPIFY] Integração não encontrada:', integracaoError);
      throw new Error('Integração não encontrada ou não pertence ao cliente');
    }

    console.log('✅ [SHOPIFY] Integração encontrada:', integracao.plataforma);

    // Extrair credenciais
    const credenciais = integracao.credenciais as { accessToken: string; shopDomain: string };
    const accessToken = credenciais?.accessToken;
    const shopDomain = credenciais?.shopDomain;

    if (!accessToken || !shopDomain) {
      throw new Error('Credenciais inválidas na integração');
    }

    // Buscar pedidos no Shopify
    let shopifyUrl = `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&limit=${limit}`;
    
    // Se status específico foi passado e não é 'any'
    if (status && status !== 'any') {
      shopifyUrl += `&fulfillment_status=${status}`;
    }
    
    console.log('🔄 [SHOPIFY] Buscando pedidos:', shopifyUrl);

    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('❌ [SHOPIFY] Erro ao buscar pedidos:', errorText);
      throw new Error(`Erro ao buscar pedidos no Shopify: ${shopifyResponse.status}`);
    }

    const shopifyData = await shopifyResponse.json();
    let orders: ShopifyOrder[] = shopifyData.orders || [];

    console.log(`✅ [SHOPIFY] ${orders.length} pedidos encontrados no Shopify`);

    // Se foram passados números de pedido específicos, filtrar apenas esses
    if (orderNumbers && orderNumbers.length > 0) {
      const orderNumbersSet = new Set(orderNumbers.map(n => n.toString().replace('#', '')));
      orders = orders.filter(order => {
        const orderNum = order.name.replace('#', '');
        return orderNumbersSet.has(orderNum) || orderNumbersSet.has(order.order_number.toString());
      });
      console.log(`🔍 [SHOPIFY] Filtrados ${orders.length} pedidos específicos dos ${orderNumbers.length} solicitados`);
    }

    // Processar cada pedido
    const resultados = [];
    
    for (const order of orders) {
      try {
        console.log(`📦 [SHOPIFY] Processando pedido #${order.name}...`);

        // Verificar se pedido já foi importado
        const { data: existente } = await supabase
          .from('pedidos_importados')
          .select('id')
          .eq('externo_id', `SHOPIFY-${order.id}`)
          .eq('cliente_id', clienteId)
          .single();

        if (existente) {
          console.log(`⏭️  [SHOPIFY] Pedido #${order.name} já importado, pulando...`);
          resultados.push({
            orderId: order.id,
            orderName: order.name,
            status: 'skipped',
            message: 'Pedido já importado anteriormente',
          });
          continue;
        }

        // Calcular peso e valor total
        let pesoTotal = 0;
        let valorTotal = parseFloat(order.total_price);

        order.line_items.forEach((item) => {
          // Se o produto não tem peso cadastrado, considera 300g (0.3kg) por unidade
          const pesoItem = item.grams > 0 ? item.grams : 300;
          pesoTotal += (pesoItem / 1000) * item.quantity; // Converter gramas para kg
        });

        console.log(`📦 [SHOPIFY] Pedido #${order.name} - Peso calculado: ${pesoTotal}kg (${order.line_items.length} itens)`);

        // Preparar dados do destinatário
        const shipping = order.shipping_address;
        if (!shipping) {
          console.log(`⚠️  [SHOPIFY] Pedido #${order.name} sem endereço de entrega`);
          resultados.push({
            orderId: order.id,
            orderName: order.name,
            status: 'error',
            message: 'Pedido sem endereço de entrega',
          });
          continue;
        }

        // Inserir pedido na tabela de pedidos importados
        const { data: pedidoImportado, error: insertError } = await supabase
          .from('pedidos_importados')
          .insert({
            cliente_id: clienteId,
            integracao_id: integracaoId,
            remetente_id: remetenteId,
            externo_id: `SHOPIFY-${order.id}`,
            numero_pedido: order.name,
            plataforma: 'shopify',
            status: 'pendente',
            destinatario_nome: `${shipping.first_name} ${shipping.last_name}`.trim(),
            destinatario_telefone: shipping.phone || order.customer?.phone || '',
            destinatario_email: order.email || order.customer?.email || '',
            destinatario_cep: shipping.zip?.replace(/\D/g, '') || '',
            destinatario_logradouro: shipping.address1 || '',
            destinatario_numero: '', // Shopify não separa número
            destinatario_complemento: shipping.address2 || '',
            destinatario_bairro: '', // Shopify não tem bairro separado
            destinatario_cidade: shipping.city || '',
            destinatario_estado: shipping.province_code || shipping.province || '',
            valor_total: valorTotal,
            peso_total: pesoTotal,
            itens: order.line_items.map((item) => ({
              nome: item.name,
              quantidade: item.quantity,
              preco: parseFloat(item.price),
              sku: item.sku,
            })),
            dados_originais: order,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`❌ [SHOPIFY] Erro ao inserir pedido #${order.name}:`, insertError);
          resultados.push({
            orderId: order.id,
            orderName: order.name,
            status: 'error',
            message: insertError.message,
          });
          continue;
        }

        console.log(`✅ [SHOPIFY] Pedido #${order.name} importado com sucesso`);
        resultados.push({
          orderId: order.id,
          orderName: order.name,
          status: 'imported',
          pedidoId: pedidoImportado.id,
        });

      } catch (orderError) {
        console.error(`❌ [SHOPIFY] Erro ao processar pedido #${order.name}:`, orderError);
        resultados.push({
          orderId: order.id,
          orderName: order.name,
          status: 'error',
          message: orderError instanceof Error ? orderError.message : 'Erro desconhecido',
        });
      }
    }

    const importados = resultados.filter(r => r.status === 'imported').length;
    const pulados = resultados.filter(r => r.status === 'skipped').length;
    const erros = resultados.filter(r => r.status === 'error').length;

    console.log(`📊 [SHOPIFY] Resumo: ${importados} importados, ${pulados} pulados, ${erros} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        total: orders.length,
        importados,
        pulados,
        erros,
        resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ [SHOPIFY] Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
