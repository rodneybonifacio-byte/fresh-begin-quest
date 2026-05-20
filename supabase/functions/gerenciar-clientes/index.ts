// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🔒 Função para validar se o usuário é admin
async function validateAdminAccess(req: Request): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { isAdmin: false, error: 'Token de autorização não fornecido' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    console.log('🔐 Validando acesso admin...');
    
    const isAdmin = payload.role === 'admin' || 
                    payload.role === 'ADMIN' ||
                    payload.isAdmin === true || 
                    payload.user_metadata?.role === 'admin' ||
                    payload.app_metadata?.role === 'admin';
    
    if (isAdmin) {
      console.log('✅ Usuário é admin (via JWT claims)');
      return { isAdmin: true };
    }
    
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    if (payload.email === adminEmail) {
      console.log('✅ Usuário é admin (via email)');
      return { isAdmin: true };
    }
    
    console.log('❌ Usuário não tem permissão de admin');
    return { isAdmin: false, error: 'Acesso negado: permissão de administrador necessária' };
    
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return { isAdmin: false, error: 'Token inválido' };
  }
}

async function getAdminToken(): Promise<string> {
  return await getAdminTokenCached();
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔒 Validar acesso admin ANTES de qualquer operação
    const { isAdmin, error: authError } = await validateAdminAccess(req);
    
    if (!isAdmin) {
      console.error('🚫 Acesso negado:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError || 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = Deno.env.get('BASE_API_URL');
    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    const { action, searchTerm, clienteId, clienteEmail, destinatarioId, remetenteId } = await req.json();
    console.log('📋 Ação recebida:', action, { searchTerm, clienteId, clienteEmail, destinatarioId, remetenteId });

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
      const remetentes = data.data || data || [];
      
      console.log('📊 Total remetentes da API:', remetentes.length);
      if (remetentes.length > 0) {
        console.log('📋 Exemplo de remetente:', JSON.stringify(remetentes[0]));
      }
      
      // Filtrar por clienteId - verificar diferentes formatos possíveis
      const filteredRemetentes = remetentes.filter((r: any) => 
        r.clienteId === clienteId || r.cliente_id === clienteId
      );
      console.log('✅ Remetentes filtrados:', filteredRemetentes.length);

      return new Response(
        JSON.stringify({ success: true, data: filteredRemetentes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list_destinatarios') {
      console.log('📋 Listando destinatários do cliente:', clienteId);
      
      // Buscar emissões para extrair destinatários únicos
      const response = await fetch(`${baseUrl}/emissoes?limit=2000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao buscar emissões para destinatários:', errorText);
        return new Response(
          JSON.stringify({ success: true, data: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const emissoes = data.data || data || [];
      
      console.log('📊 Total emissões da API:', emissoes.length);
      
      // Filtrar emissões pelo clienteId e extrair destinatários únicos
      const destinatariosMap = new Map();
      for (const emissao of emissoes) {
        // Verificar se a emissão pertence ao cliente
        const emissaoClienteId = emissao.cliente?.id || emissao.clienteId || emissao.cliente_id;
        if (emissaoClienteId === clienteId && emissao.destinatario && emissao.destinatario.id) {
          destinatariosMap.set(emissao.destinatario.id, emissao.destinatario);
        }
      }
      
      const destinatarios = Array.from(destinatariosMap.values());
      console.log('✅ Destinatários únicos do cliente:', destinatarios.length);

      return new Response(
        JSON.stringify({ success: true, data: destinatarios }),
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