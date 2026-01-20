// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * API Externa - Adicionar Crédito ao Cliente
 * 
 * Autenticação via API Key no header: X-API-Key
 * 
 * Endpoint:
 * POST /api-adicionar-credito
 * {
 *   clienteId: "UUID",
 *   valor: 100.00,
 *   descricao: "Recarga via plataforma Tech",
 *   referencia?: "ORDER-12345" // ID externo opcional para rastreabilidade
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     transacaoId: "UUID",
 *     clienteId: "UUID",
 *     valor: 100.00,
 *     novoSaldo: 350.00,
 *     referencia: "ORDER-12345"
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
    console.warn('⚠️ API Key inválida - tentativa de acesso bloqueada');
    return { valid: false, error: 'API Key inválida' };
  }

  return { valid: true };
}

// Calcular saldo disponível
async function calcularSaldoDisponivel(supabase: any, clienteId: string): Promise<number> {
  const { data: transacoes } = await supabase
    .from('transacoes_credito')
    .select('tipo, valor, status')
    .eq('cliente_id', clienteId);

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

  return totalRecargas - creditosBloqueados - creditosConsumidos;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas POST permitido
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método não permitido. Use POST.',
        code: 'METHOD_NOT_ALLOWED'
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('🔐 API Adicionar Crédito - Validando autenticação...');

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

    // Parse request body
    const body = await req.json();
    const { clienteId, valor, descricao, referencia } = body;

    // Validar campos obrigatórios
    if (!clienteId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'clienteId é obrigatório',
          code: 'MISSING_PARAMETER'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!valor || typeof valor !== 'number' || valor <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'valor deve ser um número maior que zero',
          code: 'INVALID_PARAMETER'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Limitar valor máximo por segurança
    if (valor > 50000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valor máximo por transação: R$ 50.000,00',
          code: 'LIMIT_EXCEEDED'
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

    console.log('💰 Adicionando crédito:', { clienteId, valor, referencia });

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar duplicidade usando referência (idempotência)
    if (referencia) {
      const { data: existente } = await supabase
        .from('transacoes_credito')
        .select('id, valor')
        .eq('cliente_id', clienteId)
        .eq('referencia_externa', referencia)
        .eq('tipo', 'recarga')
        .maybeSingle();

      if (existente) {
        console.log('⚠️ Transação duplicada detectada:', referencia);
        
        // Retornar sucesso com dados da transação existente (idempotência)
        const saldoAtual = await calcularSaldoDisponivel(supabase, clienteId);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              transacaoId: existente.id,
              clienteId,
              valor: Number(existente.valor),
              novoSaldo: Number(saldoAtual.toFixed(2)),
              referencia,
              duplicado: true,
              mensagem: 'Transação já processada anteriormente'
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Criar descrição
    const descricaoFinal = descricao || 
      (referencia 
        ? `Recarga via API externa - Ref: ${referencia}` 
        : 'Recarga via API externa');

    // Inserir transação de recarga
    const { data: transacao, error: insertError } = await supabase
      .from('transacoes_credito')
      .insert({
        cliente_id: clienteId,
        tipo: 'recarga',
        valor: valor,
        descricao: descricaoFinal,
        status: 'consumido',
        referencia_externa: referencia || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir transação:', insertError);
      
      // Verificar se é erro de foreign key (cliente não existe)
      if (insertError.code === '23503') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Cliente não encontrado',
            code: 'CLIENT_NOT_FOUND'
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error('Erro ao processar recarga');
    }

    // Calcular novo saldo
    const novoSaldo = await calcularSaldoDisponivel(supabase, clienteId);

    console.log('✅ Crédito adicionado com sucesso:', {
      transacaoId: transacao.id,
      valor,
      novoSaldo
    });

    // Também adicionar na API externa BRHUB (sincronização)
    try {
      const BASE_API_URL = Deno.env.get('BASE_API_URL');
      const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL');
      const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD');

      if (BASE_API_URL && API_ADMIN_EMAIL && API_ADMIN_PASSWORD) {
        console.log('🔄 Sincronizando com API externa...');
        
        // Login admin
        const loginResponse = await fetch(`${BASE_API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: API_ADMIN_EMAIL, password: API_ADMIN_PASSWORD }),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          const adminToken = loginData.token;

          // Adicionar saldo na API BRHUB
          await fetch(`${BASE_API_URL}/clientes/${clienteId}/add-saldo`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              clienteId: clienteId,
              valorCredito: valor.toFixed(2),
            }),
          });
          
          console.log('✅ Sincronizado com API externa');
        }
      }
    } catch (syncError) {
      // Log mas não falhar a operação principal
      console.warn('⚠️ Erro na sincronização com API externa (não crítico):', syncError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transacaoId: transacao.id,
          clienteId,
          valor: Number(valor.toFixed(2)),
          novoSaldo: Number(novoSaldo.toFixed(2)),
          referencia: referencia || null,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 201, 
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
