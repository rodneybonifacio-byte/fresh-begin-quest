// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { remetenteId, userToken } = await req.json();
    
    if (!remetenteId) {
      throw new Error('ID do remetente não fornecido');
    }

    if (!userToken) {
      throw new Error('Token do usuário não fornecido');
    }

    console.log('📤 Sincronizando remetente para API BRHUB:', remetenteId);

    // Decodificar o token do usuário para obter o clienteId
    const userTokenPayload = JSON.parse(atob(userToken.split('.')[1]));
    const clienteId = userTokenPayload.clienteId;

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    console.log('👤 ClienteId:', clienteId);

    // Conectar ao Supabase para buscar o remetente
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: remetente, error: fetchError } = await supabase
      .from('remetentes')
      .select('*')
      .eq('id', remetenteId)
      .single();

    if (fetchError || !remetente) {
      throw new Error('Remetente não encontrado no banco local');
    }

    console.log('📋 Remetente encontrado:', remetente.nome);

    // Obter credenciais da API externa
    const apiBaseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!apiBaseUrl || !adminEmail || !adminPassword) {
      throw new Error('Configuração do servidor incompleta');
    }

    console.log('🔐 Fazendo login com credenciais de admin...');
    
    // Login admin para obter token com permissões
    const loginResponse = await fetch(`${apiBaseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (!loginResponse.ok) {
      const loginError = await loginResponse.text();
      console.error('❌ Erro no login:', loginError);
      throw new Error('Falha na autenticação com a API externa');
    }

    const loginData = await loginResponse.json();
    const authToken = loginData.token;

    console.log('✅ Login admin realizado com sucesso');

    // Preparar dados do remetente para a API
    const remetenteData = {
      clienteId: clienteId,
      nome: remetente.nome?.trim(),
      cpfCnpj: remetente.cpf_cnpj?.replace(/\D/g, ''),
      documentoEstrangeiro: remetente.documento_estrangeiro || '',
      celular: remetente.celular || '',
      telefone: remetente.telefone || '',
      email: remetente.email?.trim() || '',
      endereco: {
        cep: remetente.cep?.replace(/\D/g, ''),
        logradouro: remetente.logradouro?.trim() || '',
        numero: remetente.numero?.trim() || '',
        complemento: remetente.complemento?.trim() || '',
        bairro: remetente.bairro?.trim() || '',
        localidade: remetente.localidade?.trim() || '',
        uf: remetente.uf?.trim() || '',
      },
    };

    console.log('📤 Enviando remetente para API BRHUB...');

    const createResponse = await fetch(`${apiBaseUrl}/remetentes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(remetenteData),
    });

    const responseText = await createResponse.text();
    console.log('📥 Resposta da API:', createResponse.status, responseText.substring(0, 300));

    if (!createResponse.ok) {
      // Verificar se é erro de duplicidade (já existe)
      if (responseText.toLowerCase().includes('já existe') || 
          responseText.toLowerCase().includes('duplicado') ||
          createResponse.status === 409) {
        console.log('⚠️ Remetente já existe na API, tentando atualizar...');
        
        // Tentar atualizar ao invés de criar
        const updateResponse = await fetch(`${apiBaseUrl}/remetentes/${remetenteId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(remetenteData),
        });

        if (updateResponse.ok) {
          console.log('✅ Remetente atualizado com sucesso na API');
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Remetente atualizado na API externa',
              action: 'updated',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      }

      throw new Error(`Erro ao criar remetente na API: ${responseText}`);
    }

    const remetenteResponse = JSON.parse(responseText);
    console.log('✅ Remetente criado com sucesso na API BRHUB!');

    // Atualizar o ID do remetente no Supabase se for diferente
    if (remetenteResponse.id && remetenteResponse.id !== remetenteId) {
      console.log('🔄 Atualizando ID do remetente no Supabase...');
      
      await supabase
        .from('remetentes')
        .update({ 
          id: remetenteResponse.id,
          sincronizado_em: new Date().toISOString() 
        })
        .eq('id', remetenteId);
    } else {
      await supabase
        .from('remetentes')
        .update({ sincronizado_em: new Date().toISOString() })
        .eq('id', remetenteId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Remetente sincronizado com a API externa',
        action: 'created',
        newId: remetenteResponse.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao sincronizar remetente';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
