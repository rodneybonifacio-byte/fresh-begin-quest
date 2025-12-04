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

  // Usar telefone como fallback para celular se não estiver definido
  const celularFinal = remetente.celular || remetente.telefone || '';
  const telefoneFinal = remetente.telefone || remetente.celular || '';
  
  console.log('📞 Celular/Telefone do remetente:', { celular: celularFinal, telefone: telefoneFinal });
  
  const remetenteData = {
    id: remetenteId, // Include ID so BRHUB uses our ID
    clienteId: clienteId,
    nome: remetente.nome?.trim(),
    cpfCnpj: remetente.cpf_cnpj?.replace(/\D/g, ''),
    documentoEstrangeiro: remetente.documento_estrangeiro || '',
    celular: celularFinal,
    telefone: telefoneFinal,
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
  console.log('📥 Resposta da criação:', createResponse.status, responseText);

  if (createResponse.ok) {
    console.log('✅ Remetente criado/atualizado com sucesso na API BRHUB!');
    
    let newId: string | undefined;
    try {
      const responseData = JSON.parse(responseText);
      newId = responseData.id || responseData.data?.id;
      console.log('📋 ID extraído da resposta:', newId);
      
      const finalId = newId || remetenteId;
      
      // Update local Supabase with sync timestamp
      await supabase
        .from('remetentes')
        .update({ sincronizado_em: new Date().toISOString() })
        .eq('id', remetenteId);
      
      // Small delay to allow API propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🎯 ID final do remetente para emissão:', finalId);
      return { success: true, newId: finalId };
    } catch (e) {
      console.log('⚠️ Não foi possível parsear resposta:', e);
      return { success: true, newId: remetenteId };
    }
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

// Função para aplicar configurações de transportadora no CLIENTE
async function applyClientTransportadoraConfig(clienteId: string, adminToken: string): Promise<boolean> {
  const baseUrl = Deno.env.get('BASE_API_URL');
  
  console.log('📤 Aplicando configurações de transportadora no cliente:', clienteId);
  
  // Primeiro buscar dados atuais do cliente
  const getResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (!getResponse.ok) {
    console.log('⚠️ Não foi possível buscar dados do cliente');
    return false;
  }
  
  const clienteData = await getResponse.json();
  console.log('📋 Dados atuais do cliente:', JSON.stringify(clienteData));
  
  // Se já tem configurações, não precisa atualizar
  if (clienteData.transportadoraConfiguracoes && clienteData.transportadoraConfiguracoes.length > 0) {
    console.log('✅ Cliente já possui configurações de transportadora');
    return true;
  }
  
  // Aplicar configurações via PUT
  const transportadoraConfiguracoes = [
    {
      transportadora: 'CORREIOS',
      ativo: true,
      sobrepreco: 5
    },
    {
      transportadora: 'RODONAVES',
      ativo: false,
      sobrepreco: 0
    }
  ];
  
  const updatePayload = {
    ...clienteData,
    transportadoraConfiguracoes
  };
  
  const putResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(updatePayload),
  });
  
  const putText = await putResponse.text();
  console.log('📥 Resposta do PUT cliente:', putResponse.status, putText);
  
  if (putResponse.ok) {
    console.log('✅ Configurações de transportadora aplicadas no cliente!');
    return true;
  }
  
  console.log('⚠️ Falha ao aplicar configurações no cliente');
  return false;
}

// Função para desabilitar WhatsApp do cliente se necessário
async function disableClientWhatsApp(clienteId: string, adminToken: string): Promise<boolean> {
  const baseUrl = Deno.env.get('BASE_API_URL');
  
  try {
    // Buscar dados atuais do cliente
    const getResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!getResponse.ok) {
      console.log('⚠️ Não foi possível buscar dados do cliente para desabilitar WhatsApp');
      return false;
    }
    
    const clienteData = await getResponse.json();
    const cliente = clienteData.data || clienteData;
    
    // Verificar se WhatsApp está habilitado com configuração inválida
    if (cliente.configuracoes?.rastreio_via_whatsapp === true) {
      console.log('📱 WhatsApp habilitado no cliente. Desabilitando para evitar erro...');
      
      // Corrigir tipos de dados nas configurações
      const configuracoesCorrigidas = {
        ...cliente.configuracoes,
        rastreio_via_whatsapp: false,
        fatura_via_whatsapp: false,
        incluir_valor_declarado_na_nota: cliente.configuracoes?.incluir_valor_declarado_na_nota === 'true' || cliente.configuracoes?.incluir_valor_declarado_na_nota === true,
        valor_disparo_evento_rastreio_whatsapp: String(cliente.configuracoes?.valor_disparo_evento_rastreio_whatsapp || '0'),
      };
      
      // Corrigir tipos nas configurações de transportadora
      const transportadoraCorrigidas = (cliente.transportadoraConfiguracoes || []).map((t: any) => ({
        ...t,
        valorAcrescimo: typeof t.valorAcrescimo === 'string' ? parseFloat(t.valorAcrescimo) || 0 : t.valorAcrescimo,
      }));
      
      // Atualizar configurações para desabilitar WhatsApp
      const updatePayload = {
        ...cliente,
        configuracoes: configuracoesCorrigidas,
        transportadoraConfiguracoes: transportadoraCorrigidas,
      };
      
      const putResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      
      if (putResponse.ok) {
        console.log('✅ WhatsApp desabilitado com sucesso no cliente');
        return true;
      } else {
        const errorText = await putResponse.text();
        console.log('⚠️ Falha ao desabilitar WhatsApp:', errorText);
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao desabilitar WhatsApp:', error);
    return false;
  }
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
    // Remover campos de WhatsApp para evitar erro de configuração incompleta
    const emissaoPayload = {
      ...requestData.emissaoData,
      clienteId,
    };

    // Remover campos que podem causar erro
    delete emissaoPayload.userToken;
    delete emissaoPayload.notificarWhatsapp;
    delete emissaoPayload.rastreamentoWhatsapp;
    console.log('📦 Payload da emissão:', JSON.stringify(emissaoPayload));

    // Obter token admin para as operações
    const adminToken = await getAdminToken();

    // Desabilitar WhatsApp do cliente para evitar erro de configuração inválida
    await disableClientWhatsApp(clienteId, adminToken);

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

    // Se for erro 404 de remetente, enviar objeto remetente completo ao invés de remetenteId
    if (emissaoResponse.status === 404 && responseText.toLowerCase().includes('remetente')) {
      console.log('⚠️ Remetente não encontrado na API. Enviando dados completos do remetente...');
      
      // Criar cliente Supabase
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Buscar dados do remetente do Supabase
      const remetenteId = emissaoPayload.remetenteId;
      const { data: remetente, error: remetenteError } = await supabaseClient
        .from('remetentes')
        .select('*')
        .eq('id', remetenteId)
        .single();
      
      if (remetenteError || !remetente) {
        console.error('❌ Remetente não encontrado no Supabase:', remetenteError);
      } else {
        console.log('📋 Remetente encontrado:', remetente.nome);
        
        // Usar celular ou telefone como fallback
        const celularFinal = remetente.celular || remetente.telefone || '';
        const telefoneFinal = remetente.telefone || remetente.celular || '';
        
        // Montar objeto remetente conforme documentação da API
        const remetenteObj = {
          nome: remetente.nome?.trim(),
          cpfCnpj: remetente.cpf_cnpj?.replace(/\D/g, ''),
          documentoEstrangeiro: remetente.documento_estrangeiro || '',
          celular: celularFinal,
          telefone: telefoneFinal,
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
        
        console.log('📤 Payload com remetente completo:', JSON.stringify(remetenteObj));
        
        // Criar novo payload COM objeto remetente e SEM remetenteId
        const updatedPayload = {
          ...emissaoPayload,
          remetente: remetenteObj,
        };
        delete updatedPayload.remetenteId;
        delete updatedPayload.notificarWhatsapp;
        delete updatedPayload.rastreamentoWhatsapp;
        
        console.log('🔄 Retentando emissão com objeto remetente completo...');
        
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
