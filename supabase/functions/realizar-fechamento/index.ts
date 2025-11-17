import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dataInicio, dataFim } = await req.json();

    console.log('Iniciando fechamento:', { dataInicio, dataFim });

    if (!dataInicio || !dataFim) {
      throw new Error('Datas de início e fim são obrigatórias');
    }

    // Aqui você pode implementar a lógica de fechamento
    // Por exemplo: buscar todas as transações do período, consolidar, gerar relatórios, etc.
    
    // Exemplo básico: buscar transações do período
    const { data: transacoes, error: transacoesError } = await supabase
      .from('transacoes_credito')
      .select('*')
      .gte('created_at', dataInicio)
      .lte('created_at', dataFim);

    if (transacoesError) {
      console.error('Erro ao buscar transações:', transacoesError);
      throw transacoesError;
    }

    console.log(`Total de transações encontradas: ${transacoes?.length || 0}`);

    // Calcular totais
    const totalCreditos = transacoes?.reduce((sum, t) => {
      if (t.tipo === 'CREDITO' || t.tipo === 'RECARGA') {
        return sum + t.valor;
      }
      return sum;
    }, 0) || 0;

    const totalDebitos = transacoes?.reduce((sum, t) => {
      if (t.tipo === 'DEBITO' || t.tipo === 'BLOQUEIO') {
        return sum + t.valor;
      }
      return sum;
    }, 0) || 0;

    const resultado = {
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
      totais: {
        transacoes: transacoes?.length || 0,
        creditos: totalCreditos,
        debitos: totalDebitos,
        saldo: totalCreditos - totalDebitos,
      },
      processado_em: new Date().toISOString(),
    };

    console.log('Fechamento concluído:', resultado);

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
