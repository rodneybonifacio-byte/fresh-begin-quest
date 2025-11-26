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
    console.log('🔧 [CORREÇÃO] Iniciando correção de consumos incorretos...')
    
    // @ts-ignore: Deno types
    const supabaseClient = createClient(
      // @ts-ignore: Deno types
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno types
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // @ts-ignore: Deno types
    const baseApiUrl = Deno.env.get('BASE_API_URL')
    // @ts-ignore: Deno types
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL')
    // @ts-ignore: Deno types
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD')
    
    if (!baseApiUrl || !adminEmail || !adminPassword) {
      throw new Error('Variáveis de ambiente não configuradas')
    }

    // 1. Fazer login com credenciais admin
    console.log('🔐 Fazendo login com credenciais de admin...')
    
    const loginResponse = await fetch(`${baseApiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    })

    if (!loginResponse.ok) {
      throw new Error('Falha na autenticação com a API externa')
    }

    const loginData = await loginResponse.json()
    const authToken = loginData.token
    console.log('✅ Login admin realizado com sucesso')

    // 2. Buscar transações consumidas que têm blocked_until expirado
    const { data: transacoesConsumidas, error: transacoesError } = await supabaseClient
      .from('transacoes_credito')
      .select('*')
      .eq('tipo', 'consumo')
      .eq('status', 'consumido')
      .not('blocked_until', 'is', null)
      .lt('blocked_until', new Date().toISOString())

    if (transacoesError) {
      console.error('❌ Erro ao buscar transações:', transacoesError)
      throw transacoesError
    }

    if (!transacoesConsumidas || transacoesConsumidas.length === 0) {
      console.log('✅ Nenhuma transação consumida incorretamente encontrada')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma correção necessária',
          corrigidas: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Encontradas ${transacoesConsumidas.length} transações potencialmente incorretas`)

    let corrigidas = 0
    const erros: string[] = []

    // 3. Para cada transação, verificar se a etiqueta está em PRE_POSTADO
    for (const transacao of transacoesConsumidas) {
      try {
        console.log(`\n🔍 Verificando transação ${transacao.id} - Etiqueta ${transacao.emissao_id}`)
        
        // Buscar status da etiqueta na API externa
        const emissaoResponse = await fetch(
          `${baseApiUrl}/emissoes/${transacao.emissao_id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            }
          }
        )

        if (!emissaoResponse.ok) {
          console.warn(`⚠️ Não foi possível buscar status da etiqueta ${transacao.emissao_id}`)
          erros.push(`Transação ${transacao.id}: erro ao buscar status`)
          continue
        }

        const emissaoData = await emissaoResponse.json()
        const statusEtiqueta = (emissaoData.data?.status || '').toUpperCase()

        console.log(`📊 Status da etiqueta: ${statusEtiqueta}`)

        // 4. Se está em PRE_POSTADO, foi consumida incorretamente - DELETAR
        if (statusEtiqueta === 'PRE_POSTADO') {
          console.log('❗ INCORRETA! Etiqueta em PRE_POSTADO foi consumida. Deletando consumo incorreto...')
          
          // Deletar a transação de consumo incorreta
          const { error: deleteError } = await supabaseClient
            .from('transacoes_credito')
            .delete()
            .eq('id', transacao.id)

          if (deleteError) {
            console.error('❌ Erro ao deletar transação:', deleteError)
            erros.push(`Transação ${transacao.id}: erro ao deletar`)
            continue
          }

          corrigidas++
          console.log(`✅ Consumo incorreto deletado: R$ ${Math.abs(transacao.valor)}`)
        } else {
          console.log(`✅ Transação correta - Etiqueta realmente foi postada (${statusEtiqueta})`)
        }

      } catch (error) {
        console.error(`❌ Erro ao processar transação ${transacao.id}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        erros.push(`Transação ${transacao.id}: ${errorMessage}`)
      }
    }

    const resultado = {
      success: true,
      message: 'Correção concluída',
      analisadas: transacoesConsumidas.length,
      corrigidas,
      corretas: transacoesConsumidas.length - corrigidas - erros.length,
      erros: erros.length > 0 ? erros : undefined
    }

    console.log('\n📊 Resultado da correção:', resultado)

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro fatal na correção:', error)
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
