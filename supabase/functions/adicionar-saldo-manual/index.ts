import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { clienteId, valor } = await req.json()
    
    if (!clienteId || !valor) {
      return new Response(
        JSON.stringify({ success: false, error: 'clienteId e valor são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api'
    const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL')
    const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD')

    // Login admin
    console.log('🔐 Fazendo login admin...')
    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: API_ADMIN_EMAIL, password: API_ADMIN_PASSWORD }),
    })

    if (!loginResponse.ok) {
      throw new Error('Falha no login admin')
    }

    const loginData = await loginResponse.json()
    const adminToken = loginData.token

    // Adicionar saldo
    const addSaldoUrl = `${BASE_API_URL}/clientes/${clienteId}/add-saldo`
    console.log('💰 Adicionando saldo:', addSaldoUrl)
    
    const addSaldoResponse = await fetch(addSaldoUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        clienteId: clienteId,
        valorCredito: valor.toFixed(2),
      }),
    })

    const responseText = await addSaldoResponse.text()
    console.log('📋 Resposta add-saldo:', addSaldoResponse.status, responseText)

    if (!addSaldoResponse.ok) {
      throw new Error(`Erro ao adicionar saldo: ${responseText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Saldo adicionado com sucesso' }),
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
