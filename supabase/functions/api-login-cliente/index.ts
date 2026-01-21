// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * API Externa - Login de Cliente
 * 
 * Autenticação via API Key no header: X-API-Key
 * 
 * Endpoint:
 * POST /api-login-cliente
 * {
 *   email: "cliente@email.com",
 *   senha: "senha123"
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     clienteId: "UUID",
 *     nome: "Nome do Cliente",
 *     email: "cliente@email.com",
 *     token: "jwt-token",
 *     timestamp: "2026-01-21T12:00:00.000Z"
 *   }
 * }
 */

// Validar API Key
function validateApiKey(req: Request): { valid: boolean; error?: string } {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key');
  
  if (!apiKey) {
    return { valid: false, error: 'API Key não fornecida. Use o header X-API-Key.' };
  }

  const validApiKey = Deno.env.get('BRHUB_EXTERNAL_API_KEY');
  
  if (!validApiKey) {
    console.error('❌ BRHUB_EXTERNAL_API_KEY não configurada');
    return { valid: false, error: 'Erro de configuração do servidor' };
  }

  if (apiKey !== validApiKey) {
    console.warn('⚠️ API Key inválida - tentativa de acesso bloqueada');
    return { valid: false, error: 'API Key inválida' };
  }

  return { valid: true };
}

// Extrair clienteId do JWT
function extractClienteIdFromToken(token: string): { clienteId: string | null; nome: string | null; email: string | null } {
  try {
    const [, payload] = decode(token);
    const data = payload as any;
    
    return {
      clienteId: data.clienteId || data.cliente_id || data.sub || null,
      nome: data.nome || data.name || null,
      email: data.email || null
    };
  } catch (error) {
    console.error('Erro ao decodificar JWT:', error);
    return { clienteId: null, nome: null, email: null };
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método não permitido. Use POST.',
        code: 'METHOD_NOT_ALLOWED'
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('🔐 API Login Cliente - Validando autenticação...');

    // Validar API Key
    const { valid, error: authError } = validateApiKey(req);
    
    if (!valid) {
      console.error('🚫 Acesso negado:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError,
          code: 'UNAUTHORIZED'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, senha } = body;

    // Validações
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'email é obrigatório',
          code: 'MISSING_PARAMETER'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!senha) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'senha é obrigatória',
          code: 'MISSING_PARAMETER'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Formato de email inválido',
          code: 'INVALID_PARAMETER'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 Realizando login na API BRHUB para:', email);

    // Conectar à API externa BRHUB
    const BASE_API_URL = Deno.env.get('BASE_API_URL');

    if (!BASE_API_URL) {
      console.error('❌ BASE_API_URL não configurada');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro de configuração do servidor',
          code: 'CONFIG_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Login do cliente na API BRHUB
    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha }),
    });

    if (!loginResponse.ok) {
      const status = loginResponse.status;
      
      if (status === 401 || status === 403) {
        console.warn('⚠️ Credenciais inválidas para:', email);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Email ou senha incorretos',
            code: 'INVALID_CREDENTIALS'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (status === 404) {
        console.warn('⚠️ Usuário não encontrado:', email);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('❌ Erro ao autenticar na API BRHUB:', status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro de autenticação no servidor',
          code: 'AUTH_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    if (!token) {
      console.error('❌ Token não retornado pela API');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao obter token de autenticação',
          code: 'TOKEN_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair clienteId do JWT
    const { clienteId, nome, email: tokenEmail } = extractClienteIdFromToken(token);

    if (!clienteId) {
      console.error('❌ clienteId não encontrado no token');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível identificar o cliente',
          code: 'CLIENT_ID_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Login realizado com sucesso:', { clienteId, email });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clienteId,
          nome: nome || loginData.nome || loginData.name || null,
          email: tokenEmail || email,
          token,
          timestamp: new Date().toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na API:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
