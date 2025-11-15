import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Iniciando busca de extrato...');
    
    // Pegar clienteId do body ou query params
    const url = new URL(req.url);
    let clienteId = url.searchParams.get('clienteId');
    
    if (!clienteId && req.method === 'POST') {
      const body = await req.json();
      clienteId = body.clienteId;
    }

    if (!clienteId) {
      console.error('❌ clienteId não fornecido');
      return new Response(
        JSON.stringify({ error: 'clienteId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Buscando extrato para cliente:', clienteId);

    // Criar cliente Supabase com service role (bypassa RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar transações diretamente do banco
    const { data: transacoes, error: transacoesError } = await supabase
      .from('transacoes_credito')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (transacoesError) {
      console.error('❌ Erro ao buscar transações:', transacoesError);
      throw transacoesError;
    }

    console.log('✅ Transações encontradas:', transacoes?.length || 0);

    // Calcular resumo
    const recargas = transacoes?.filter(t => t.tipo === 'recarga') || [];
    const consumos = transacoes?.filter(t => t.tipo === 'consumo') || [];

    const totalRecargas = recargas.reduce((sum, t) => sum + Number(t.valor), 0);
    const totalConsumos = consumos.reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0);

    const resumo = {
      totalRecargas,
      totalConsumos,
      quantidadeRecargas: recargas.length,
      quantidadeConsumos: consumos.length,
    };

    console.log('📈 Resumo calculado:', resumo);

    const response = {
      success: true,
      transacoes: transacoes || [],
      resumo,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Erro no edge function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
