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
    const body = await req.json();
    const { apiToken, remetenteId, nome, cpfCnpj, documentoEstrangeiro, celular, telefone, email, endereco } = body;

    if (!apiToken) {
      throw new Error('Token de autenticação não fornecido');
    }

    if (!remetenteId) {
      throw new Error('ID do remetente não fornecido');
    }

    console.log('📝 Atualizando remetente:', remetenteId);

    // Decodificar o token para obter o clienteId
    const tokenPayload = JSON.parse(atob(apiToken.split('.')[1]));
    const clienteId = tokenPayload.clienteId;

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    console.log('👤 ClienteId:', clienteId);

    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se o remetente pertence ao cliente
    const { data: existingRemetente, error: fetchError } = await supabase
      .from('remetentes')
      .select('*')
      .eq('id', remetenteId)
      .eq('cliente_id', clienteId)
      .single();

    if (fetchError || !existingRemetente) {
      throw new Error('Remetente não encontrado ou não pertence ao cliente');
    }

    // Preparar dados para atualização no Supabase
    const updateData = {
      nome: nome?.trim(),
      cpf_cnpj: cpfCnpj?.replace(/\D/g, ''),
      documento_estrangeiro: documentoEstrangeiro || null,
      celular: celular || null,
      telefone: telefone || null,
      email: email?.trim(),
      cep: endereco?.cep?.replace(/\D/g, ''),
      logradouro: endereco?.logradouro?.trim(),
      numero: endereco?.numero?.trim(),
      complemento: endereco?.complemento?.trim() || null,
      bairro: endereco?.bairro?.trim(),
      localidade: endereco?.localidade?.trim(),
      uf: endereco?.uf?.trim(),
      atualizado_em: new Date().toISOString()
    };

    // Atualizar no Supabase
    const { error: updateError } = await supabase
      .from('remetentes')
      .update(updateData)
      .eq('id', remetenteId);

    if (updateError) {
      console.error('❌ Erro ao atualizar no Supabase:', updateError);
      throw new Error('Erro ao atualizar remetente no banco de dados');
    }

    console.log('✅ Remetente atualizado no Supabase');

    // Tentar sincronizar com a API externa
    const apiBaseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (apiBaseUrl && adminEmail && adminPassword) {
      try {
        console.log('🔐 Fazendo login com credenciais de admin...');
        
        const loginResponse = await fetch(`${apiBaseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
          }),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          const authToken = loginData.token;

          console.log('✅ Login admin realizado com sucesso');

          // Preparar dados para a API externa
          const remetenteApiData = {
            clienteId: clienteId,
            nome: nome?.trim(),
            cpfCnpj: cpfCnpj?.replace(/\D/g, ''),
            documentoEstrangeiro: documentoEstrangeiro || '',
            celular: celular || '',
            telefone: telefone || '',
            email: email?.trim() || '',
            endereco: {
              cep: endereco?.cep?.replace(/\D/g, ''),
              logradouro: endereco?.logradouro?.trim() || '',
              numero: endereco?.numero?.trim() || '',
              complemento: endereco?.complemento?.trim() || '',
              bairro: endereco?.bairro?.trim() || '',
              localidade: endereco?.localidade?.trim() || '',
              uf: endereco?.uf?.trim() || '',
            },
          };

          console.log('📤 Atualizando remetente na API BRHUB...');

          const updateApiResponse = await fetch(`${apiBaseUrl}/remetentes/${remetenteId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(remetenteApiData),
          });

          if (updateApiResponse.ok) {
            console.log('✅ Remetente atualizado na API externa');
            
            // Atualizar timestamp de sincronização
            await supabase
              .from('remetentes')
              .update({ sincronizado_em: new Date().toISOString() })
              .eq('id', remetenteId);
          } else {
            const errorText = await updateApiResponse.text();
            console.log('⚠️ Erro ao atualizar na API externa:', errorText);
          }
        }
      } catch (apiError) {
        console.log('⚠️ Erro na sincronização com API externa:', apiError);
        // Não lançar erro, pois o Supabase foi atualizado com sucesso
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Remetente atualizado com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro ao atualizar remetente:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar remetente';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
