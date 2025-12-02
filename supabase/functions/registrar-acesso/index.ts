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
    const { clienteId, userEmail, userName, action = 'login' } = await req.json();

    if (!clienteId) {
      throw new Error('clienteId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Capturar IP e User Agent
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Registrar log de acesso
    const { error: logError } = await supabase
      .from('logs_acesso')
      .insert({
        cliente_id: clienteId,
        user_email: userEmail,
        user_name: userName,
        ip_address: ipAddress,
        user_agent: userAgent,
        action: action,
      });

    if (logError) {
      console.error('Erro ao registrar log:', logError);
    }

    // Atualizar ou criar sessão ativa
    const { error: sessionError } = await supabase
      .from('sessoes_ativas')
      .upsert({
        cliente_id: clienteId,
        user_email: userEmail,
        user_name: userName,
        last_seen: new Date().toISOString(),
        is_online: true,
      }, {
        onConflict: 'cliente_id',
      });

    if (sessionError) {
      console.error('Erro ao atualizar sessão:', sessionError);
    }

    console.log(`✅ Acesso registrado: ${userEmail} (${action})`);

    return new Response(
      JSON.stringify({ success: true, message: 'Acesso registrado com sucesso' }),
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
