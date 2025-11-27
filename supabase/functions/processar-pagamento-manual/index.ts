// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para validar se o usuário é admin
async function validateAdminAccess(req: Request): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { isAdmin: false, error: 'Token de autorização não fornecido' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Decodificar o JWT para verificar claims
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    console.log('🔐 Validando acesso admin...');
    console.log('📋 JWT Payload:', JSON.stringify(payload));
    
    // Verificar se tem role admin no token
    const isAdmin = payload.role === 'admin' || 
                    payload.isAdmin === true || 
                    payload.user_metadata?.role === 'admin' ||
                    payload.app_metadata?.role === 'admin';
    
    if (isAdmin) {
      console.log('✅ Usuário é admin (via JWT claims)');
      return { isAdmin: true };
    }
    
    // Fallback: verificar se é uma das credenciais de admin conhecidas
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    if (payload.email === adminEmail) {
      console.log('✅ Usuário é admin (via email)');
      return { isAdmin: true };
    }
    
    console.log('❌ Usuário não tem permissão de admin');
    return { isAdmin: false, error: 'Acesso negado: permissão de administrador necessária' };
    
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return { isAdmin: false, error: 'Token inválido' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar acesso admin ANTES de processar
    const { isAdmin, error: authError } = await validateAdminAccess(req);
    
    if (!isAdmin) {
      console.error('🚫 Acesso negado:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError || 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { txid } = await req.json();
    console.log('✅ Admin autenticado. Processando pagamento manual para txid:', txid);

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

    // 4. REGRA 2: Aplicar bônus de R$50 se recarga >= R$100
    let bonusAplicado = false;
    if (recarga.valor >= 100) {
      console.log('🎁 Aplicando bônus de R$50 (recarga >= R$100)...');
      
      const { error: bonusError } = await supabase.rpc('registrar_recarga', {
        p_cliente_id: recarga.cliente_id,
        p_valor: 50,
        p_descricao: `🎁 Bônus promocional - Recarga de R$${recarga.valor.toFixed(2)}`
      });

      if (bonusError) {
        console.error('⚠️ Erro ao aplicar bônus:', bonusError);
      } else {
        console.log('✅ Bônus de R$50 aplicado com sucesso!');
        bonusAplicado = true;
      }
    }

    console.log('Pagamento processado manualmente com sucesso:', txid, bonusAplicado ? '(com bônus)' : '');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: bonusAplicado 
          ? 'Pagamento processado com sucesso + Bônus de R$50 aplicado!' 
          : 'Pagamento processado com sucesso',
        valor: recarga.valor,
        bonus: bonusAplicado ? 50 : 0
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
