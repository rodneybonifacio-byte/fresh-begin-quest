// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🔒 Função para validar se o usuário é admin
async function validateAdminAccess(req: Request): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { isAdmin: false, error: 'Token de autorização não fornecido' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    console.log('🔐 Validando acesso admin...');
    
    const isAdmin = payload.role === 'admin' || 
                    payload.role === 'ADMIN' ||
                    payload.isAdmin === true || 
                    payload.user_metadata?.role === 'admin' ||
                    payload.app_metadata?.role === 'admin';
    
    if (isAdmin) {
      console.log('✅ Usuário é admin (via JWT claims)');
      return { isAdmin: true };
    }
    
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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 🔒 Validar acesso admin ANTES de processar
    const { isAdmin, error: authError } = await validateAdminAccess(req);
    
    if (!isAdmin) {
      console.error('🚫 Acesso negado:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError || 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { clienteId, valor, descricao } = await req.json()
    console.log('✅ Admin autenticado. Removendo saldo:', { clienteId, valor });
    
    if (!clienteId || !valor) {
      return new Response(
        JSON.stringify({ success: false, error: 'clienteId e valor são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('💰 Removendo saldo do cliente:', clienteId, 'Valor:', valor)

    // Registrar transação de consumo no Supabase usando service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error: insertError } = await supabase.from('transacoes_credito').insert({
      cliente_id: clienteId,
      tipo: 'consumo',
      valor: -Math.abs(valor),
      descricao: descricao || 'Crédito removido pelo administrador',
      status: 'consumido',
    })

    if (insertError) {
      console.error('❌ Erro ao registrar transação:', insertError)
      throw new Error(insertError.message)
    }

    console.log('✅ Crédito removido com sucesso')

    return new Response(
      JSON.stringify({ success: true, message: 'Crédito removido com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Erro:', error?.message || error)
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})