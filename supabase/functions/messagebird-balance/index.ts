import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bird API não expõe endpoint público de saldo (apenas no dashboard).
// Mantemos esta function viva para não quebrar quem ainda chama, mas
// devolvemos um payload neutro que o frontend trata como "indisponível".
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    available: false,
    provider: 'bird',
    message: 'Saldo Bird disponível apenas no painel.',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
