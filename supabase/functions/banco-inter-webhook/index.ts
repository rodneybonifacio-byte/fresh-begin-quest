// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Webhook recebido:', JSON.stringify(payload));

    // Validar payload do Banco Inter - vem como array
    const { pix } = payload;
    if (!pix || !Array.isArray(pix) || pix.length === 0) {
      console.error('Payload inválido:', payload);
      return new Response('Invalid payload', { status: 400 });
    }

    // Processar cada pagamento recebido
    const pixData = pix[0]; // Pegar o primeiro pagamento
    const { txid, horario } = pixData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar a recarga pendente
    const { data: recarga, error: findError } = await supabase
      .from('recargas_pix')
      .select('*')
      .eq('txid', txid)
      .eq('status', 'pendente_pagamento')
      .single();

    if (findError || !recarga) {
      console.error('Recarga não encontrada ou já processada:', txid, findError);
      return new Response('Not found', { status: 404 });
    }

    console.log('Recarga encontrada:', recarga.id, 'valor:', recarga.valor);

    // 2. Atualizar status da recarga para pago usando função segura
    const { error: updateError } = await supabase
      .rpc('atualizar_status_recarga', {
        p_recarga_id: recarga.id,
        p_novo_status: 'pago',
        p_data_pagamento: horario || new Date().toISOString()
      });

    if (updateError) {
      console.error('Erro ao atualizar recarga:', updateError);
      return new Response('Update error', { status: 500 });
    }

    // 3. Registrar transação de crédito (recarga)
    console.log('📝 Registrando transação de crédito...');
    const { data: creditData, error: creditError } = await supabase.rpc('registrar_recarga', {
      p_cliente_id: recarga.cliente_id,
      p_valor: recarga.valor,
      p_descricao: `Recarga PIX - txid: ${txid}`
    });

    if (creditError) {
      console.error('❌ Erro ao registrar crédito:', creditError);
      return new Response('Credit error', { status: 500 });
    }

    console.log('✅ Transação de crédito registrada:', creditData);
    console.log('✅ Recarga processada com sucesso:', txid);

    return new Response(
      JSON.stringify({ success: true, message: 'Pagamento processado' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
