// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NuvemshopWebhook {
  event: string;
  store_id: string;
  id: number;
}

interface NuvemshopOrder {
  id: number;
  store_id: string;
  number: number;
  status: string;
  payment_status: string;
  shipping_status: string;
  customer: {
    name: string;
    email: string;
    identification: string;
    phone: string;
  };
  shipping_address: {
    address: string;
    number: string;
    floor: string;
    locality: string;
    city: string;
    province: string;
    zipcode: string;
    country: string;
  };
  products: Array<{
    name: string;
    quantity: number;
    price: string;
    weight: string;
    width: string;
    height: string;
    depth: string;
  }>;
  shipping: string;
  shipping_option: string;
  total: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  // @ts-ignore
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData: NuvemshopWebhook = await req.json();
    console.log('📦 [NUVEMSHOP] Webhook recebido:', webhookData);

    // Verificar se é um evento de pedido criado/pago
    if (webhookData.event !== 'order/created' && webhookData.event !== 'order/paid') {
      console.log('⏭️  [NUVEMSHOP] Evento ignorado:', webhookData.event);
      return new Response(
        JSON.stringify({ message: 'Evento ignorado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Buscar configurações da integração Nuvemshop do cliente
    const { data: integracaoConfig, error: configError } = await supabase
      .from('integracoes')
      .select('*')
      .eq('plataforma', 'nuvemshop')
      .eq('store_id', webhookData.store_id)
      .eq('ativo', true)
      .single();

    if (configError || !integracaoConfig) {
      console.error('❌ [NUVEMSHOP] Integração não encontrada para store_id:', webhookData.store_id);
      return new Response(
        JSON.stringify({ error: 'Integração não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Obter credenciais descriptografadas
    let accessToken: string | null = null;
    
    if (integracaoConfig.credenciais_encrypted) {
      const { data: decryptedCreds, error: decryptError } = await supabase
        .rpc('decrypt_credentials', { encrypted_data: integracaoConfig.credenciais_encrypted });
      
      if (decryptError) {
        console.error('❌ [NUVEMSHOP] Erro ao descriptografar credenciais:', decryptError);
        return new Response(
          JSON.stringify({ error: 'Erro ao descriptografar credenciais' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      accessToken = (decryptedCreds as { accessToken: string })?.accessToken;
    } else if (integracaoConfig.credenciais?.accessToken) {
      // Fallback para credenciais legadas
      accessToken = integracaoConfig.credenciais.accessToken;
    }

    if (!accessToken) {
      console.error('❌ [NUVEMSHOP] Credenciais inválidas para store_id:', webhookData.store_id);
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Buscar dados completos do pedido na API da Nuvemshop
    const orderResponse = await fetch(
      `https://api.tiendanube.com/v1/${webhookData.store_id}/orders/${webhookData.id}`,
      {
        headers: {
          'Authentication': `bearer ${accessToken}`,
          'User-Agent': 'BRHUB Envios (contato@brhub.com.br)',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!orderResponse.ok) {
      console.error('❌ [NUVEMSHOP] Erro ao buscar pedido:', orderResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados do pedido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const order: NuvemshopOrder = await orderResponse.json();
    console.log('📋 [NUVEMSHOP] Dados do pedido:', order.number);

    // Processar pedido e gerar etiqueta
    const processResult = await fetch(`${supabaseUrl}/functions/v1/processar-pedido-nuvemshop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        order,
        clienteId: integracaoConfig.cliente_id,
        remetenteId: integracaoConfig.remetente_id,
      }),
    });

    if (!processResult.ok) {
      console.error('❌ [NUVEMSHOP] Erro ao processar pedido');
      const errorData = await processResult.text();
      console.error('Detalhes do erro:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar pedido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const result = await processResult.json();
    console.log('✅ [NUVEMSHOP] Pedido processado com sucesso:', result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ [NUVEMSHOP] Erro no webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
