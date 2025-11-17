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

    console.log('Iniciando fechamento via MCP:', { dataInicio, dataFim });

    if (!dataInicio || !dataFim) {
      throw new Error('Datas de início e fim são obrigatórias');
    }

    // URL do MCP - com logs detalhados para debug
    const mcpBaseUrlEnv = Deno.env.get('MCP_URL');
    console.log('MCP_URL da variável de ambiente:', mcpBaseUrlEnv);
    
    let mcpBaseUrl = mcpBaseUrlEnv || 'https://connectores.srv762140.hstgr.cloud/mcp';
    
    // Garantir que a URL base não termine com barra
    mcpBaseUrl = mcpBaseUrl.replace(/\/$/, '');
    console.log('MCP Base URL (após limpeza):', mcpBaseUrl);
    
    // Construir a URL completa
    const mcpUrl = `${mcpBaseUrl}/fazer_faturamento_envios`;
    
    const mcpAuthToken = Deno.env.get('MCP_AUTH_TOKEN');
    
    if (!mcpAuthToken) {
      throw new Error('MCP_AUTH_TOKEN não configurado');
    }
    
    console.log('URL final para chamada MCP:', mcpUrl);
    console.log('Token presente:', mcpAuthToken ? 'SIM' : 'NÃO');

    // Chamar a função do MCP
    const mcpResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpAuthToken}`,
      },
      body: JSON.stringify({
        dataInicio,
        dataFim,
      }),
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.error('Erro ao chamar MCP:', errorText);
      throw new Error(`Erro ao processar fechamento: ${errorText}`);
    }

    const resultado = await mcpResponse.json();
    console.log('Fechamento concluído via MCP:', resultado);

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Erro no fechamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
