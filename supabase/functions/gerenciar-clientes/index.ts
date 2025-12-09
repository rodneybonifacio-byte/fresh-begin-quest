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

  console.log('🔐 Obtendo token admin...');

  if (!adminEmail || !adminPassword) {
    throw new Error('Credenciais de admin não configuradas');
  }

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      senha: adminPassword,
    }),
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    console.error('❌ Erro no login admin:', errorText);
    throw new Error(`Falha no login admin: ${loginResponse.status}`);
  }

  const loginData = await loginResponse.json();
  console.log('✅ Token admin obtido com sucesso');
  return loginData.data?.token || loginData.token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const baseUrl = Deno.env.get('BASE_API_URL');
    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    const { action, searchTerm, clienteId, destinatarioId, remetenteId } = await req.json();
    console.log('📋 Ação recebida:', action, { searchTerm, clienteId, destinatarioId, remetenteId });

    const adminToken = await getAdminToken();

    if (action === 'search_clientes') {
      console.log('🔍 Buscando clientes com termo:', searchTerm);
      
      const response = await fetch(`${baseUrl}/clientes?search=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao buscar clientes:', errorText);
        throw new Error('Erro ao buscar clientes');
      }

      const data = await response.json();
      console.log('✅ Clientes encontrados:', data?.data?.length || data?.length || 0);

      return new Response(
        JSON.stringify({ success: true, data: data.data || data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list_remetentes') {
      console.log('📋 Listando remetentes do cliente:', clienteId);
      
      const response = await fetch(`${baseUrl}/remetentes?clienteId=${clienteId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao buscar remetentes:', errorText);
        throw new Error('Erro ao buscar remetentes');
      }

      const data = await response.json();
      console.log('✅ Remetentes encontrados:', data?.data?.length || data?.length || 0);

      return new Response(
        JSON.stringify({ success: true, data: data.data || data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list_destinatarios') {
      console.log('📋 Listando destinatários do cliente:', clienteId);
      
      const response = await fetch(`${baseUrl}/destinatarios?clienteId=${clienteId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao buscar destinatários:', errorText);
        throw new Error('Erro ao buscar destinatários');
      }

      const data = await response.json();
      console.log('✅ Destinatários encontrados:', data?.data?.length || data?.length || 0);

      return new Response(
        JSON.stringify({ success: true, data: data.data || data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_remetente') {
      console.log('🗑️ Excluindo remetente:', remetenteId);
      
      const response = await fetch(`${baseUrl}/remetentes/${remetenteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao excluir remetente:', errorText);
        throw new Error('Erro ao excluir remetente');
      }

      console.log('✅ Remetente excluído com sucesso');

      return new Response(
        JSON.stringify({ success: true, message: 'Remetente excluído com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_destinatario') {
      console.log('🗑️ Excluindo destinatário:', destinatarioId);
      
      const response = await fetch(`${baseUrl}/destinatarios/${destinatarioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao excluir destinatário:', errorText);
        throw new Error('Erro ao excluir destinatário');
      }

      console.log('✅ Destinatário excluído com sucesso');

      return new Response(
        JSON.stringify({ success: true, message: 'Destinatário excluído com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Ação não reconhecida: ' + action);

  } catch (error) {
    console.error('❌ Erro na edge function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
