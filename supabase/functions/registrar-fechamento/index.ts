// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      fatura_id, 
      subfatura_id, 
      codigo_fatura, 
      nome_cliente, 
      cpf_cnpj,
      boleto_id 
    } = await req.json();
    
    console.log('📝 Registrando fechamento manual:', {
      fatura_id,
      subfatura_id,
      codigo_fatura,
      nome_cliente,
      cpf_cnpj
    });

    if (!fatura_id || !codigo_fatura || !nome_cliente) {
      return new Response(
        JSON.stringify({ error: 'fatura_id, codigo_fatura e nome_cliente são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se já existe registro
    const { data: existing } = await supabase
      .from('fechamentos_fatura')
      .select('id')
      .eq('fatura_id', fatura_id)
      .eq('subfatura_id', subfatura_id || null)
      .single();

    if (existing) {
      console.log('⚠️ Fechamento já existe:', existing.id);
      return new Response(
        JSON.stringify({ success: true, message: 'Fechamento já registrado', id: existing.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir novo fechamento
    const { data, error } = await supabase
      .from('fechamentos_fatura')
      .insert({
        fatura_id,
        subfatura_id: subfatura_id || null,
        codigo_fatura,
        nome_cliente,
        cpf_cnpj: cpf_cnpj || null,
        boleto_id: boleto_id || `MANUAL-${Date.now()}`,
        fatura_pdf: null,
        boleto_pdf: null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir fechamento:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Fechamento registrado:', data.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Fechamento registrado com sucesso', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Erro:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
