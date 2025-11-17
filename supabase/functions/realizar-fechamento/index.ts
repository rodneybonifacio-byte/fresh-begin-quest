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

    // URL do MCP
    const mcpUrl = Deno.env.get('MCP_URL') || 'https://auth.srv762140.hstgr.cloud/mcp';
    
    console.log('Chamando MCP:', `${mcpUrl}/fazer_faturamento_envios`);

    // Chamar a função do MCP
    const mcpResponse = await fetch(`${mcpUrl}/fazer_faturamento_envios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
