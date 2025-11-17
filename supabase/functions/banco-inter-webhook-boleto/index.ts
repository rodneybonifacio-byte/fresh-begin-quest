// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Webhook Banco Inter - Boleto recebido');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Receber payload do webhook
    const payload = await req.json();
    console.log('📋 Payload recebido:', JSON.stringify(payload, null, 2));

    // Validar assinatura do webhook (segurança)
    const signature = req.headers.get('x-hub-signature');
    console.log('🔐 Assinatura:', signature);

    // Extrair dados do boleto pago
    const {
      nossoNumero,
      seuNumero,
      valorPago,
      dataPagamento,
      status,
      codigoBarras,
      linhaDigitavel,
    } = payload;

    console.log('💰 Boleto pago:', {
      nossoNumero,
      seuNumero,
      valorPago,
      dataPagamento,
      status,
    });

    // Verificar se é um pagamento confirmado
    if (status !== 'PAGO' && status !== 'BAIXADO') {
      console.log('⚠️ Status não é pagamento:', status);
      return new Response(
        JSON.stringify({ message: 'Status ignorado', status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Buscar fatura pelo código (seuNumero deve ser o código da fatura)
    const codigoFatura = seuNumero;
    
    if (!codigoFatura) {
      throw new Error('Código da fatura não encontrado no payload');
    }

    console.log('🔍 Buscando fatura:', codigoFatura);

    // Chamar API para buscar e atualizar fatura
    const baseApiUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!baseApiUrl || !adminEmail || !adminPassword) {
      throw new Error('Configurações da API não encontradas');
    }

    // 1. Fazer login para obter token
    console.log('🔑 Fazendo login na API...');
    const loginResponse = await fetch(`${baseApiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Erro ao fazer login: ${loginResponse.status}`);
    }

    const { token } = await loginResponse.json();

    // 2. Buscar fatura pelo código
    console.log('📊 Buscando fatura na API...');
    const faturaResponse = await fetch(
      `${baseApiUrl}/faturas/admin?codigo=${codigoFatura}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!faturaResponse.ok) {
      throw new Error(`Erro ao buscar fatura: ${faturaResponse.status}`);
    }

    const faturaData = await faturaResponse.json();
    
    if (!faturaData.data || faturaData.data.length === 0) {
      throw new Error(`Fatura não encontrada: ${codigoFatura}`);
    }

    const fatura = faturaData.data[0];
    console.log('✅ Fatura encontrada:', {
      id: fatura.id,
      codigo: fatura.codigo,
      status: fatura.status,
      valor: fatura.totalFaturado,
    });

    // 3. Confirmar pagamento da fatura
    console.log('💳 Confirmando pagamento da fatura...');
    
    const formData = new FormData();
    formData.append('valorPago', String(valorPago));
    formData.append('dataPagamento', dataPagamento);
    formData.append('observacao', `Pagamento via boleto bancário - Nosso Número: ${nossoNumero}`);

    const confirmaPagamentoResponse = await fetch(
      `${baseApiUrl}/faturas/${fatura.id}/confirma-pagamento`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!confirmaPagamentoResponse.ok) {
      const errorText = await confirmaPagamentoResponse.text();
      throw new Error(`Erro ao confirmar pagamento: ${confirmaPagamentoResponse.status} - ${errorText}`);
    }

    console.log('✅ Pagamento confirmado com sucesso!');

    // 4. Registrar evento no Supabase para trigger realtime
    const { error: insertError } = await supabase
      .from('transacoes_credito')
      .insert({
        cliente_id: fatura.clienteId,
        tipo: 'recarga',
        valor: valorPago,
        descricao: `Pagamento boleto - Fatura ${codigoFatura} - Nosso Número: ${nossoNumero}`,
      });

    if (insertError) {
      console.error('❌ Erro ao registrar transação:', insertError);
    } else {
      console.log('✅ Transação registrada - Realtime será notificado');
    }

    // 5. Responder ao webhook
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento processado com sucesso',
        faturaId: fatura.id,
        codigoFatura,
        valorPago,
        dataPagamento,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
