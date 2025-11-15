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
    const { txid } = await req.json();
    console.log('Processando pagamento manual para txid:', txid);

    if (!txid) {
      return new Response(
        JSON.stringify({ success: false, error: 'txid é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(
        JSON.stringify({ success: false, error: 'Recarga não encontrada ou já processada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Recarga encontrada:', recarga.id, 'valor:', recarga.valor);

    // 2. Atualizar status da recarga para pago usando função segura
    const { error: updateError } = await supabase
      .rpc('atualizar_status_recarga', {
        p_recarga_id: recarga.id,
        p_novo_status: 'pago',
        p_data_pagamento: new Date().toISOString()
      });

    if (updateError) {
      console.error('Erro ao atualizar recarga:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar recarga' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Registrar transação de crédito (recarga)
    const { error: creditError } = await supabase.rpc('registrar_recarga', {
      p_cliente_id: recarga.cliente_id,
      p_valor: recarga.valor,
      p_descricao: `Recarga PIX (Manual) - txid: ${txid}`
    });

    if (creditError) {
      console.error('Erro ao registrar crédito:', creditError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao registrar crédito' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pagamento processado manualmente com sucesso:', txid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pagamento processado com sucesso',
        valor: recarga.valor
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao processar pagamento manual:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
