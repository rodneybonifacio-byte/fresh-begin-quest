// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // API pública para widget - sem necessidade de API Key
    // As credenciais do cliente são gerenciadas no backend via secrets

    const requestData = await req.json();
    console.log('🚚 Widget: Iniciando cotação de frete...');

    // Validar campos obrigatórios
    const { cepOrigem, cepDestino, peso, altura, largura, comprimento, valorDeclarado } = requestData;

    if (!cepOrigem || !cepDestino) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'CEP de origem e destino são obrigatórios',
          code: 'MISSING_CEPS'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!peso || !altura || !largura || !comprimento) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Dimensões (peso, altura, largura, comprimento) são obrigatórias',
          code: 'MISSING_DIMENSIONS'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Usar credenciais do secret (seguro no backend)
    const clienteEmail = Deno.env.get('WIDGET_CLIENT_EMAIL');
    const clienteSenha = Deno.env.get('WIDGET_CLIENT_PASSWORD');

    if (!clienteEmail || !clienteSenha) {
      console.error('❌ Credenciais do widget não configuradas');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Widget não configurado corretamente',
          code: 'WIDGET_NOT_CONFIGURED'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const baseUrl = Deno.env.get('BASE_API_URL');
    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    // 1. Fazer login do cliente para obter token
    console.log('🔐 Autenticando cliente:', clienteEmail);
    
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clienteEmail, senha: clienteSenha }),
    });

    if (!loginResponse.ok) {
      const loginError = await loginResponse.text();
      console.error('❌ Erro no login:', loginError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const loginData = await loginResponse.json();
    const userToken = loginData.token || loginData.data?.token;

    if (!userToken) {
      throw new Error('Token não retornado pelo login');
    }

    // Extrair clienteId do token
    let clienteId = null;
    try {
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      clienteId = tokenPayload.clienteId;
      console.log('👤 ClienteId:', clienteId);
    } catch (e) {
      console.error('❌ Erro ao extrair clienteId:', e.message);
      throw new Error('Token inválido');
    }

    // 2. Realizar cotação
    const cotacaoPayload = {
      cepOrigem: cepOrigem.replace(/\D/g, ''),
      cepDestino: cepDestino.replace(/\D/g, ''),
      embalagem: {
        peso: String(peso),
        altura: String(altura),
        largura: String(largura),
        comprimento: String(comprimento),
        diametro: "0"
      },
      valorDeclarado: Number(valorDeclarado) || 0,
      clienteId,
    };

    console.log('📦 Payload cotação:', JSON.stringify(cotacaoPayload));

    const cotacaoResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cotacaoPayload),
    });

    const responseText = await cotacaoResponse.text();
    console.log('📄 Status cotação:', cotacaoResponse.status);

    if (!cotacaoResponse.ok) {
      console.error('❌ Erro na cotação:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao calcular frete',
          details: responseText,
          code: 'QUOTATION_ERROR'
        }),
        { 
          status: cotacaoResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const cotacaoData = JSON.parse(responseText);
    const opcoes = cotacaoData.data || [];

    console.log('✅ Cotação realizada:', opcoes.length, 'opções');

    // Formatar resposta para o widget
    const opcoesFormatadas = opcoes.map((opcao: any) => ({
      codigo: opcao.codigoServico,
      servico: opcao.nomeServico,
      transportadora: opcao.transportadora || 'Correios',
      preco: opcao.preco,
      precoNumerico: parseFloat(opcao.preco.replace(',', '.').replace(/[^\d.]/g, '')),
      prazo: opcao.prazo,
      prazoTexto: `${opcao.prazo} dia${opcao.prazo > 1 ? 's' : ''} útil${opcao.prazo > 1 ? 'is' : ''}`,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          origem: cepOrigem,
          destino: cepDestino,
          opcoes: opcoesFormatadas,
          totalOpcoes: opcoesFormatadas.length,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
