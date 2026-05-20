// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🚫 DESATIVADO — usa as mesmas credenciais widget que estavam causando bloqueio na API BRHUB.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ error: 'Widget de cotação desativado.', code: 'WIDGET_DISABLED' }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
