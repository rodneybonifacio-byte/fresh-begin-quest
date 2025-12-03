// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAdminToken(): Promise<string> {
  const baseUrl = Deno.env.get('BASE_API_URL');
  const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
  const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

  if (!adminEmail || !adminPassword) {
    throw new Error('Credenciais de admin não configuradas');
  }

  console.log('🔐 Obtendo token admin...');
  
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  if (!loginResponse.ok) {
    throw new Error('Falha ao autenticar com credenciais admin');
  }

  const loginData = await loginResponse.json();
  console.log('✅ Token admin obtido');
  return loginData.data?.token || loginData.token;
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
      console.error('❌ Token do usuário não fornecido');
      throw new Error('Token de autenticação não fornecido');
    }

    // Extrair clienteId do token do usuário
    let clienteId = null;
    try {
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      clienteId = tokenPayload.clienteId;
      console.log('👤 ClienteId do usuário:', clienteId);
    } catch (e) {
      console.error('❌ Erro ao extrair clienteId do token:', e.message);
      throw new Error('Token inválido - não foi possível identificar o cliente');
    }

    if (!clienteId) {
      throw new Error('ClienteId não encontrado no token');
    }

    // Preparar payload da emissão
    const emissaoPayload = {
      ...requestData.emissaoData,
      clienteId, // CRÍTICO: Sempre enviar para aplicar regras do cliente
    };

    // Remove userToken do payload antes de enviar para API
    delete emissaoPayload.userToken;

    console.log('📦 Payload da emissão:', JSON.stringify(emissaoPayload));

    // Primeira tentativa: usar token do próprio usuário
    console.log('📊 Tentativa 1: Emitindo com token do usuário...');
    
    let emissaoResponse = await fetch(`${baseUrl}/emissoes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emissaoPayload),
    });

    // Se for 403, tentar com credenciais admin
    if (emissaoResponse.status === 403) {
      console.log('⚠️ Acesso negado com token do usuário. Tentando com credenciais admin...');
      
      const adminToken = await getAdminToken();
      
      emissaoResponse = await fetch(`${baseUrl}/emissoes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emissaoPayload),
      });
    }

    const responseText = await emissaoResponse.text();
    console.log('📄 Resposta da emissão (status):', emissaoResponse.status);

    if (!emissaoResponse.ok) {
      console.error('❌ Erro na emissão:', responseText);
      
      // Parse error response to get proper message
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
