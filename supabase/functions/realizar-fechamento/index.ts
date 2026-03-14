// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-brhub-authorization, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autenticação via JWT externo BRHUB
    const brhubToken = req.headers.get('x-brhub-authorization')?.replace('Bearer ', '') || '';
    
    if (!brhubToken) {
      return new Response(
        JSON.stringify({ status: 'error', mensagem: 'Token BRHUB não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decodificar JWT para verificar role
    let claims;
    try {
      claims = JSON.parse(atob(brhubToken.split('.')[1]));
    } catch {
      return new Response(
        JSON.stringify({ status: 'error', mensagem: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (claims.role !== 'ADMIN') {
      console.log('❌ Acesso negado - role:', claims.role);
      return new Response(
        JSON.stringify({ status: 'error', mensagem: 'Acesso restrito a administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dataInicio, dataFim } = await req.json();

    if (!dataInicio || !dataFim) {
      return new Response(
        JSON.stringify({ status: 'error', mensagem: 'dataInicio e dataFim são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 Iniciando faturamento:', { dataInicio, dataFim, userId: claims.sub });

    const apiToken = Deno.env.get('FATURAMENTO_API_TOKEN');
    
    if (!apiToken) {
      throw new Error('Token de API não configurado');
    }

    const apiUrl = `https://envios.brhubb.com.br/api/faturas/scheduler/fazer-faturamento/envios?dataInicio=${dataInicio}&dataFim=${dataFim}`;
    
    console.log('📞 Chamando API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-internal-token': apiToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de faturamento: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('✅ Faturamento realizado com sucesso');

    return new Response(
      JSON.stringify({ status: 'success', mensagem: 'Faturamento realizado com sucesso', data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao processar faturamento:', error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        mensagem: error.message || 'Erro ao processar faturamento',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
