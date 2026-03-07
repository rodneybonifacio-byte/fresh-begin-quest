// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ status: 'error', mensagem: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ status: 'error', mensagem: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const role = claimsData.claims.role;
    if (role !== 'ADMIN') {
      console.log('❌ Acesso negado - role:', role);
      return new Response(
        JSON.stringify({ status: 'error', mensagem: 'Acesso restrito a administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dataInicio, dataFim } = await req.json();

    if (!dataInicio || !dataFim) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          mensagem: 'dataInicio e dataFim são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🚀 Iniciando faturamento:', { dataInicio, dataFim, userId: claimsData.claims.sub });

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
      JSON.stringify({ 
        status: 'success', 
        mensagem: 'Faturamento realizado com sucesso',
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro ao processar faturamento:', error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        mensagem: error.message || 'Erro ao processar faturamento',
        erro_detalhado: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
