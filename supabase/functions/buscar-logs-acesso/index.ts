// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar logs de acesso
    const { data: logs, error: logsError } = await supabase
      .from('logs_acesso')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      console.error('Erro ao buscar logs:', logsError);
      throw logsError;
    }

    // Buscar sessões ativas
    const { data: sessoes, error: sessoesError } = await supabase
      .from('sessoes_ativas')
      .select('*')
      .order('last_seen', { ascending: false });

    if (sessoesError) {
      console.error('Erro ao buscar sessões:', sessoesError);
      throw sessoesError;
    }

    console.log(`✅ Encontrados ${logs?.length || 0} logs e ${sessoes?.length || 0} sessões`);

    return new Response(
      JSON.stringify({ logs: logs || [], sessoes: sessoes || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
