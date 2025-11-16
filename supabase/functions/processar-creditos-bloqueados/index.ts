// @ts-ignore: Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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
    if (!baseApiUrl) {
      throw new Error('BASE_API_URL não configurada')
    }

    // 1. Buscar todas as etiquetas com créditos bloqueados
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
        
        // Buscar status da etiqueta na API externa
        const emissaoResponse = await fetch(
          `${baseApiUrl}/emissoes/${etiqueta.emissao_id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )

        if (!emissaoResponse.ok) {
          console.warn(`⚠️ Não foi possível buscar status da etiqueta ${etiqueta.emissao_id}`)
          erros.push(`Etiqueta ${etiqueta.emissao_id}: erro ao buscar status`)
          continue
        }

        const emissaoData = await emissaoResponse.json()
        const statusEtiqueta: StatusEtiqueta = {
          status: emissaoData.data?.status || 'desconhecido',
          codigo_objeto: emissaoData.data?.codigoObjeto || null
        }

        console.log(`📊 Status: ${statusEtiqueta.status}`)

        // 3. Verificar se deve consumir ou liberar
        if (statusEtiqueta.status !== 'pre-postado') {
          // Etiqueta foi postada - CONSUMIR crédito
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
          // Etiqueta ainda está em pré-postado - verificar se expirou
          const blockedUntil = new Date(etiqueta.blocked_until)
          const now = new Date()

          if (now >= blockedUntil) {
            // Expirou - LIBERAR crédito
            console.log('⏰ Etiqueta expirou (72h) - liberando crédito')
            
            const { error: liberarError } = await supabaseClient
              .rpc('liberar_credito_bloqueado', {
                p_emissao_id: etiqueta.emissao_id,
                p_codigo_objeto: statusEtiqueta.codigo_objeto
              })

            if (liberarError) {
              console.error('❌ Erro ao liberar crédito:', liberarError)
              erros.push(`Etiqueta ${etiqueta.emissao_id}: erro ao liberar`)
            } else {
              liberadas++
              console.log('✅ Crédito liberado com sucesso')
            }
          } else {
            // Ainda dentro das 72h - manter bloqueado
            const horasRestantes = Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60 * 60))
            console.log(`⏳ Ainda dentro do prazo (${horasRestantes}h restantes) - mantendo bloqueado`)
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
