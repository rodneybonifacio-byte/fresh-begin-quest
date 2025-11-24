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

    console.log('🚀 Iniciando faturamento:', { dataInicio, dataFim });

    // Buscar token do environment
    const apiToken = Deno.env.get('FATURAMENTO_API_TOKEN');
    
    if (!apiToken) {
      throw new Error('Token de API não configurado');
    }

    // Chamar API de faturamento
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
