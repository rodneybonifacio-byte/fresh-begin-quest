// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para decodificar JWT simples (sem verificação de assinatura - apenas para extrair payload)
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extrair token do header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = decodeJWT(token);
    
    if (!payload || !payload.parceiroId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se token expirou
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parceiroId = payload.parceiroId;
    console.log(`📊 Carregando dashboard para parceiro: ${parceiroId}`);

    // Buscar dados do parceiro
    const { data: parceiro, error: parceiroError } = await supabase
      .from('parceiros')
      .select('*')
      .eq('id', parceiroId)
      .maybeSingle();

    if (parceiroError) {
      console.error('Erro ao buscar parceiro:', parceiroError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar dados do parceiro' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parceiro) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parceiro não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar clientes indicados
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes_indicados')
      .select('*')
      .eq('parceiro_id', parceiroId)
      .order('data_associacao', { ascending: false });

    if (clientesError) {
      console.error('Erro ao buscar clientes:', clientesError);
    }

    console.log(`✅ Dashboard carregado: ${parceiro.nome} - ${clientes?.length || 0} clientes`);

    return new Response(
      JSON.stringify({
        success: true,
        parceiro: {
          id: parceiro.id,
          nome: parceiro.nome,
          email: parceiro.email,
          codigo_parceiro: parceiro.codigo_parceiro,
          link_indicacao: parceiro.link_indicacao,
          total_clientes_ativos: parceiro.total_clientes_ativos,
          total_comissao_acumulada: parceiro.total_comissao_acumulada,
          chave_pix: parceiro.chave_pix,
          status: parceiro.status
        },
        clientes: clientes || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no dashboard:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
