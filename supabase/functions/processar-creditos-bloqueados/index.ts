// @ts-ignore: Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EtiquetaBloqueada {
  emissao_id: string
  cliente_id: string
  valor: number
  blocked_until: string
  descricao: string
}

interface StatusEtiqueta {
  status: string
  codigo_objeto: string | null
}

// @ts-ignore: Deno types
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🕐 [JOB] Iniciando processamento de créditos bloqueados...')
    
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
    // Login admin BRHUB é OPCIONAL — usa cache compartilhado
    let authToken: string | null = null
    try {
      authToken = await getAdminTokenCached()
      if (authToken) console.log('✅ Token admin BRHUB pronto (cache)')
    } catch (loginErr) {
      console.warn('⚠️ Falha ao obter token admin (seguindo sem token):', (loginErr as Error).message)
    }


    // 2. Buscar todas as etiquetas com créditos bloqueados
    const { data: etiquetas, error: etiquetasError } = await supabaseClient
      .rpc('buscar_etiquetas_bloqueadas')

    if (etiquetasError) {
      console.error('❌ Erro ao buscar etiquetas bloqueadas:', etiquetasError)
      throw etiquetasError
    }

    if (!etiquetas || etiquetas.length === 0) {
      console.log('✅ Nenhuma etiqueta com crédito bloqueado encontrada')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma etiqueta para processar',
          processadas: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Encontradas ${etiquetas.length} etiquetas com créditos bloqueados`)

    let consumidas = 0
    let liberadas = 0
    let mantidas = 0
    const erros: string[] = []

    // 2. Processar cada etiqueta
    for (const etiqueta of etiquetas as EtiquetaBloqueada[]) {
      try {
        console.log(`\n🔍 Processando etiqueta ${etiqueta.emissao_id}`)

        let statusEtiqueta: StatusEtiqueta | null = null

        // 🛒 Primeiro: verificar se é uma emissão MARKETPLACE (não vive na API BRHUB legada)
        const { data: mpRow } = await supabaseClient
          .from('emissoes_marketplace')
          .select('id, uuid_marketplace, codigo_objeto, status, status_rastreio')
          .or(`uuid_marketplace.eq.${etiqueta.emissao_id},id.eq.${etiqueta.emissao_id}`)
          .maybeSingle()

        if (mpRow) {
          console.log(`🛒 Etiqueta MARKETPLACE detectada (${mpRow.codigo_objeto || mpRow.uuid_marketplace})`)
          statusEtiqueta = {
            // Marketplace: a partir do momento em que a etiqueta foi emitida com sucesso,
            // ela conta para fechamento. Só permanece bloqueada enquanto status_rastreio = PRE_POSTADO.
            status: (mpRow.status_rastreio || 'POSTADO').toString(),
            codigo_objeto: mpRow.codigo_objeto || null,
          }
        } else {
          // Fluxo BRHUB tradicional: precisa de token admin
          if (!authToken) {
            console.warn(`⏭️ Etiqueta ${etiqueta.emissao_id} é BRHUB legada e não há token admin — pulando`)
            continue
          }
          // buscar status na API externa
          const emissaoResponse = await fetch(
            `${baseApiUrl}/emissoes/${etiqueta.emissao_id}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              }
            }
          )

          if (!emissaoResponse.ok) {
            console.warn(`⚠️ Não foi possível buscar status da etiqueta ${etiqueta.emissao_id}`)
            erros.push(`Etiqueta ${etiqueta.emissao_id}: erro ao buscar status`)
            continue
          }

          const emissaoData = await emissaoResponse.json()
          statusEtiqueta = {
            status: emissaoData.data?.status || 'desconhecido',
            codigo_objeto: emissaoData.data?.codigoObjeto || null
          }
        }

        console.log(`📊 Status: ${statusEtiqueta.status}`)

        // Normalizar status para evitar problemas de caixa/formato
        const statusUpper = (statusEtiqueta.status || '').toUpperCase()
        const isPrePostado = statusUpper === 'PRE_POSTADO'

        // 3. Verificar se deve consumir ou liberar
        if (!isPrePostado) {
          // Etiqueta foi postada (POSTADO / EM_TRANSITO / ENTREGUE / etc) - CONSUMIR crédito
          console.log('✅ Etiqueta postada - consumindo crédito')
          
          const { error: consumirError } = await supabaseClient
            .rpc('consumir_credito_bloqueado', {
              p_emissao_id: etiqueta.emissao_id,
              p_codigo_objeto: statusEtiqueta.codigo_objeto
            })

          if (consumirError) {
            console.error('❌ Erro ao consumir crédito:', consumirError)
            erros.push(`Etiqueta ${etiqueta.emissao_id}: erro ao consumir`)
          } else {
            consumidas++
            console.log('✅ Crédito consumido com sucesso')
          }
        } else {
          // Etiqueta ainda está em pré-postado - verificar se expirou (regra 72h)
          const blockedUntil = new Date(etiqueta.blocked_until)
          const now = new Date()

          if (now >= blockedUntil) {
            // Expirou - DELETAR crédito bloqueado (libera automaticamente)
            console.log('⏰ Etiqueta em PRE_POSTADO e prazo de 72h expirado - deletando bloqueio')
            
            const { error: deleteError } = await supabaseClient
              .from('transacoes_credito')
              .delete()
              .eq('emissao_id', etiqueta.emissao_id)
              .eq('tipo', 'consumo')
              .eq('status', 'bloqueado')

            if (deleteError) {
              console.error('❌ Erro ao deletar bloqueio:', deleteError)
              erros.push(`Etiqueta ${etiqueta.emissao_id}: erro ao liberar`)
            } else {
              liberadas++
              console.log('✅ Bloqueio deletado com sucesso (regra 72h)')
            }
          } else {
            // Ainda dentro das 72h - manter bloqueado
            const horasRestantes = Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60 * 60))
            console.log(`⏳ Etiqueta em PRE_POSTADO ainda dentro do prazo (${horasRestantes}h restantes) - mantendo bloqueado`)
            mantidas++
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar etiqueta ${etiqueta.emissao_id}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        erros.push(`Etiqueta ${etiqueta.emissao_id}: ${errorMessage}`)
      }
    }

    const resultado = {
      success: true,
      message: 'Processamento concluído',
      processadas: etiquetas.length,
      consumidas,
      liberadas,
      mantidas,
      erros: erros.length > 0 ? erros : undefined
    }

    console.log('\n📊 Resultado do processamento:', resultado)

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Erro fatal no processamento:', error)
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
