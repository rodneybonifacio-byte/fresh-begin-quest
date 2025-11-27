// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📤 Enviando teste para webhook DataCrazy...')
    
    const webhookPayload = {
      senha: 'SenhaFake123!',
      email: 'teste@exemplo.com.br',
      nome_razao_social: 'Empresa Teste LTDA',
      celular: '(11) 9 9999-8888',
    }

    console.log('Payload:', JSON.stringify(webhookPayload, null, 2))

    const webhookResponse = await fetch(
      'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/31ec9957-fc43-469b-9c73-529623336d84',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      }
    )

    const responseText = await webhookResponse.text()
    console.log('Status:', webhookResponse.status)
    console.log('Response:', responseText)

    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok,
        status: webhookResponse.status,
        payload_enviado: webhookPayload,
        resposta: responseText
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
