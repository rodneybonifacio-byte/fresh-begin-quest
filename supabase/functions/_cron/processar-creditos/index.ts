// @ts-ignore: Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore: Deno types
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('⏰ [CRON] Executando job de processamento de créditos bloqueados...')
    
    // @ts-ignore: Deno types
    const supabaseClient = createClient(
      // @ts-ignore: Deno types
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno.env
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Invocar a edge function de processamento
    const { data, error } = await supabaseClient.functions.invoke('processar-creditos-bloqueados', {
      body: {}
    })

    if (error) {
      console.error('❌ Erro ao processar créditos:', error)
      throw error
    }

    console.log('✅ Processamento concluído:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Job executado com sucesso',
        resultado: data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro no job CRON:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
