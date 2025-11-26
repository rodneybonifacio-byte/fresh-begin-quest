// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClienteAutocadastroRequest {
  nomeEmpresa: string
  nomeResponsavel: string
  cpfCnpj: string
  telefone: string
  celular: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    localidade: string
    uf: string
  }
  email: string
  senha: string
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body: ClienteAutocadastroRequest = await req.json()
    
    console.log('Iniciando criação de cliente:', body.email)

    // Validações básicas
    if (!body.email || !body.senha) {
      throw new Error('Email e senha são obrigatórios')
    }

    if (!body.nomeEmpresa || !body.cpfCnpj) {
      throw new Error('Nome da empresa e CPF/CNPJ são obrigatórios')
    }

    // @ts-ignore: Deno types
    const baseApiUrl = Deno.env.get('BASE_API_URL')
    if (!baseApiUrl) {
      throw new Error('BASE_API_URL não configurada')
    }

    // Preparar dados do cliente com todas as configurações padrão
    const clienteData = {
      nomeEmpresa: body.nomeEmpresa,
      nomeResponsavel: body.nomeResponsavel,
      cpfCnpj: body.cpfCnpj,
      email: body.email,
      senha: body.senha,
      telefone: body.telefone || '',
      celular: body.celular,
      role: 'CLIENTE',
      endereco: {
        cep: body.endereco.cep,
        logradouro: body.endereco.logradouro,
        numero: body.endereco.numero,
        complemento: body.endereco.complemento || '',
        bairro: body.endereco.bairro,
        localidade: body.endereco.localidade,
        uf: body.endereco.uf,
      },
      status: 'ATIVO',
      criadoEm: new Date().toISOString(),
      
      // Configurações padrão conforme os prints
      configuracoes: {
        aplicar_valor_declarado: true,
        incluir_valor_declarado_na_nota: true,
        periodo_faturamento: 'SEMANAL',
        horario_coleta: '08:20',
        fatura_via_whatsapp: true,
        rastreio_via_whatsapp: true,
        eventos_rastreio_habilitados_via_whatsapp: [
          'Etiqueta Gerada',
          'Objeto Postado',
          'Objeto Saiu para entrega',
          'Objeto Aguardando Retirada',
          'Objeto em Atrasos',
          'Objeto Entregue',
        ],
        valor_disparo_evento_rastreio_whatsapp: '11.11',
        link_whatsapp: '111',
      },

      // Configurações de transportadoras padrão
      transportadoraConfiguracoes: [
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
      ],
    }

    // @ts-ignore: Deno types
    const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL')
    // @ts-ignore: Deno types
    const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD')
    
    if (!API_ADMIN_EMAIL || !API_ADMIN_PASSWORD) {
      throw new Error('Credenciais de admin não configuradas')
    }

    // 1. Fazer login para obter token
    console.log('Fazendo login com credenciais de serviço...')
    const loginResponse = await fetch(`${baseApiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: API_ADMIN_EMAIL,
        password: API_ADMIN_PASSWORD,
      }),
    })

    if (!loginResponse.ok) {
      const loginError = await loginResponse.text()
      console.error('Erro ao fazer login:', loginError)
      throw new Error(`Erro ao autenticar: ${loginError}`)
    }

    const loginData = await loginResponse.json()
    const token = loginData.token
    
    if (!token) {
      throw new Error('Token não retornado no login')
    }
    
    console.log('✅ Login realizado com sucesso, token obtido')

    // 2. Enviar dados do cliente usando o token
    console.log('Enviando dados para API:', JSON.stringify({
      ...clienteData,
      senha: '***'
    }))

    // Criar cliente na API externa
    const response = await fetch(`${baseApiUrl}/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(clienteData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro na API:', errorText)
      
      // Tentar parsear o erro
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.message || errorJson.error || 'Erro ao criar cliente')
      } catch {
        throw new Error(`Erro ao criar cliente: ${errorText}`)
      }
    }

    const result = await response.json()
    console.log('✅ Cliente criado com sucesso:', result)

    // Extrair o ID do cliente criado
    const clienteId = result.data?.id || result.id
    console.log('📋 Cliente ID:', clienteId)

    // 3. Criar o remetente com os mesmos dados
    console.log('📤 Criando remetente associado ao cliente...')
    
    const remetenteData = {
      clienteId: clienteId,
      nome: clienteData.nomeEmpresa.trim(),
      cpfCnpj: clienteData.cpfCnpj,
      documentoEstrangeiro: '',
      celular: clienteData.celular,
      telefone: clienteData.telefone || '',
      email: clienteData.email.trim(),
      endereco: clienteData.endereco,
    }

    console.log('📤 Dados do remetente:', JSON.stringify(remetenteData, null, 2))

    const createRemetenteResponse = await fetch(`${baseApiUrl}/remetentes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(remetenteData),
    })

    const remetenteResponseText = await createRemetenteResponse.text()
    console.log('📥 Resposta do remetente:', remetenteResponseText.substring(0, 500))

    if (!createRemetenteResponse.ok) {
      console.error('⚠️ Erro ao criar remetente:', remetenteResponseText)
      // Não falhar todo o processo se remetente falhar
    } else {
      console.log('✅ Remetente criado com sucesso!')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        message: 'Cliente e remetente criados com sucesso' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro no autocadastro:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar cliente'
    
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
