// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { faturaIds } = await req.json();
    
    if (!faturaIds || !Array.isArray(faturaIds) || faturaIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'faturaIds é obrigatório e deve ser um array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar fechamentos por fatura_id ou subfatura_id
    const { data: fechamentos, error } = await supabase
      .from('fechamentos_fatura')
      .select('*')
      .or(`fatura_id.in.(${faturaIds.join(',')}),subfatura_id.in.(${faturaIds.join(',')})`);

    if (error) {
      console.error('Erro ao buscar fechamentos:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Encontrados ${fechamentos?.length || 0} fechamentos`);

    return new Response(
      JSON.stringify({ fechamentos: fechamentos || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Erro:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
