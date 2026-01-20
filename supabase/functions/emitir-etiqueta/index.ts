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

// Função para desabilitar WhatsApp do cliente (SEMPRE executa para garantir)
async function disableClientWhatsApp(clienteId: string, adminToken: string): Promise<boolean> {
  const baseUrl = Deno.env.get('BASE_API_URL');

  const toBoolean = (v: any): boolean => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.toLowerCase() === 'true';
    return Boolean(v);
  };

  console.log('📱 Verificando e desabilitando WhatsApp para cliente:', clienteId);

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

    const clienteResponse = await getResponse.json();
    const clienteAtual = clienteResponse.data || clienteResponse;

    const cfg = clienteAtual.configuracoes || {};
    console.log('📋 Config atual WhatsApp:', JSON.stringify(cfg));

    // Forçar desativação de WhatsApp para evitar erros de emissão
    const configuracoesCorrigidas = {
      periodo_faturamento: cfg.periodo_faturamento || 'SEMANAL',
      horario_coleta: cfg.horario_coleta || '08:00',
      link_whatsapp: String(cfg.link_whatsapp || ''),
      incluir_valor_declarado_na_nota: toBoolean(cfg.incluir_valor_declarado_na_nota),
      aplicar_valor_declarado: toBoolean(cfg.aplicar_valor_declarado),
      rastreio_via_whatsapp: false,
      fatura_via_whatsapp: false,
      valor_disparo_evento_rastreio_whatsapp: String(cfg.valor_disparo_evento_rastreio_whatsapp || '0'),
      eventos_rastreio_habilitados_via_whatsapp: [],
    };

    // Corrigir tipos nas configurações de transportadora (se existirem)
    const transportadoraCorrigidas = (clienteAtual.transportadoraConfiguracoes || []).map((t: any) => ({
      ...t,
      valorAcrescimo:
        typeof t.valorAcrescimo === 'string' ? parseFloat(t.valorAcrescimo) || 0 : (t.valorAcrescimo ?? 0),
      sobrepreco:
        typeof t.sobrepreco === 'string' ? parseFloat(t.sobrepreco) || 0 : (t.sobrepreco ?? 0),
    }));

    // Montar payload completo com campos obrigatórios (nomeEmpresa/nomeResponsavel/role)
    const clienteAtualizado = {
      nomeEmpresa: clienteAtual.nomeEmpresa,
      nomeResponsavel: clienteAtual.nomeResponsavel,
      cpfCnpj: clienteAtual.cpfCnpj,
      email: clienteAtual.email,
      telefone: clienteAtual.telefone || '',
      celular: clienteAtual.celular,
      role: clienteAtual.role || 'CLIENTE',
      endereco: clienteAtual.endereco,
      status: clienteAtual.status || 'ATIVO',
      configuracoes: configuracoesCorrigidas,
      transportadoraConfiguracoes: transportadoraCorrigidas,
    };

    console.log('📤 Enviando update para desabilitar WhatsApp...');

    const putResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clienteAtualizado),
    });

    const responseText = await putResponse.text();
    console.log('📥 Resposta do PUT WhatsApp:', putResponse.status, responseText.substring(0, 200));

    if (!putResponse.ok) {
      console.log('⚠️ Falha ao desabilitar WhatsApp:', responseText);
      return false;
    }

    console.log('✅ WhatsApp desabilitado com sucesso!');
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
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
    const emissaoPayload: any = {
      ...requestData.emissaoData,
      clienteId,
    };

    // Garantir que quantidadeVolumes seja passada na embalagem
    if (emissaoPayload.embalagem) {
      emissaoPayload.embalagem.quantidadeVolumes = emissaoPayload.embalagem.quantidadeVolumes || 1;
      console.log('📦 Quantidade de volumes:', emissaoPayload.embalagem.quantidadeVolumes);
    }

    // Helpers de sanitização/validação (server-side)
    const digitsOnly = (v: any) => String(v ?? '').replace(/\D/g, '');

    // Detectar logística reversa
    const isLogisticaReversa = String(emissaoPayload.logisticaReversa ?? '') === 'S';

    // Remover campos que podem causar erro
    delete emissaoPayload.userToken;
    delete emissaoPayload.notificarWhatsapp;
    delete emissaoPayload.rastreamentoWhatsapp;

    if (isLogisticaReversa) {
      console.log('🔁 Logística reversa ativa - enviando logisticaReversa: "S" para API');
      // Manter logisticaReversa: "S" no payload para a API processar corretamente
      emissaoPayload.logisticaReversa = 'S';
    } else {
      // Remover o campo se não for logística reversa
      delete emissaoPayload.logisticaReversa;
    }

    // Sanitizar dados do destinatário (CPF/CNPJ, celular, CEP)
    if (emissaoPayload?.destinatario) {
      emissaoPayload.destinatario.nome = String(emissaoPayload.destinatario.nome ?? '').trim();

      if (emissaoPayload.destinatario.cpfCnpj != null) {
        emissaoPayload.destinatario.cpfCnpj = digitsOnly(emissaoPayload.destinatario.cpfCnpj);
      }
      if (emissaoPayload.destinatario.celular != null) {
        emissaoPayload.destinatario.celular = digitsOnly(emissaoPayload.destinatario.celular);
      }
      if (emissaoPayload.destinatario.endereco?.cep != null) {
        emissaoPayload.destinatario.endereco.cep = digitsOnly(emissaoPayload.destinatario.endereco.cep);
      }
      if (emissaoPayload.destinatario.endereco?.uf != null) {
        emissaoPayload.destinatario.endereco.uf = String(emissaoPayload.destinatario.endereco.uf).trim().toUpperCase();
      }
    }

    // Validação mínima antes de chamar a API externa
    const destNome = emissaoPayload?.destinatario?.nome;
    const destCep = emissaoPayload?.destinatario?.endereco?.cep;
    const destCpf = emissaoPayload?.destinatario?.cpfCnpj;

    if (!destNome) {
      return new Response(JSON.stringify({ error: 'Destinatário: nome é obrigatório', status: 400 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!destCep || !/^\d{8}$/.test(destCep)) {
      return new Response(JSON.stringify({ error: 'Destinatário: CEP inválido (use 8 dígitos)', status: 400 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!destCpf || !/^(\d{11}|\d{14})$/.test(destCpf)) {
      return new Response(JSON.stringify({ error: 'Destinatário: CPF/CNPJ inválido (use 11 ou 14 dígitos)', status: 400 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('📦 Payload da emissão:', JSON.stringify(emissaoPayload));

    // Obter token admin APENAS para operações administrativas (configurar cliente)
    const adminToken = await getAdminToken();

    // Desabilitar WhatsApp do cliente para evitar erro de configuração inválida
    await disableClientWhatsApp(clienteId, adminToken);

    // USAR TOKEN DO CLIENTE para emissão (não admin!)
    console.log('📊 Emitindo com TOKEN DO CLIENTE (não admin)...');
    
    let emissaoResponse = await fetch(`${baseUrl}/emissoes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
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
        const digitsOnly = (v: any) => String(v ?? '').replace(/\D/g, '');
        const celularFinal = digitsOnly(remetente.celular || remetente.telefone || '');
        const telefoneFinal = digitsOnly(remetente.telefone || remetente.celular || '');
        
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
        
        console.log('🔄 Retentando emissão com objeto remetente completo (TOKEN DO CLIENTE)...');
        
        emissaoResponse = await fetch(`${baseUrl}/emissoes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
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
      console.error('📋 Payload enviado:', JSON.stringify(emissaoPayload));

      let parsedError: any = null;
      try {
        parsedError = JSON.parse(responseText);
      } catch {
        // ignore
      }

      const errorCode = typeof parsedError?.code === 'string' ? parsedError.code : undefined;

      let errorMessage = 'Erro na emissão de etiqueta';
      if (typeof parsedError?.message === 'string' && parsedError.message.trim()) {
        errorMessage = parsedError.message;
      } else if (typeof parsedError?.error === 'string' && parsedError.error.trim()) {
        errorMessage = parsedError.error;
      } else if (Array.isArray(parsedError?.error)) {
        errorMessage = parsedError.error
          .map((e: any) => e?.message || JSON.stringify(e))
          .filter(Boolean)
          .join(' | ');
      } else if (typeof responseText === 'string' && responseText.trim()) {
        errorMessage = responseText;
      }
      
      // Se o erro for genérico, adicionar contexto útil
      if (errorMessage === 'Erro desconhecido' || errorMessage === 'Erro na emissão de etiqueta') {
        errorMessage = `Erro ao processar emissão (${errorCode || 'sem código'}). Verifique os dados do remetente, destinatário e dimensões da embalagem. Se o problema persistir, entre em contato com o suporte.`;
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          code: errorCode,
          status: emissaoResponse.status,
          details: {
            ...(parsedError || {}),
            rawResponse: responseText,
            sentPayload: {
              remetenteId: emissaoPayload.remetenteId,
              destinatario: {
                nome: emissaoPayload.destinatario?.nome,
                cpfCnpj: emissaoPayload.destinatario?.cpfCnpj ? '***' + emissaoPayload.destinatario.cpfCnpj.slice(-4) : null,
                cep: emissaoPayload.destinatario?.endereco?.cep,
              },
              cotacao: emissaoPayload.cotacao?.nomeServico,
              logisticaReversa: emissaoPayload.logisticaReversa,
            }
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: emissaoResponse.status,
        }
      );
    }

    const emissaoData = JSON.parse(responseText);
    console.log('✅ Etiqueta emitida com sucesso!');

    // Bloquear créditos do cliente para esta etiqueta
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const emissaoId = emissaoData?.data?.id || emissaoData?.id;
      const codigoObjeto = emissaoData?.data?.codigoObjeto || emissaoData?.codigoObjeto;
      const valorFrete = parseFloat(emissaoData?.data?.frete?.valorTotal || emissaoData?.frete?.valorTotal || emissaoPayload?.cotacao?.valorTotal || '0');

      if (emissaoId && clienteId && valorFrete > 0) {
        console.log('💰 Bloqueando créditos:', { clienteId, emissaoId, valorFrete, codigoObjeto });
        
        const { data: transacaoId, error: bloqueioError } = await supabaseClient.rpc('bloquear_credito_etiqueta', {
          p_cliente_id: clienteId,
          p_emissao_id: emissaoId,
          p_valor: valorFrete,
          p_codigo_objeto: codigoObjeto || null
        });

        if (bloqueioError) {
          console.error('⚠️ Erro ao bloquear créditos (não impede emissão):', bloqueioError);
        } else {
          console.log('✅ Créditos bloqueados com sucesso! Transação:', transacaoId);
        }
      } else {
        console.log('⚠️ Dados insuficientes para bloquear créditos:', { emissaoId, clienteId, valorFrete });
      }
    } catch (creditError) {
      console.error('⚠️ Erro ao processar créditos (não impede emissão):', creditError);
    }

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
