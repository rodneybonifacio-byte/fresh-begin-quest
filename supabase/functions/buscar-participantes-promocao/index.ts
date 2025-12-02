// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 Buscando participantes de promoções...')
    
    // @ts-ignore: Deno types
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore: Deno types
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração Supabase não encontrada')
    }

    // Buscar transações de bônus
    console.log('📊 Buscando transações de bônus...')
    const bonusResponse = await fetch(
      `${supabaseUrl}/rest/v1/transacoes_credito?select=*&tipo=eq.recarga&or=(descricao.like.%25100%20primeiros%25,descricao.like.%25B%C3%B4nus%20Recarga%25,descricao.like.%25B%C3%B4nus%25)&order=created_at.asc`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    )

    if (!bonusResponse.ok) {
      throw new Error('Erro ao buscar transações de bônus')
    }

    const bonusTransacoes = await bonusResponse.json()
    console.log(`✅ ${bonusTransacoes.length} transações de bônus encontradas`)

    // Buscar todos os remetentes
    console.log('👥 Buscando dados dos remetentes...')
    const remetentesResponse = await fetch(
      `${supabaseUrl}/rest/v1/remetentes?select=cliente_id,nome,telefone,celular,email`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    )

    if (!remetentesResponse.ok) {
      throw new Error('Erro ao buscar remetentes')
    }

    const remetentes = await remetentesResponse.json()
    console.log(`✅ ${remetentes.length} remetentes encontrados`)

    // Criar mapa de remetentes (primeiro de cada cliente)
    const remetentesMap = new Map<string, any>()
    for (const r of remetentes) {
      if (!remetentesMap.has(r.cliente_id)) {
        remetentesMap.set(r.cliente_id, r)
      }
    }

    // Processar participantes
    const participantes: any[] = []
    const clienteIdsProcessados = new Set<string>()

    for (const transacao of bonusTransacoes) {
      if (clienteIdsProcessados.has(transacao.cliente_id)) continue
      clienteIdsProcessados.add(transacao.cliente_id)

      const remetenteData = remetentesMap.get(transacao.cliente_id)
      
      // Buscar saldo
      const saldoResponse = await fetch(
        `${supabaseUrl}/rest/v1/rpc/calcular_saldo_disponivel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ p_cliente_id: transacao.cliente_id }),
        }
      )
      
      const saldo = saldoResponse.ok ? await saldoResponse.json() : 0

      // Determinar tipo de promoção
      const is100Primeiros = transacao.descricao?.includes('100 primeiros')
      
      // Extrair posição
      const posicaoMatch = transacao.descricao?.match(/#(\d+)/)
      const posicao = posicaoMatch ? posicaoMatch[1] : participantes.length + 1

      participantes.push({
        clienteId: transacao.cliente_id,
        nome: remetenteData?.nome || `Cliente #${posicao}`,
        telefone: remetenteData?.telefone || remetenteData?.celular || '-',
        email: remetenteData?.email || '-',
        saldoDisponivel: saldo || 0,
        dataCredito: transacao.created_at || '',
        tipoPromocao: is100Primeiros ? '100_primeiros' : 'bonus_recarga',
      })
    }

    console.log(`🎉 ${participantes.length} participantes processados`)

    return new Response(
      JSON.stringify({ success: true, participantes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
