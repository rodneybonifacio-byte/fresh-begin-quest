// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { cancelarEmissaoMarketplace } from "../_shared/marketplace.ts";
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
    const { codigoObjeto, motivo, emissaoId } = await req.json();
    
    console.log('🔴 Iniciando cancelamento de etiqueta:', { codigoObjeto, motivo, emissaoId });

    // Validar campos obrigatórios
    if (!codigoObjeto || !motivo) {
      throw new Error('Código do objeto e motivo são obrigatórios');
    }

    // Detectar origem: se a emissão está em emissoes_marketplace, cancelar via MP
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let isMarketplace = false;
    let uuidMarketplace: string | null = null;
    if (supabaseUrl && supabaseServiceKey) {
      const supa = createClient(supabaseUrl, supabaseServiceKey);
      const { data: mp } = await supa
        .from('emissoes_marketplace')
        .select('uuid_marketplace, codigo_objeto')
        .eq('codigo_objeto', codigoObjeto)
        .maybeSingle();
      if (mp?.uuid_marketplace) {
        isMarketplace = true;
        uuidMarketplace = mp.uuid_marketplace;
      }
    }

    if (isMarketplace && uuidMarketplace) {
      console.log('[MP] cancelando via Marketplace, uuid:', uuidMarketplace);
      const mpResp = await cancelarEmissaoMarketplace(uuidMarketplace, motivo);

      // Estornar crédito bloqueado (mesma lógica BRHUB)
      if (emissaoId && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error: creditError } = await supabase
          .from('transacoes_credito')
          .delete()
          .eq('emissao_id', emissaoId)
          .eq('tipo', 'consumo')
          .eq('status', 'bloqueado');
        if (creditError) {
          console.error('❌ Erro ao deletar bloqueio (MP):', creditError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          origem: 'marketplace',
          message: 'Etiqueta Marketplace cancelada e valor estornado',
          data: mpResp,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Obter credenciais da API externa (fluxo BRHUB)
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

    // 3. Deletar crédito bloqueado (cancelamento = volta para disponível)
    if (emissaoId) {
      console.log('💰 Deletando crédito bloqueado...');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { error: creditError } = await supabase
          .from('transacoes_credito')
          .delete()
          .eq('emissao_id', emissaoId)
          .eq('tipo', 'consumo')
          .eq('status', 'bloqueado');

        if (creditError) {
          console.error('❌ Erro ao deletar bloqueio:', creditError);
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

        console.log('✅ Crédito bloqueado deletado com sucesso!');
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
