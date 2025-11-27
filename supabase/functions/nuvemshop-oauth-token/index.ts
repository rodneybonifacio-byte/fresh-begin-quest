// @ts-nocheck
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
    const { code } = await req.json();
    
    if (!code) {
      throw new Error('Authorization code não fornecido');
    }

    const clientId = Deno.env.get('NUVEMSHOP_CLIENT_ID');
    const clientSecret = Deno.env.get('NUVEMSHOP_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais da Nuvemshop não configuradas');
    }

    console.log('🔐 Trocando authorization code por access token...');
    console.log('Client ID:', clientId);

    const tokenResponse = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const responseText = await tokenResponse.text();
    console.log('📋 Response status:', tokenResponse.status);
    console.log('📋 Response body:', responseText);

    if (!tokenResponse.ok) {
      throw new Error(`Erro ao obter token: ${responseText}`);
    }

    const tokenData = JSON.parse(responseText);
    console.log('✅ Token obtido com sucesso!');
    console.log('Store ID:', tokenData.user_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          accessToken: tokenData.access_token,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          userId: tokenData.user_id, // Este é o store_id
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
