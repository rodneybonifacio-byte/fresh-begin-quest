// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { rastrearMarketplace } from "../_shared/marketplace.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo } = await req.json();
    
    if (!codigo) {
      return new Response(
        JSON.stringify({ error: 'Código de rastreio é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Testando rastreio para: ${codigo}`);

    // Detectar origem: olhar emissoes_marketplace por codigo_objeto
    try {
      const supaUrl = Deno.env.get('SUPABASE_URL');
      const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supaUrl && supaKey) {
        const supa = createClient(supaUrl, supaKey);
        const { data: mp } = await supa
          .from('emissoes_marketplace')
          .select('codigo_objeto')
          .eq('codigo_objeto', codigo)
          .maybeSingle();
        if (mp) {
          console.log('[MP] rastreio via Marketplace');
          const result = await rastrearMarketplace(codigo);
          const eventos = result.eventos || [];
          const ultimoEvento = eventos[0] || null;
          return new Response(
            JSON.stringify({
              success: true,
              codigo,
              dados: { data: result },
              origem: 'marketplace',
              analise: {
                temEventos: eventos.length > 0,
                totalEventos: eventos.length,
                ultimoEvento,
                ultimaLocalizacao: ultimoEvento?.unidade?.cidadeUf || 'N/A',
                ultimoStatus: ultimoEvento?.descricao || 'N/A',
                dataPrevisaoEntrega: result.dataPrevisaoEntrega || 'N/A',
                servico: result.servico || 'N/A',
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (mpErr) {
      console.error('[MP] erro ao tentar rastreio marketplace:', mpErr);
      // cai pro fluxo BRHUB
    }

    // Login admin para obter token
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      throw new Error('Credenciais de admin não configuradas');
    }

    console.log('🔐 Fazendo login admin...');
    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });

    if (!loginResponse.ok) {
      const errText = await loginResponse.text();
      throw new Error(`Falha no login admin: ${loginResponse.status} - ${errText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Chamar API de rastreio
    console.log('📡 Chamando API de rastreio...');
    const rastreioResponse = await fetch(`${BASE_API_URL}/rastrear?codigo=${codigo}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!rastreioResponse.ok) {
      const errorText = await rastreioResponse.text();
      console.error(`❌ Erro na API de rastreio: ${errorText}`);
      throw new Error(`Erro na API de rastreio: ${rastreioResponse.status}`);
    }

    const rastreioData = await rastreioResponse.json();
    
    console.log('📦 Resposta completa da API de rastreio:');
    console.log(JSON.stringify(rastreioData, null, 2));

    // Extrair dados úteis para o mapa
    const dados = rastreioData?.data || rastreioData;
    const eventos = dados?.eventos || [];
    const ultimoEvento = eventos[0] || null;

    // Retornar dados completos para análise
    return new Response(
      JSON.stringify({
        success: true,
        codigo,
        dados: rastreioData,
        analise: {
          temEventos: eventos.length > 0,
          totalEventos: eventos.length,
          ultimoEvento: ultimoEvento,
          ultimaLocalizacao: ultimoEvento?.unidade?.cidadeUf || 'N/A',
          ultimoStatus: ultimoEvento?.descricao || 'N/A',
          dataPrevisaoEntrega: dados?.dataPrevisaoEntrega || 'N/A',
          servico: dados?.servico || 'N/A',
          camposDisponiveis: dados ? Object.keys(dados) : [],
          camposEvento: ultimoEvento ? Object.keys(ultimoEvento) : [],
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
