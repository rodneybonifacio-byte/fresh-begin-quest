// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { clienteId, valor, descricao } = await req.json()
    
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
