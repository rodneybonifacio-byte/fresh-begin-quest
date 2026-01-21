// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { decode } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * API Externa - Consultar Saldo do Cliente
 * 
 * Autenticação via API Key no header: X-API-Key
 * 
 * Endpoints:
 * GET /api-consultar-saldo?clienteId=UUID
 * POST /api-consultar-saldo { clienteId: "UUID" }
 * POST /api-consultar-saldo { email: "...", senha: "..." } // via login
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     clienteId: "UUID",
 *     saldoDisponivel: 1250.50,
 *     creditosBloqueados: 50.00,
 *     creditosConsumidos: 200.00,
 *     totalRecargas: 1500.50
 *   }
 * }
 */

// Validar API Key
async function validateApiKey(req: Request): Promise<{ valid: boolean; error?: string }> {
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
    console.warn('⚠️ API Key inválida tentativa de acesso');
    return { valid: false, error: 'API Key inválida' };
  }

  return { valid: true };
}

// Extrair clienteId do JWT
function extractClienteIdFromToken(token: string): { clienteId: string | null } {
  try {
    const [, payload] = decode(token);
    const data = payload as any;
    return {
      clienteId: data.clienteId || data.cliente_id || data.sub || null
    };
  } catch (error) {
    console.error('Erro ao decodificar JWT:', error);
    return { clienteId: null };
  }
}

// Fazer login na API BRHUB e obter clienteId
async function loginAndGetClienteId(email: string, senha: string): Promise<{ clienteId: string | null; error?: string }> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL');
  
  if (!BASE_API_URL) {
    return { clienteId: null, error: 'Erro de configuração do servidor' };
  }

  try {
    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha }),
    });

    if (!loginResponse.ok) {
      const status = loginResponse.status;
      if (status === 401 || status === 403) {
        return { clienteId: null, error: 'Email ou senha incorretos' };
      }
      if (status === 404) {
        return { clienteId: null, error: 'Usuário não encontrado' };
      }
      return { clienteId: null, error: 'Erro de autenticação' };
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    if (!token) {
      return { clienteId: null, error: 'Token não retornado' };
    }

    const { clienteId } = extractClienteIdFromToken(token);
    
    if (!clienteId) {
      return { clienteId: null, error: 'ClienteId não encontrado no token' };
    }

    return { clienteId };
  } catch (error) {
    console.error('Erro no login:', error);
    return { clienteId: null, error: 'Erro ao conectar com servidor de autenticação' };
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 API Consultar Saldo - Validando autenticação...');

    // Validar API Key
    const { valid, error: authError } = await validateApiKey(req);
    
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

    // Obter clienteId (direto ou via login)
    let clienteId: string | null = null;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      clienteId = url.searchParams.get('clienteId');
    } else if (req.method === 'POST') {
      const body = await req.json();
      clienteId = body.clienteId;
      
      // Se não tem clienteId, tentar via login
      if (!clienteId && body.email && body.senha) {
        console.log('🔑 Fazendo login para obter clienteId:', body.email);
        
        const loginResult = await loginAndGetClienteId(body.email, body.senha);
        
        if (!loginResult.clienteId) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: loginResult.error || 'Erro ao identificar cliente',
              code: 'AUTH_ERROR'
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        clienteId = loginResult.clienteId;
        console.log('✅ ClienteId obtido via login:', clienteId);
      }
    }

    if (!clienteId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Informe clienteId ou (email + senha) para identificar o cliente',
          code: 'MISSING_PARAMETER'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clienteId)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'clienteId deve ser um UUID válido',
          code: 'INVALID_PARAMETER'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('📊 Consultando saldo para cliente:', clienteId);

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todas as transações do cliente
    const { data: transacoes, error: transacoesError } = await supabase
      .from('transacoes_credito')
      .select('tipo, valor, status')
      .eq('cliente_id', clienteId);

    if (transacoesError) {
      console.error('❌ Erro ao buscar transações:', transacoesError);
      throw new Error('Erro ao consultar dados do cliente');
    }

    // Calcular valores
    let totalRecargas = 0;
    let creditosBloqueados = 0;
    let creditosConsumidos = 0;

    for (const t of transacoes || []) {
      if (t.tipo === 'recarga') {
        totalRecargas += Number(t.valor) || 0;
      } else if (t.tipo === 'consumo') {
        if (t.status === 'bloqueado') {
          creditosBloqueados += Math.abs(Number(t.valor) || 0);
        } else if (t.status === 'consumido') {
          creditosConsumidos += Math.abs(Number(t.valor) || 0);
        }
      }
    }

    const saldoDisponivel = totalRecargas - creditosBloqueados - creditosConsumidos;

    console.log('✅ Saldo calculado:', {
      totalRecargas,
      creditosBloqueados,
      creditosConsumidos,
      saldoDisponivel
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clienteId,
          saldoDisponivel: Number(saldoDisponivel.toFixed(2)),
          creditosBloqueados: Number(creditosBloqueados.toFixed(2)),
          creditosConsumidos: Number(creditosConsumidos.toFixed(2)),
          totalRecargas: Number(totalRecargas.toFixed(2)),
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
