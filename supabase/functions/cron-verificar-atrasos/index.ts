// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface EmissaoResponse {
  id: string
  codigoObjeto: string
  status: string
  servico?: string
  cliente?: {
    id: string
    nome: string
  }
  remetenteNome?: string
  destinatario?: {
    nome: string
  }
}

interface RastreioData {
  codigoObjeto: string
  dataPrevisaoEntrega: string
  eventos: Array<{
    codigo: string
    descricao: string
    date: string
  }>
}

interface RastreioResponse {
  data: RastreioData
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function loginAdmin(): Promise<string> {
  const baseApiUrl = Deno.env.get('BASE_API_URL')
  const email = Deno.env.get('API_ADMIN_EMAIL')
  const password = Deno.env.get('API_ADMIN_PASSWORD')

  console.log('[CRON-ATRASOS] Iniciando login admin...')

  const response = await fetch(`${baseApiUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(`Falha no login admin: ${response.status}`)
  }

  const data = await response.json()
  console.log('[CRON-ATRASOS] Login admin bem-sucedido')
  return data.token
}

async function fetchEmissoesEmTransito(token: string): Promise<EmissaoResponse[]> {
  const baseApiUrl = Deno.env.get('BASE_API_URL')
  const allEmissoes: EmissaoResponse[] = []
  let offset = 0
  const limit = 100
  let hasMore = true

  console.log('[CRON-ATRASOS] Buscando emissões em trânsito...')

  while (hasMore) {
    const response = await fetch(
      `${baseApiUrl}/emissoes/admin?status=EM_TRANSITO&limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`[CRON-ATRASOS] Erro ao buscar emissões: ${response.status}`)
      break
    }

    const result = await response.json()
    const emissoes = result.data || []
    
    allEmissoes.push(...emissoes)
    
    if (emissoes.length < limit) {
      hasMore = false
    } else {
      offset += limit
    }
  }

  console.log(`[CRON-ATRASOS] Total de emissões em trânsito: ${allEmissoes.length}`)
  return allEmissoes
}

async function fetchRastreio(token: string, codigoObjeto: string): Promise<RastreioResponse | null> {
  const baseApiUrl = Deno.env.get('BASE_API_URL')

  try {
    const response = await fetch(
      `${baseApiUrl}/rastrear?codigo=${codigoObjeto}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.warn(`[CRON-ATRASOS] Erro ao rastrear ${codigoObjeto}: ${response.status}`)
      return null
    }

    const result = await response.json()
    return result
  } catch (err) {
    console.warn(`[CRON-ATRASOS] Exceção ao rastrear ${codigoObjeto}:`, err)
    return null
  }
}

async function salvarEmissaoAtrasada(supabase: any, emissao: EmissaoResponse, dataPrevisao: string): Promise<boolean> {
  try {
    // Upsert para evitar duplicatas
    const { error } = await supabase
      .from('emissoes_em_atraso')
      .upsert({
        emissao_id: emissao.id,
        codigo_objeto: emissao.codigoObjeto,
        data_previsao_entrega: new Date(dataPrevisao).toISOString(),
        detectado_em: new Date().toISOString(),
        cliente_id: emissao.cliente?.id || null,
        remetente_nome: emissao.remetenteNome || null,
        destinatario_nome: emissao.destinatario?.nome || null,
        servico: emissao.servico || null,
      }, {
        onConflict: 'emissao_id',
      })

    if (error) {
      console.warn(`[CRON-ATRASOS] Erro ao salvar emissão ${emissao.codigoObjeto}:`, error.message)
      return false
    }

    console.log(`[CRON-ATRASOS] ✅ Emissão ${emissao.codigoObjeto} salva na tabela emissoes_em_atraso`)
    return true
  } catch (err) {
    console.warn(`[CRON-ATRASOS] Exceção ao salvar emissão ${emissao.codigoObjeto}:`, err)
    return false
  }
}

function parseDataPrevisao(dataPrevisao: string): Date | null {
  if (!dataPrevisao) return null

  // Tenta parsear diferentes formatos
  // Formato ISO: 2024-12-15T00:00:00
  // Formato BR: 15/12/2024
  let parsed: Date | null = null

  if (dataPrevisao.includes('T')) {
    parsed = new Date(dataPrevisao)
  } else if (dataPrevisao.includes('/')) {
    const [dia, mes, ano] = dataPrevisao.split('/')
    parsed = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
  } else if (dataPrevisao.includes('-')) {
    parsed = new Date(dataPrevisao)
  }

  if (parsed && isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function isAtrasado(dataPrevisao: Date): boolean {
  const hoje = new Date()
  // Zerar horas para comparar apenas datas
  hoje.setHours(0, 0, 0, 0)
  dataPrevisao.setHours(0, 0, 0, 0)
  
  return hoje > dataPrevisao
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[CRON-ATRASOS] Iniciando verificação de atrasos...')
    const startTime = Date.now()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Login como admin
    const token = await loginAdmin()

    // Buscar emissões em trânsito
    const emissoesEmTransito = await fetchEmissoesEmTransito(token)

    if (emissoesEmTransito.length === 0) {
      console.log('[CRON-ATRASOS] Nenhuma emissão em trânsito encontrada')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma emissão em trânsito para verificar',
          totalVerificadas: 0,
          totalAtrasadas: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalAtrasadas = 0
    let totalVerificadas = 0

    // Processar cada emissão
    for (const emissao of emissoesEmTransito) {
      if (!emissao.codigoObjeto) continue

      totalVerificadas++

      // Buscar rastreio
      const rastreio = await fetchRastreio(token, emissao.codigoObjeto)
      
      if (!rastreio?.data?.dataPrevisaoEntrega) {
        console.log(`[CRON-ATRASOS] Sem previsão de entrega para ${emissao.codigoObjeto}`)
        continue
      }

      const dataPrevisao = parseDataPrevisao(rastreio.data.dataPrevisaoEntrega)
      
      if (!dataPrevisao) {
        console.log(`[CRON-ATRASOS] Não foi possível parsear data: ${rastreio.data.dataPrevisaoEntrega}`)
        continue
      }

      if (isAtrasado(dataPrevisao)) {
        console.log(`[CRON-ATRASOS] Emissão ${emissao.codigoObjeto} está atrasada! Previsão: ${rastreio.data.dataPrevisaoEntrega}`)
        
        // Salvar na tabela do Supabase em vez de atualizar API externa
        const salvo = await salvarEmissaoAtrasada(supabase, emissao, rastreio.data.dataPrevisaoEntrega)
        if (salvo) {
          totalAtrasadas++
        }
      }

      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    const duration = Date.now() - startTime
    console.log(`[CRON-ATRASOS] Verificação concluída em ${duration}ms. Total verificadas: ${totalVerificadas}, Atrasadas: ${totalAtrasadas}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verificação de atrasos concluída',
        totalVerificadas,
        totalAtrasadas,
        durationMs: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[CRON-ATRASOS] Erro:', errorMessage)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
