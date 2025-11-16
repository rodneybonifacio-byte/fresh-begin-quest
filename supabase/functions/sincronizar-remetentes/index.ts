// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { apiToken } = await req.json();
    
    if (!apiToken) {
      throw new Error('Token de autenticação não fornecido');
    }

    console.log('✅ Iniciando sincronização de remetentes');

    // Decodificar o JWT para extrair o clienteId
    const payload = JSON.parse(atob(apiToken.split('.')[1]));
    const clienteId = payload.clienteId;

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    console.log('🔍 Sincronizando remetentes para clienteId:', clienteId);

    // Usar o próprio token do usuário para buscar remetentes
    const baseUrl = Deno.env.get('BASE_API_URL');

    console.log('🔐 Buscando remetentes com token do usuário');
    console.log('📍 Base URL:', baseUrl);

    // Buscar remetentes do backend usando o token do usuário
    const remetentesResponse = await fetch(`${baseUrl}/remetentes?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Status da resposta:', remetentesResponse.status);
    const remetentesText = await remetentesResponse.text();
    console.log('📥 Resposta do servidor:', remetentesText.substring(0, 200));

    if (!remetentesResponse.ok) {
      throw new Error(`Falha ao buscar remetentes: ${remetentesText}`);
    }

    const remetentesData = JSON.parse(remetentesText);
    const remetentes = remetentesData.data || [];

    console.log('📊 Remetentes obtidos do backend:', remetentes.length);

    // Conectar ao Supabase com service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Sincronizar cada remetente
    const results = [];
    for (const rem of remetentes) {
      const remetenteData = {
        id: rem.id,
        cliente_id: clienteId,
        nome: rem.nome,
        cpf_cnpj: rem.cpfCnpj,
        documento_estrangeiro: rem.documentoEstrangeiro,
        celular: rem.celular,
        telefone: rem.telefone,
        email: rem.email,
        cep: rem.endereco?.cep,
        logradouro: rem.endereco?.logradouro,
        numero: rem.endereco?.numero,
        complemento: rem.endereco?.complemento,
        bairro: rem.endereco?.bairro,
        localidade: rem.endereco?.localidade,
        uf: rem.endereco?.uf,
        sincronizado_em: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('remetentes')
        .upsert(remetenteData, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao sincronizar remetente:', rem.id, error);
        results.push({ id: rem.id, success: false, error: error.message });
      } else {
        results.push({ id: rem.id, success: true });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Sincronização concluída: ${successCount}/${remetentes.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: remetentes.length,
        sincronizados: successCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao sincronizar remetentes';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
