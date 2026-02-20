// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const method = req.method;

  try {
    // GET - listar todos os parceiros
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('parceiros')
        .select('id, nome, email, cpf_cnpj, telefone, status, codigo_parceiro, link_indicacao, chave_pix, banco, agencia, conta, total_clientes_ativos, total_comissao_acumulada, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - atualizar status do parceiro
    if (method === 'PATCH') {
      const { id, status } = await req.json();
      const allowed = ['pendente', 'aprovado', 'suspenso', 'cancelado'];
      if (!allowed.includes(status)) {
        return new Response(JSON.stringify({ error: 'Status inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('parceiros')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - excluir parceiro
    if (method === 'DELETE') {
      const { id } = await req.json();
      const { error } = await supabase
        .from('parceiros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Método não suportado' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
