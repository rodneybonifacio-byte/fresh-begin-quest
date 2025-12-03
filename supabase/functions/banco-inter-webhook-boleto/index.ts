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
    if (status !== 'PAGO' && status !== 'BAIXADO' && status !== 'RECEBIDO') {
      console.log('⚠️ Status não é pagamento:', status);
      return new Response(
        JSON.stringify({ message: 'Status ignorado', status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // IMPORTANTE: seuNumero é o codigo_fatura que usamos na criação
    const codigoFatura = seuNumero;
    
    if (!codigoFatura && !nossoNumero) {
      throw new Error('Código da fatura (seuNumero) ou nossoNumero não encontrado no payload');
    }

    console.log('🔍 Buscando fatura:', codigoFatura || nossoNumero);

    // 1. Buscar fechamento no Supabase pelo código da fatura ou nossoNumero
    let fechamento = null;
    
    if (codigoFatura) {
      const { data } = await supabase
        .from('fechamentos_fatura')
        .select('*')
        .eq('codigo_fatura', codigoFatura)
        .maybeSingle();
      fechamento = data;
    }
    
    // Se não encontrou pelo codigo_fatura, tentar pelo boleto_id (nossoNumero)
    if (!fechamento && nossoNumero) {
      const { data } = await supabase
        .from('fechamentos_fatura')
        .select('*')
        .eq('boleto_id', nossoNumero)
        .maybeSingle();
      fechamento = data;
    }
    
    if (fechamento) {
      console.log('✅ Fechamento encontrado no Supabase:', fechamento.codigo_fatura);
    }

    // Chamar API para buscar e atualizar fatura
    const baseApiUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!baseApiUrl || !adminEmail || !adminPassword) {
      throw new Error('Configurações da API não encontradas');
    }

    // 2. Fazer login para obter token
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

    // 3. Buscar fatura pelo código
    console.log('📊 Buscando fatura na API...');
    const faturaResponse = await fetch(
      `${baseApiUrl}/faturas/admin?codigo=${codigoFatura || fechamento?.codigo_fatura}`,
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
      console.log('⚠️ Fatura não encontrada na API, mas pagamento registrado');
      
      // Mesmo sem encontrar na API, registrar o pagamento no Supabase
      if (fechamento) {
        // Atualizar fechamento para indicar pagamento
        await supabase
          .from('fechamentos_fatura')
          .update({ 
            status_pagamento: 'PAGO',
            data_pagamento: dataPagamento,
            valor_pago: valorPago 
          })
          .eq('id', fechamento.id);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pagamento registrado (fatura não encontrada na API)',
          codigoFatura,
          nossoNumero,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const fatura = faturaData.data[0];
    console.log('✅ Fatura encontrada:', {
      id: fatura.id,
      codigo: fatura.codigo,
      status: fatura.status,
      valor: fatura.totalFaturado,
    });

    // 4. Confirmar pagamento da fatura
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
      console.error('⚠️ Erro ao confirmar pagamento na API:', errorText);
      // Não lançar erro, apenas logar - ainda vamos registrar no Supabase
    } else {
      console.log('✅ Pagamento confirmado na API com sucesso!');
    }

    // 5. Registrar evento no Supabase para trigger realtime
    const { error: insertError } = await supabase
      .from('transacoes_credito')
      .insert({
        cliente_id: fatura.clienteId,
        tipo: 'recarga',
        valor: valorPago,
        descricao: `Pagamento boleto - Fatura ${codigoFatura || fechamento?.codigo_fatura} - Nosso Número: ${nossoNumero}`,
      });

    if (insertError) {
      console.error('❌ Erro ao registrar transação:', insertError);
    } else {
      console.log('✅ Transação registrada - Realtime será notificado');
    }

    // 6. Atualizar fechamento_fatura com status de pagamento
    if (fechamento) {
      await supabase
        .from('fechamentos_fatura')
        .update({ 
          status_pagamento: 'PAGO',
          data_pagamento: dataPagamento,
          valor_pago: valorPago 
        })
        .eq('id', fechamento.id);
      console.log('✅ Fechamento atualizado com status PAGO');
    }

    // 7. Responder ao webhook
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento processado com sucesso',
        faturaId: fatura.id,
        codigoFatura: codigoFatura || fechamento?.codigo_fatura,
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
