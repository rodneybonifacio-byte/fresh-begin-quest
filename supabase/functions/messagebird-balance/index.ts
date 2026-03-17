import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get('MESSAGEBIRD_ACCESS_KEY');
    if (!accessKey) {
      throw new Error('MESSAGEBIRD_ACCESS_KEY not configured');
    }

    const response = await fetch('https://rest.messagebird.com/balance', {
      headers: {
        'Authorization': `AccessKey ${accessKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MessageBird API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching MessageBird balance:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
