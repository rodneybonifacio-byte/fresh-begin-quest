// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * API Externa - Consultar Cliente
 * 
 * Autenticação via API Key no header: X-API-Key
 * 
 * Endpoints:
 * GET /api-consultar-cliente?cpfCnpj=12345678900
 * GET /api-consultar-cliente?email=cliente@email.com
 * POST /api-consultar-cliente { cpfCnpj: "12345678900" }
 * POST /api-consultar-cliente { email: "cliente@email.com" }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     clienteId: "UUID",
 *     nome: "Nome do Cliente",
 *     email: "cliente@email.com",
 *     cpfCnpj: "***.***.***-**" // mascarado
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

// Mascarar CPF/CNPJ para resposta
function maskCpfCnpj(cpfCnpj: string): string {
  if (!cpfCnpj) return '';
  const cleaned = cpfCnpj.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // CPF: ***.***.***-XX
    return `***.***.***.${cleaned.slice(-2)}`;
  } else if (cleaned.length === 14) {
    // CNPJ: **.***.***/**XX-XX
    return `**.***.***/${cleaned.slice(8, 12)}-${cleaned.slice(-2)}`;
  }
  
  return '*'.repeat(cpfCnpj.length - 2) + cpfCnpj.slice(-2);
}

// Limpar CPF/CNPJ para busca
function cleanCpfCnpj(cpfCnpj: string): string {
  return cpfCnpj.replace(/\D/g, '');
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 API Consultar Cliente - Validando autenticação...');

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

    // Obter parâmetros de busca
    let cpfCnpj: string | null = null;
    let email: string | null = null;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      cpfCnpj = url.searchParams.get('cpfCnpj');
      email = url.searchParams.get('email');
    } else if (req.method === 'POST') {
      const body = await req.json();
      cpfCnpj = body.cpfCnpj;
      email = body.email;
    }

    // Validar que pelo menos um parâmetro foi fornecido
    if (!cpfCnpj && !email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Informe cpfCnpj ou email para busca',
          code: 'MISSING_PARAMETER'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar formato de email se fornecido
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Formato de email inválido',
            code: 'INVALID_PARAMETER'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Validar CPF/CNPJ se fornecido
    if (cpfCnpj) {
      const cleaned = cleanCpfCnpj(cpfCnpj);
      if (cleaned.length !== 11 && cleaned.length !== 14) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos',
            code: 'INVALID_PARAMETER'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log('🔍 Buscando cliente por:', { cpfCnpj: cpfCnpj ? '***' : null, email: email ? '***@***' : null });

    // Conectar à API externa BRHUB
    const BASE_API_URL = Deno.env.get('BASE_API_URL');
    const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL');
    const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD');

    if (!BASE_API_URL || !API_ADMIN_EMAIL || !API_ADMIN_PASSWORD) {
      console.error('❌ Credenciais da API externa não configuradas');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro de configuração do servidor',
          code: 'CONFIG_ERROR'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Login admin na API BRHUB
    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: API_ADMIN_EMAIL, password: API_ADMIN_PASSWORD }),
    });

    if (!loginResponse.ok) {
      console.error('❌ Erro ao autenticar na API externa');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro de autenticação no servidor',
          code: 'AUTH_ERROR'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.token;

    // Buscar cliente
    const searchParam = cpfCnpj ? cleanCpfCnpj(cpfCnpj) : email;
    const searchResponse = await fetch(`${BASE_API_URL}/clientes?search=${encodeURIComponent(searchParam!)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    if (!searchResponse.ok) {
      console.error('❌ Erro ao buscar cliente na API');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar cliente',
          code: 'SEARCH_ERROR'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const clientes = await searchResponse.json();
    
    // Encontrar cliente com match exato
    let clienteEncontrado = null;
    
    if (Array.isArray(clientes) && clientes.length > 0) {
      if (email) {
        // Busca por email - match exato (case insensitive)
        clienteEncontrado = clientes.find((c: any) => 
          c.email && c.email.toLowerCase() === email.toLowerCase()
        );
      } else if (cpfCnpj) {
        // Busca por CPF/CNPJ - match exato
        const cleanedSearch = cleanCpfCnpj(cpfCnpj);
        clienteEncontrado = clientes.find((c: any) => {
          const clienteCpfCnpj = c.cpfCnpj ? cleanCpfCnpj(c.cpfCnpj) : '';
          return clienteCpfCnpj === cleanedSearch;
        });
      }
    }

    if (!clienteEncontrado) {
      console.log('⚠️ Cliente não encontrado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cliente não encontrado',
          code: 'NOT_FOUND'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Cliente encontrado:', clienteEncontrado.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clienteId: clienteEncontrado.id,
          nome: clienteEncontrado.nome || clienteEncontrado.name || null,
          email: clienteEncontrado.email || null,
          cpfCnpj: clienteEncontrado.cpfCnpj ? maskCpfCnpj(clienteEncontrado.cpfCnpj) : null,
          status: clienteEncontrado.status || 'ativo',
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Erro na API:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
