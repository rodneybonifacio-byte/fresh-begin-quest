// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper para converter para boolean
function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  return Boolean(value)
}

interface AtualizarTransportadoraRequest {
  clienteId: string
  transportadoraConfiguracoes?: Array<{
    transportadora: string
    ativo: boolean
    tipoAcrescimo: string
    valorAcrescimo: number
    porcentagem: number
    alturaMaxima?: number
    larguraMaxima?: number
    comprimentoMaximo?: number
    pesoMaximo?: number
  }>
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body: AtualizarTransportadoraRequest = await req.json()
    
    console.log('🚚 Iniciando atualização de transportadora para cliente:', body.clienteId)

    if (!body.clienteId) {
      throw new Error('clienteId é obrigatório')
    }

    // @ts-ignore: Deno types
    const baseApiUrl = Deno.env.get('BASE_API_URL')
    // @ts-ignore: Deno types
    const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL')
    // @ts-ignore: Deno types
    const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD')

    if (!baseApiUrl) {
      throw new Error('BASE_API_URL não configurada')
    }
    
    if (!API_ADMIN_EMAIL || !API_ADMIN_PASSWORD) {
      throw new Error('Credenciais de admin não configuradas')
    }

    // Configurações padrão de transportadora se não fornecidas
    const transportadoraConfiguracoes = body.transportadoraConfiguracoes || [
      {
        transportadora: 'correios',
        ativo: true,
        tipoAcrescimo: 'PERCENTUAL',
        valorAcrescimo: 5,
        porcentagem: 5,
        alturaMaxima: 100,
        larguraMaxima: 100,
        comprimentoMaximo: 100,
        pesoMaximo: 30000,
      },
      {
        transportadora: 'rodonave',
        ativo: false,
        tipoAcrescimo: 'PERCENTUAL',
        valorAcrescimo: 0,
        porcentagem: 0,
        alturaMaxima: 0,
        larguraMaxima: 0,
        comprimentoMaximo: 0,
        pesoMaximo: 0,
      },
    ]

    // ============================================
    // PASSO 1: Login admin
    // ============================================
    console.log('🔐 Fazendo login com credenciais de admin...')
    const adminLoginResponse = await fetch(`${baseApiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: API_ADMIN_EMAIL,
        password: API_ADMIN_PASSWORD,
      }),
    })

    if (!adminLoginResponse.ok) {
      const loginError = await adminLoginResponse.text()
      console.error('❌ Erro ao fazer login admin:', loginError)
      throw new Error(`Erro ao autenticar: ${loginError}`)
    }

    const adminLoginData = await adminLoginResponse.json()
    const adminToken = adminLoginData.token
    
    if (!adminToken) {
      throw new Error('Token admin não retornado no login')
    }
    console.log('✅ Login admin realizado com sucesso')

    // ============================================
    // PASSO 2: Buscar dados atuais do cliente
    // ============================================
    console.log('📋 Buscando dados atuais do cliente...')
    
    const getClienteResponse = await fetch(`${baseApiUrl}/clientes/${body.clienteId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    })
    
    if (!getClienteResponse.ok) {
      const getError = await getClienteResponse.text()
      console.error('❌ Erro ao buscar cliente:', getError)
      throw new Error(`Erro ao buscar cliente: ${getError}`)
    }
    
    const clienteResponse = await getClienteResponse.json()
    const clienteAtual = clienteResponse.data || clienteResponse
    console.log('✅ Dados do cliente obtidos:', clienteAtual.nomeEmpresa)

    // ============================================
    // PASSO 3: Atualizar cliente com configurações de transportadora
    // ============================================
    console.log('🚚 Atualizando configurações de transportadora...')
    
    // Corrigir tipos dos campos de configurações - FORÇAR conversão
    const cfg = clienteAtual.configuracoes || {}
    const configuracoesCorrigidas = {
      periodo_faturamento: cfg.periodo_faturamento || 'SEMANAL',
      horario_coleta: cfg.horario_coleta || '08:00',
      link_whatsapp: String(cfg.link_whatsapp || ''),
      // Forçar boolean
      incluir_valor_declarado_na_nota: toBoolean(cfg.incluir_valor_declarado_na_nota),
      aplicar_valor_declarado: toBoolean(cfg.aplicar_valor_declarado),
      rastreio_via_whatsapp: toBoolean(cfg.rastreio_via_whatsapp),
      fatura_via_whatsapp: toBoolean(cfg.fatura_via_whatsapp),
      // Forçar string
      valor_disparo_evento_rastreio_whatsapp: String(cfg.valor_disparo_evento_rastreio_whatsapp || '0'),
      // Arrays
      eventos_rastreio_habilitados_via_whatsapp: cfg.eventos_rastreio_habilitados_via_whatsapp || [],
    }
    
    console.log('📋 Configurações corrigidas:', JSON.stringify(configuracoesCorrigidas))
    
    // Merge dos dados existentes com as novas configurações de transportadora
    const clienteAtualizado = {
      nomeEmpresa: clienteAtual.nomeEmpresa,
      nomeResponsavel: clienteAtual.nomeResponsavel,
      cpfCnpj: clienteAtual.cpfCnpj,
      email: clienteAtual.email,
      telefone: clienteAtual.telefone || '',
      celular: clienteAtual.celular,
      role: clienteAtual.role || 'CLIENTE',
      endereco: clienteAtual.endereco,
      status: clienteAtual.status || 'ATIVO',
      configuracoes: configuracoesCorrigidas,
      transportadoraConfiguracoes,
    }
    
    console.log('📤 Enviando atualização...')
    
    const updateResponse = await fetch(`${baseApiUrl}/clientes/${body.clienteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(clienteAtualizado),
    })
    
    const responseText = await updateResponse.text()
    
    if (!updateResponse.ok) {
      console.error('❌ Erro ao atualizar configurações:', responseText)
      throw new Error(`Erro ao atualizar transportadora: ${responseText}`)
    }
    
    console.log('✅ Configurações de transportadora atualizadas com sucesso')
    
    let updateResult
    try {
      updateResult = JSON.parse(responseText)
    } catch {
      updateResult = { success: true }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updateResult,
        message: 'Configurações de transportadora atualizadas com sucesso',
        transportadoraConfiguracoes
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro ao atualizar transportadora:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        message: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
