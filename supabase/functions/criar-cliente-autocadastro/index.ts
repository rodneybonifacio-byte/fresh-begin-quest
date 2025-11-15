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

    console.log('Enviando dados para API:', JSON.stringify({
      ...clienteData,
      senha: '***'
    }))

    // Autenticar na API para obter o token
    console.log('Autenticando na API...')
    const loginResponse = await fetch(`${baseApiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: 'financeiro@brhubb.com.br',
        senha: 'Senh@de16letras'
      }),
    })

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text()
      console.error('Erro na autenticação:', errorText)
      throw new Error(`Erro ao autenticar: ${errorText}`)
    }

    const loginData = await loginResponse.json()
    const token = loginData.token
    console.log('Autenticação realizada com sucesso')

    // Criar cliente na API externa com o token de autenticação
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
    console.log('Cliente criado com sucesso:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        message: 'Cliente criado com sucesso' 
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
