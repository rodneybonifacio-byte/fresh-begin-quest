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
    
    console.log('🚀 Iniciando criação de cliente:', body.email)

    // Validações básicas
    if (!body.email || !body.senha) {
      throw new Error('Email e senha são obrigatórios')
    }

    if (!body.nomeEmpresa || !body.cpfCnpj) {
      throw new Error('Nome da empresa e CPF/CNPJ são obrigatórios')
    }

    // @ts-ignore: Deno types
    const baseApiUrl = Deno.env.get('BASE_API_URL')
    // @ts-ignore: Deno types
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore: Deno types
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
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

    // Preparar dados do cliente com configurações padrão
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
      
      // Configurações padrão
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

      // Configurações de transportadoras serão aplicadas via PUT separado após criação
    }

    // ============================================
    // PASSO 1: Login admin para criar cliente
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
    // PASSO 2: Criar cliente na API BRHUB
    // ============================================
    console.log('👤 Criando cliente na API BRHUB...')
    const clienteResponse = await fetch(`${baseApiUrl}/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(clienteData),
    })

    if (!clienteResponse.ok) {
      const errorText = await clienteResponse.text()
      console.error('❌ Erro ao criar cliente:', errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.message || errorJson.error || 'Erro ao criar cliente')
      } catch {
        throw new Error(`Erro ao criar cliente: ${errorText}`)
      }
    }

    const clienteResult = await clienteResponse.json()
    console.log('📋 Resposta completa da criação do cliente:', JSON.stringify(clienteResult, null, 2))
    
    // Tentar extrair clienteId de várias formas possíveis
    let clienteId = clienteResult.data?.id || clienteResult.id || clienteResult.data?.clienteId || clienteResult.clienteId
    console.log('✅ Cliente criado, ID inicial:', clienteId)
    
    // Se não conseguiu extrair o ID, buscar pelo email
    if (!clienteId) {
      console.log('🔍 ID não encontrado na resposta, buscando cliente pelo email...')
      
      const buscarClienteResponse = await fetch(`${baseApiUrl}/clientes?email=${encodeURIComponent(body.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      })
      
      if (buscarClienteResponse.ok) {
        const buscarResult = await buscarClienteResponse.json()
        console.log('📋 Resposta busca cliente:', JSON.stringify(buscarResult, null, 2))
        
        // Tentar extrair de array ou objeto - FILTRAR PELO EMAIL EXATO
        if (Array.isArray(buscarResult.data) && buscarResult.data.length > 0) {
          // Buscar cliente com email EXATO, não o primeiro da lista
          const clienteEncontrado = buscarResult.data.find(
            (c: any) => c.email && c.email.toLowerCase() === body.email.toLowerCase()
          )
          if (clienteEncontrado) {
            clienteId = clienteEncontrado.id || clienteEncontrado.clienteId
            console.log('✅ ClienteId encontrado por email exato:', clienteId)
          } else {
            console.log('⚠️ Nenhum cliente com email exato encontrado, tentando CPF/CNPJ...')
            // Fallback: buscar por CPF/CNPJ
            const clientePorCpf = buscarResult.data.find(
              (c: any) => c.cpfCnpj && c.cpfCnpj.replace(/\D/g, '') === body.cpfCnpj.replace(/\D/g, '')
            )
            if (clientePorCpf) {
              clienteId = clientePorCpf.id || clientePorCpf.clienteId
              console.log('✅ ClienteId encontrado por CPF/CNPJ:', clienteId)
            }
          }
        } else if (buscarResult.data?.id) {
          clienteId = buscarResult.data.id
        } else if (Array.isArray(buscarResult) && buscarResult.length > 0) {
          // Mesmo filtro para array direto
          const clienteEncontrado = buscarResult.find(
            (c: any) => c.email && c.email.toLowerCase() === body.email.toLowerCase()
          )
          if (clienteEncontrado) {
            clienteId = clienteEncontrado.id || clienteEncontrado.clienteId
          }
        }
        
        console.log('✅ ClienteId final via busca:', clienteId)
      } else {
        const buscarError = await buscarClienteResponse.text()
        console.error('⚠️ Erro ao buscar cliente:', buscarError)
      }
    }
    
    if (!clienteId) {
      console.error('❌ ERRO CRÍTICO: clienteId não foi extraído da resposta nem da busca!')
      throw new Error('Não foi possível obter o ID do cliente criado')
    }

    // ============================================
    // PASSO 2.5: Atualizar cliente com configurações de transportadora
    // IMPORTANTE: PUT requer todos os dados obrigatórios + transportadoraConfiguracoes
    // ============================================
    console.log('🚚 Atualizando cliente com configurações de transportadora...')
    
    const transportadoraPayload = {
      nomeEmpresa: body.nomeEmpresa,
      nomeResponsavel: body.nomeResponsavel,
      cpfCnpj: body.cpfCnpj,
      email: body.email,
      role: 'CLIENTE',
      celular: body.celular,
      telefone: body.telefone || '',
      endereco: {
        cep: body.endereco.cep,
        logradouro: body.endereco.logradouro,
        numero: body.endereco.numero,
        complemento: body.endereco.complemento || '',
        bairro: body.endereco.bairro,
        localidade: body.endereco.localidade,
        uf: body.endereco.uf,
      },
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
    
    console.log('📤 Payload transportadora com dados completos')
    
    const updateTransportadoraResponse = await fetch(`${baseApiUrl}/clientes/${clienteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(transportadoraPayload),
    })
    
    if (updateTransportadoraResponse.ok) {
      const updateResult = await updateTransportadoraResponse.text()
      console.log('✅ Configurações de transportadora atualizadas com sucesso:', updateResult)
    } else {
      const updateError = await updateTransportadoraResponse.text()
      console.error('⚠️ Erro ao atualizar configurações de transportadora:', updateError)
    }

    // ============================================
    // PASSO 2.6: Adicionar crédito inicial via API BRHUB
    // (Usa credenciais admin para adicionar R$50 de saldo)
    // ============================================
    const addSaldoUrl = `${baseApiUrl}/clientes/${clienteId}/add-saldo`
    console.log('💰 Adicionando crédito inicial de R$50 via API BRHUB...')
    console.log('📤 URL add-saldo:', addSaldoUrl)
    
    const addSaldoPayload = {
      clienteId: clienteId,
      valorCredito: '50.00',
    }
    console.log('📤 Payload add-saldo:', JSON.stringify(addSaldoPayload, null, 2))
    
    try {
      const addSaldoResponse = await fetch(addSaldoUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(addSaldoPayload),
      })

      const saldoResult = await addSaldoResponse.text()
      console.log('📋 Resposta add-saldo (status', addSaldoResponse.status, '):', saldoResult)
      
      if (addSaldoResponse.ok) {
        console.log('✅ Crédito inicial adicionado com sucesso via API BRHUB')
      } else {
        console.error('⚠️ Erro ao adicionar crédito via API BRHUB')
      }
    } catch (saldoErr) {
      console.error('⚠️ Exceção ao adicionar crédito via API BRHUB:', saldoErr)
    }

    // ============================================
    // PASSO 3: Login do novo usuário para obter token
    // ============================================
    console.log('🔑 Fazendo login do novo usuário para obter token...')
    let userToken = null
    
    try {
      const userLoginResponse = await fetch(`${baseApiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: body.email,
          password: body.senha,
        }),
      })

      if (userLoginResponse.ok) {
        const userLoginData = await userLoginResponse.json()
        userToken = userLoginData.token
        console.log('✅ Token do novo usuário obtido com sucesso')
      } else {
        const loginError = await userLoginResponse.text()
        console.error('⚠️ Erro ao obter token do usuário:', loginError)
      }
    } catch (loginErr) {
      console.error('⚠️ Exceção ao obter token do usuário:', loginErr)
    }

    // ============================================
    // PASSO 4: Criar remetente na API BRHUB
    // ============================================
    console.log('📤 Criando remetente na API BRHUB...')
    
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

    let remetenteId = null
    let remetenteCreated = false

    const remetenteResponse = await fetch(`${baseApiUrl}/remetentes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(remetenteData),
    })

    const remetenteResponseText = await remetenteResponse.text()
    
    if (remetenteResponse.ok) {
      try {
        const remetenteResult = JSON.parse(remetenteResponseText)
        remetenteId = remetenteResult.data?.id || remetenteResult.id
        remetenteCreated = true
        console.log('✅ Remetente criado na API BRHUB, ID:', remetenteId)
      } catch {
        console.log('✅ Remetente criado na API BRHUB (sem ID no response)')
        remetenteCreated = true
      }
    } else {
      console.error('⚠️ Erro ao criar remetente na API BRHUB:', remetenteResponseText)
    }

    // ============================================
    // PASSO 5: Sincronizar remetente no Supabase
    // ============================================
    if (supabaseUrl && supabaseServiceKey && remetenteCreated) {
      console.log('🔄 Sincronizando remetente no Supabase...')
      
      const supabaseRemetenteData = {
        id: remetenteId || crypto.randomUUID(),
        cliente_id: clienteId,
        nome: clienteData.nomeEmpresa.trim(),
        cpf_cnpj: clienteData.cpfCnpj,
        celular: clienteData.celular,
        telefone: clienteData.telefone || '',
        email: clienteData.email.trim(),
        cep: clienteData.endereco.cep,
        logradouro: clienteData.endereco.logradouro,
        numero: clienteData.endereco.numero,
        complemento: clienteData.endereco.complemento || '',
        bairro: clienteData.endereco.bairro,
        localidade: clienteData.endereco.localidade,
        uf: clienteData.endereco.uf,
        sincronizado_em: new Date().toISOString(),
      }

      try {
        const syncResponse = await fetch(
          `${supabaseUrl}/rest/v1/remetentes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(supabaseRemetenteData),
          }
        )

        if (syncResponse.ok) {
          console.log('✅ Remetente sincronizado no Supabase')
        } else {
          const syncError = await syncResponse.text()
          console.error('⚠️ Erro ao sincronizar remetente no Supabase:', syncError)
        }
      } catch (syncErr) {
        console.error('⚠️ Exceção ao sincronizar remetente:', syncErr)
      }
    }

    // ============================================
    // PASSO 6: Webhook DataCrazy CRM
    // ============================================
    console.log('📤 Enviando webhook de confirmação...')
    
    const celularApenasNumeros = body.celular.replace(/\D/g, '')
    const webhookPayload = {
      senha: body.senha,
      email: body.email,
      nome_razao_social: body.nomeEmpresa,
      celular: celularApenasNumeros,
    }

    try {
      const webhookResponse = await fetch(
        'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/31ec9957-fc43-469b-9c73-529623336d84',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        }
      )

      if (webhookResponse.ok) {
        console.log('✅ Webhook de cadastro enviado')
      } else {
        const webhookError = await webhookResponse.text()
        console.error('⚠️ Erro webhook:', webhookError)
      }
    } catch (webhookErr) {
      console.error('⚠️ Exceção webhook:', webhookErr)
    }

    // ============================================
    // PASSO 7: Contador e crédito bônus
    // ============================================
    let posicaoCadastro = 0
    let elegivelPremio = false
    let creditoAdicionado = false
    
    if (supabaseUrl && supabaseServiceKey) {
      console.log('📊 Atualizando contador de cadastros...')
      
      try {
        // Incrementar contador
        const incrementResponse = await fetch(
          `${supabaseUrl}/rest/v1/rpc/incrementar_contador_cadastro`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({}),
          }
        )
        
        if (incrementResponse.ok) {
          posicaoCadastro = await incrementResponse.json()
          elegivelPremio = posicaoCadastro <= 100
          console.log(`✅ Posição: ${posicaoCadastro}, Elegível: ${elegivelPremio}`)
          
          // REGRA 1: Se está entre os 100 primeiros, adiciona R$50
          if (elegivelPremio && clienteId) {
            console.log('🎁 Adicionando R$50 de crédito bônus para cliente:', clienteId)
            
            // Inserir diretamente na tabela transacoes_credito
            const insertCreditoResponse = await fetch(
              `${supabaseUrl}/rest/v1/transacoes_credito`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                  cliente_id: clienteId,
                  tipo: 'recarga',
                  valor: 50,
                  descricao: `🎁 Bônus dos 100 primeiros - Posição #${posicaoCadastro}`,
                  status: 'consumido',
                  cobrada: false,
                }),
              }
            )
            
            if (insertCreditoResponse.ok) {
              creditoAdicionado = true
              console.log('✅ Crédito bônus adicionado com sucesso!')
            } else {
              const errorText = await insertCreditoResponse.text()
              console.error('⚠️ Erro ao adicionar crédito bônus:', errorText, 'Status:', insertCreditoResponse.status)
            }
          } else {
            console.log('ℹ️ Cliente não elegível para bônus ou clienteId inválido. Elegível:', elegivelPremio, 'ClienteId:', clienteId)
          }
          
          // Registrar origem do cadastro
          const origemResponse = await fetch(
            `${supabaseUrl}/rest/v1/cadastros_origem`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                cliente_id: clienteId,
                origem: 'autocadastro',
                nome_cliente: body.nomeEmpresa,
                email_cliente: body.email,
                telefone_cliente: body.celular,
              }),
            }
          )
          
          if (origemResponse.ok) {
            console.log('✅ Origem do cadastro registrada')
          }
        }
      } catch (contadorErr) {
        console.error('⚠️ Erro contador:', contadorErr)
      }
    }

    // ============================================
    // RESPOSTA FINAL
    // ============================================
    console.log('🎉 Autocadastro concluído com sucesso!')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: clienteResult,
        clienteId: clienteId,
        remetenteId: remetenteId,
        userToken: userToken, // TOKEN DO NOVO USUÁRIO PARA LOGIN AUTOMÁTICO
        message: 'Cliente e remetente criados com sucesso',
        posicaoCadastro,
        elegivelPremio,
        creditoAdicionado
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro no autocadastro:', error)
    
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
