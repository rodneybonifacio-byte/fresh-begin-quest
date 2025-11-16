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

    console.log('✅ Token recebido, buscando dados do usuário...');

    // Decodificar o JWT para extrair o clienteId
    const payload = JSON.parse(atob(apiToken.split('.')[1]));
    const clienteId = payload.clienteId;

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    console.log('🔍 Buscando dados para clienteId:', clienteId);

    const baseUrl = Deno.env.get('BASE_API_URL');

    // Fazer login como admin para acessar os dados
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    console.log('🔐 Fazendo login como admin...');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Erro no login admin:', errorText);
      throw new Error('Falha ao autenticar como admin');
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.token;
    console.log('✅ Login admin realizado com sucesso');

    // Buscar dados do cliente usando token admin
    const clienteResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    let clienteData = { data: null };
    if (clienteResponse.ok) {
      clienteData = await clienteResponse.json();
      console.log('✅ Dados do cliente encontrados');
    } else {
      console.warn('⚠️ Não foi possível buscar dados do cliente');
    }

    // Buscar remetentes do cliente usando token admin
    const remetentesResponse = await fetch(`${baseUrl}/remetentes?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    let remetentesData = { data: [] };
    if (remetentesResponse.ok) {
      remetentesData = await remetentesResponse.json();
      console.log('✅ Remetentes encontrados:', remetentesData.data?.length || 0);
    } else {
      console.warn('⚠️ Não foi possível buscar remetentes');
    }

    // Buscar destinatários do cliente usando token admin
    const destinatariosResponse = await fetch(`${baseUrl}/destinatarios?clienteId=${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    let destinatariosData = { data: [] };
    if (destinatariosResponse.ok) {
      destinatariosData = await destinatariosResponse.json();
    console.log('✅ Destinatários encontrados:', destinatariosData.data?.length || 0);
  } else {
    console.warn('⚠️ Não foi possível buscar destinatários');
  }

  // Sincronizar remetentes no Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('💾 Sincronizando remetentes no Supabase...');
  
  if (remetentesData.data && remetentesData.data.length > 0) {
    for (const remetente of remetentesData.data) {
      const { error: upsertError } = await supabase
        .from('remetentes')
        .upsert({
          id: remetente.id,
          cliente_id: clienteId,
          nome: remetente.nome,
          cpf_cnpj: remetente.cpfCnpj,
          documento_estrangeiro: remetente.documentoEstrangeiro,
          celular: remetente.celular,
          telefone: remetente.telefone,
          email: remetente.email,
          cep: remetente.endereco?.cep,
          logradouro: remetente.endereco?.logradouro,
          numero: remetente.endereco?.numero,
          complemento: remetente.endereco?.complemento,
          bairro: remetente.endereco?.bairro,
          localidade: remetente.endereco?.localidade,
          uf: remetente.endereco?.uf,
          sincronizado_em: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.error('❌ Erro ao sincronizar remetente:', upsertError);
      }
    }
    console.log('✅ Remetentes sincronizados no Supabase');
  }

  // Retornar todos os dados consolidados
  return new Response(
    JSON.stringify({
      cliente: clienteData.data,
      remetentes: remetentesData.data || [],
      destinatarios: destinatariosData.data || [],
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar dados do usuário';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
