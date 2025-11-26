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
    const { codigoObjeto, motivo, emissaoId } = await req.json();
    
    console.log('🔴 Iniciando cancelamento de etiqueta:', { codigoObjeto, motivo, emissaoId });

    // Validar campos obrigatórios
    if (!codigoObjeto || !motivo) {
      throw new Error('Código do objeto e motivo são obrigatórios');
    }

    // Obter credenciais da API externa
    const apiBaseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!apiBaseUrl || !adminEmail || !adminPassword) {
      console.error('❌ Variáveis de ambiente não configuradas');
      throw new Error('Configuração do servidor incompleta');
    }

    console.log('🔐 Fazendo login com credenciais de admin...');
    
    // 1. Fazer login com credenciais de admin
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

    // 2. Cancelar etiqueta usando token admin
    console.log('📤 Cancelando etiqueta na API externa...', { codigoObjeto, motivo });
    
    const cancelResponse = await fetch(`${apiBaseUrl}/emissoes/cancelar-emissao`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        codigoObjeto,
        motivo,
        motivoCancelamento: motivo,
      }),
    });

    const responseText = await cancelResponse.text();
    console.log('📥 Resposta da API:', responseText);

    if (!cancelResponse.ok) {
      console.error('❌ Erro ao cancelar etiqueta:', responseText);
      throw new Error(`Erro ao cancelar etiqueta: ${responseText}`);
    }

    console.log('✅ Etiqueta cancelada com sucesso na API externa!');

    // 3. Liberar crédito bloqueado
    if (emissaoId) {
      console.log('💰 Liberando crédito bloqueado...');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { error: creditError } = await supabase.rpc('liberar_credito_bloqueado', {
          p_emissao_id: emissaoId,
          p_codigo_objeto: codigoObjeto
        });

        if (creditError) {
          console.error('❌ Erro ao liberar crédito:', creditError);
          return new Response(
            JSON.stringify({
              success: true,
              warning: 'Etiqueta cancelada, mas houve erro ao extornar o crédito',
              data: responseText,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }

        console.log('✅ Crédito liberado com sucesso!');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Etiqueta cancelada e valor extornado com sucesso',
        data: responseText,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao cancelar etiqueta';
    
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
