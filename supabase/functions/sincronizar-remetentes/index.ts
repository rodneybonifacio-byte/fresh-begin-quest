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

    // Fazer login como admin no backend externo
    const baseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, senha: adminPassword }),
    });

    if (!loginResponse.ok) {
      throw new Error('Falha ao autenticar como admin');
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.data.token;

    // Buscar remetentes do backend
    const remetentesResponse = await fetch(`${baseUrl}/remetentes?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!remetentesResponse.ok) {
      throw new Error('Falha ao buscar remetentes do backend');
    }

    const remetentesData = await remetentesResponse.json();
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
