// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Iniciando busca de recargas...');
    
    const url = new URL(req.url);
    let clienteId = url.searchParams.get('clienteId');
    let limit = parseInt(url.searchParams.get('limit') || '100');
    
    if (!clienteId && req.method === 'POST') {
      const body = await req.json();
      clienteId = body.clienteId;
      limit = body.limit || 100;
    }

    if (!clienteId) {
      console.error('❌ clienteId não fornecido');
      return new Response(
        JSON.stringify({ success: false, error: 'clienteId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Buscando recargas para cliente:', clienteId);

    // @ts-ignore: Deno.env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore: Deno.env
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: recargas, error } = await supabase
      .from('recargas_pix')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('data_criacao', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar recargas:', error);
      throw error;
    }

    console.log('✅ Recargas encontradas:', recargas?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        data: recargas || []
      }),
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
