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
    let mcpUrl = Deno.env.get('MCP_URL') || 'https://connectores.srv762140.hstgr.cloud/mcp';
    mcpUrl = mcpUrl.replace(/\/$/, ''); // Remove trailing slash
    
    const mcpAuthToken = Deno.env.get('MCP_AUTH_TOKEN');
    
    if (!mcpAuthToken) {
      throw new Error('MCP_AUTH_TOKEN não configurado');
    }
    
    console.log('Chamando MCP via JSON-RPC:', mcpUrl);

    // Chamar a função do MCP usando JSON-RPC 2.0
    const mcpResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpAuthToken}`,
        'Accept': 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'fazer_faturamento_envios',
          arguments: {
            dataInicio,
            dataFim,
          }
        },
        id: Date.now(),
      }),
    });

    console.log('Status da resposta MCP:', mcpResponse.status);
    console.log('Content-Type:', mcpResponse.headers.get('content-type'));

    // Capturar a resposta como texto primeiro para debug
    const responseText = await mcpResponse.text();
    console.log('Resposta MCP (texto):', responseText.substring(0, 500));

    // Verificar se não é 2xx
    if (!mcpResponse.ok) {
      throw new Error(`MCP retornou erro ${mcpResponse.status}: ${responseText.substring(0, 200)}`);
    }

    // Tentar fazer parse do JSON
    let resultado;
    try {
      resultado = JSON.parse(responseText);
      console.log('Resposta MCP parseada:', resultado);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      throw new Error(`Resposta MCP não é JSON válido. Status: ${mcpResponse.status}, Conteúdo: ${responseText.substring(0, 200)}`);
    }

    // Verificar resposta JSON-RPC
    if (resultado.error) {
      console.error('Erro JSON-RPC:', resultado.error);
      throw new Error(`Erro ao processar fechamento: ${resultado.error.message}`);
    }

    if (!resultado.result) {
      throw new Error('Resposta MCP inválida: sem campo result');
    }

    console.log('Fechamento concluído via MCP:', resultado.result);

    return new Response(
      JSON.stringify(resultado.result),
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
