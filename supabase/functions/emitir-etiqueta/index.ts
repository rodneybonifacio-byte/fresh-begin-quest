// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAdminToken(): Promise<string> {
  const baseUrl = Deno.env.get('BASE_API_URL');
  const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
  const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

  console.log('🔐 Obtendo token admin...');

  if (!adminEmail || !adminPassword) {
    throw new Error('Credenciais de admin não configuradas');
  }

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    throw new Error(`Falha ao autenticar: ${loginResponse.status} - ${errorText}`);
  }

  const loginData = await loginResponse.json();
  console.log('✅ Token admin obtido');
  return loginData.data?.token || loginData.token;
}

async function syncRemetenteToApi(remetenteId: string, clienteId: string, adminToken: string): Promise<{ success: boolean; newId?: string }> {
  console.log('🔄 Tentando sincronizar remetente com API BRHUB:', remetenteId);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: remetente, error } = await supabase
    .from('remetentes')
    .select('*')
    .eq('id', remetenteId)
    .single();

  if (error || !remetente) {
    console.error('❌ Remetente não encontrado no Supabase:', error);
    return { success: false };
  }

  console.log('📋 Remetente encontrado no Supabase:', remetente.nome);

  const baseUrl = Deno.env.get('BASE_API_URL');

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

  console.log('📤 Criando remetente na API BRHUB...');

  const createResponse = await fetch(`${baseUrl}/remetentes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(remetenteData),
  });

  const responseText = await createResponse.text();
  console.log('📥 Resposta da criação:', createResponse.status);

  if (createResponse.ok) {
    console.log('✅ Remetente criado com sucesso na API BRHUB!');
    
    // Parse response to get the new ID
    let newId: string | undefined;
    try {
      const responseData = JSON.parse(responseText);
      newId = responseData.id || responseData.data?.id;
      console.log('📋 ID retornado pela API:', newId);
      
      // Update local Supabase with the new ID if different
      if (newId && newId !== remetenteId) {
        console.log('🔄 Atualizando ID do remetente no Supabase:', newId);
        await supabase
          .from('remetentes')
          .update({ id: newId, sincronizado_em: new Date().toISOString() })
          .eq('id', remetenteId);
      } else {
        await supabase
          .from('remetentes')
          .update({ sincronizado_em: new Date().toISOString() })
          .eq('id', remetenteId);
      }
    } catch (e) {
      console.log('⚠️ Não foi possível parsear resposta:', e);
    }
    
    return { success: true, newId: newId || remetenteId };
  }

  // Se já existe, tentar atualizar
  if (createResponse.status === 409 || responseText.toLowerCase().includes('já existe')) {
    console.log('⚠️ Remetente já existe, tentando atualizar...');
    
    const updateResponse = await fetch(`${baseUrl}/remetentes/${remetenteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(remetenteData),
    });

    if (updateResponse.ok) {
      console.log('✅ Remetente atualizado com sucesso!');
      return { success: true, newId: remetenteId };
    }
  }

  console.error('❌ Falha ao sincronizar remetente:', responseText);
  return { success: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    console.log('🏷️ Iniciando emissão de etiqueta...');

    const baseUrl = Deno.env.get('BASE_API_URL');

    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    const userToken = requestData.userToken;
    
    if (!userToken) {
      throw new Error('Token de autenticação não fornecido');
    }

    // Extrair clienteId do token do usuário
    let clienteId = null;
    try {
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      clienteId = tokenPayload.clienteId;
      console.log('👤 ClienteId do usuário:', clienteId);
    } catch (e) {
      throw new Error('Token inválido - não foi possível identificar o cliente');
    }

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    // Preparar payload da emissão
    const emissaoPayload = {
      ...requestData.emissaoData,
      clienteId,
    };

    delete emissaoPayload.userToken;
    console.log('📦 Payload da emissão:', JSON.stringify(emissaoPayload));

    // Obter token admin para as operações
    const adminToken = await getAdminToken();

    // Tentar emitir com token admin
    console.log('📊 Emitindo com credenciais admin...');
    
    let emissaoResponse = await fetch(`${baseUrl}/emissoes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emissaoPayload),
    });

    let responseText = await emissaoResponse.text();
    console.log('📄 Resposta da emissão (status):', emissaoResponse.status);

    // Se for erro 404 de remetente, tentar sincronizar e retentar
    if (emissaoResponse.status === 404 && responseText.toLowerCase().includes('remetente')) {
      console.log('⚠️ Remetente não encontrado na API. Tentando sincronizar...');
      
      const remetenteId = emissaoPayload.remetenteId;
      const syncResult = await syncRemetenteToApi(remetenteId, clienteId, adminToken);
      
      if (syncResult.success) {
        // Use the new ID returned by the API if different
        const finalRemetenteId = syncResult.newId || remetenteId;
        console.log('🔄 Retentando emissão após sincronização com ID:', finalRemetenteId);
        
        // Update the payload with the correct ID
        const updatedPayload = {
          ...emissaoPayload,
          remetenteId: finalRemetenteId,
        };
        
        emissaoResponse = await fetch(`${baseUrl}/emissoes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedPayload),
        });
        
        responseText = await emissaoResponse.text();
        console.log('📄 Resposta da segunda tentativa:', emissaoResponse.status);
      }
    }

    if (!emissaoResponse.ok) {
      console.error('❌ Erro na emissão:', responseText);
      
      let errorMessage = 'Erro na emissão de etiqueta';
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        }
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      
      return new Response(
        JSON.stringify({
          error: errorMessage,
          status: emissaoResponse.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: emissaoResponse.status,
        }
      );
    }

    const emissaoData = JSON.parse(responseText);
    console.log('✅ Etiqueta emitida com sucesso!');

    return new Response(
      JSON.stringify(emissaoData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao emitir etiqueta';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
