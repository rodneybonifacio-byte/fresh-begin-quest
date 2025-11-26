// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Recebendo requisição de cadastro de remetente:', { ...requestBody, senha: '***', apiToken: '***' });

    // Validar campos obrigatórios
    if (!requestBody.nome || !requestBody.cpfCnpj || !requestBody.email) {
      throw new Error('Campos obrigatórios faltando: nome, cpfCnpj, email');
    }

    if (!requestBody.endereco || !requestBody.endereco.cep) {
      throw new Error('Endereço completo é obrigatório');
    }

    // Validar token do usuário
    if (!requestBody.apiToken) {
      throw new Error('Token do usuário não fornecido');
    }

    // Decodificar o token do usuário para obter o clienteId
    const userTokenPayload = JSON.parse(atob(requestBody.apiToken.split('.')[1]));
    const clienteId = userTokenPayload.clienteId;

    if (!clienteId) {
      console.error('❌ clienteId não encontrado no token do usuário');
      throw new Error('Falha ao obter ID do cliente do token');
    }

    console.log('✅ ClienteId do usuário:', clienteId);

    // Obter credenciais da API externa
    const apiBaseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!apiBaseUrl || !adminEmail || !adminPassword) {
      console.error('❌ Variáveis de ambiente não configuradas');
      throw new Error('Configuração do servidor incompleta');
    }

    console.log('🔐 Fazendo login com credenciais de admin na API externa...');
    
    // 1. Fazer login com credenciais de admin para obter token com permissões
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

    if (!authToken) {
      throw new Error('Token de autenticação não recebido');
    }

    console.log('✅ Login admin realizado com sucesso');

    // 2. Criar remetente na API externa com clienteId do usuário
    const remetenteData = {
      clienteId: clienteId, // ClienteId do usuário, não do admin
      nome: requestBody.nome.trim(),
      cpfCnpj: requestBody.cpfCnpj.replace(/\D/g, ''),
      documentoEstrangeiro: requestBody.documentoEstrangeiro || '',
      celular: requestBody.celular || '',
      telefone: requestBody.telefone || '',
      email: requestBody.email.trim(),
      endereco: {
        cep: requestBody.endereco.cep.replace(/\D/g, ''),
        logradouro: requestBody.endereco.logradouro.trim(),
        numero: requestBody.endereco.numero.trim(),
        complemento: requestBody.endereco.complemento?.trim() || '',
        bairro: requestBody.endereco.bairro.trim(),
        localidade: requestBody.endereco.localidade.trim(),
        uf: requestBody.endereco.uf.trim(),
      },
    };

    console.log('📤 Enviando dados do remetente para API externa com clienteId:', clienteId);

    const createRemetenteResponse = await fetch(`${apiBaseUrl}/remetentes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`, // Token admin para permissões
      },
      body: JSON.stringify(remetenteData),
    });

    const responseText = await createRemetenteResponse.text();
    console.log('📥 Resposta da API:', responseText.substring(0, 200));

    if (!createRemetenteResponse.ok) {
      console.error('❌ Erro ao criar remetente:', responseText);
      
      // Verificar se é erro de duplicidade
      if (responseText.toLowerCase().includes('já existe') || 
          responseText.toLowerCase().includes('duplicado') ||
          responseText.toLowerCase().includes('cpf') ||
          responseText.toLowerCase().includes('cnpj')) {
        return new Response(
          JSON.stringify({ 
            error: 'CPF/CNPJ já cadastrado',
            message: 'Este CPF/CNPJ já está cadastrado no sistema'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          }
        );
      }

      throw new Error(`Erro ao criar remetente: ${responseText}`);
    }

    let remetenteResponse;
    try {
      remetenteResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Erro ao fazer parse do JSON:', e);
      throw new Error('Resposta inválida da API');
    }

    console.log('✅ Remetente criado com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Remetente cadastrado com sucesso',
        data: remetenteResponse,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao cadastrar remetente';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
