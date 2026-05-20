// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 🚫 WIDGET DESATIVADO
// Esta função foi desabilitada para evitar bloqueio da conta na API BRHUB.
// Sites externos que chamavam este endpoint estavam causando tentativas
// repetidas de login com credenciais possivelmente desatualizadas.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Widget de cotação desativado.',
      code: 'WIDGET_DISABLED',
    }),
    {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
