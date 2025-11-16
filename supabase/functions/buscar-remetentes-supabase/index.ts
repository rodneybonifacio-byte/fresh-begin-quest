// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiToken } = await req.json();
    
    if (!apiToken) {
      throw new Error('Token de autenticação não fornecido');
    }

    // Decodificar o JWT para extrair o clienteId
    const payload = JSON.parse(atob(apiToken.split('.')[1]));
    const clienteId = payload.clienteId;

    console.log('📋 Buscando remetentes para clienteId:', clienteId);

    // Usar service role para bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('remetentes')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar remetentes:', error);
      throw new Error(error.message);
    }

    console.log('✅ Remetentes encontrados:', data?.length || 0);

    return new Response(
      JSON.stringify({
        data: data || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro ao buscar remetentes',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
