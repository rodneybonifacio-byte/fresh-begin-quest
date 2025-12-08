// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/181d8bbe-a92e-43f1-9660-b2e3acf2632b';
const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando verificação de envios AGUARDANDO_RETIRADA...');

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Login admin na API
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

    // Buscar envios com status AGUARDANDO_RETIRADA usando endpoint admin
    console.log('📦 Buscando envios AGUARDANDO_RETIRADA...');
    const enviosResponse = await fetch(
      `${BASE_API_URL}/emissoes/admin?status=AGUARDANDO_RETIRADA&limit=100&offset=0`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!enviosResponse.ok) {
      const errText = await enviosResponse.text();
      throw new Error(`Falha ao buscar envios: ${enviosResponse.status} - ${errText}`);
    }

    const enviosText = await enviosResponse.text();
    console.log('📄 Resposta da API:', enviosText.substring(0, 500));
    
    let enviosData;
    try {
      enviosData = JSON.parse(enviosText);
    } catch {
      throw new Error(`Resposta inválida da API: ${enviosText.substring(0, 200)}`);
    }
    
    // A API retorna { data: [...], meta: {...} }
    const envios = enviosData?.data || [];

    console.log(`📊 Encontrados ${envios.length} envios com status AGUARDANDO_RETIRADA`);

    if (envios.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum envio AGUARDANDO_RETIRADA encontrado', notificados: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar códigos já notificados
    const codigosObjetos = envios.map((e: any) => e.codigoObjeto).filter(Boolean);
    
    const { data: jaNotificados } = await supabase
      .from('notificacoes_aguardando_retirada')
      .select('codigo_objeto')
      .in('codigo_objeto', codigosObjetos);

    const codigosJaNotificados = new Set((jaNotificados || []).map((n: any) => n.codigo_objeto));
    
    // Filtrar envios pendentes de notificação
    const enviosPendentes = envios.filter((e: any) => 
      e.codigoObjeto && !codigosJaNotificados.has(e.codigoObjeto)
    );

    console.log(`📬 ${enviosPendentes.length} envios pendentes de notificação`);

    let notificados = 0;
    const erros: string[] = [];

    for (const envio of enviosPendentes) {
      try {
        // Extrair dados do último evento de rastreio (se disponível)
        const ultimoEvento = envio.rastreio?.eventos?.[0] || {};
        const unidade = ultimoEvento.unidade || {};
        const enderecoUnidade = unidade.endereco || {};

        // Preparar payload para o webhook DataCrazy
        // Os campos vêm diretamente no objeto envio (não aninhados)
        const webhookPayload = {
          destinatario_nome: envio.destinatarioNome || '',
          codigo_objeto: envio.codigoObjeto || '',
          remetente_nome: envio.remetenteNome || '',
          // Dados da unidade dos Correios (onde está aguardando retirada)
          unidade_logradouro: enderecoUnidade.logradouro || unidade.nome || '',
          unidade_numero: enderecoUnidade.numero || '',
          unidade_complemento: enderecoUnidade.complemento || '',
          unidade_bairro: enderecoUnidade.bairro || '',
          unidade_tipo: unidade.tipo || '',
          destinatario_celular: envio.destinatarioCelular || '',
        };

        console.log('📋 Payload webhook:', JSON.stringify(webhookPayload));

        console.log(`📤 Notificando: ${envio.codigoObjeto}`);

        // Enviar para webhook
        const webhookResponse = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        const responseText = await webhookResponse.text();

        // Registrar notificação no Supabase
        await supabase.from('notificacoes_aguardando_retirada').insert({
          codigo_objeto: envio.codigoObjeto,
          destinatario_nome: webhookPayload.destinatario_nome,
          remetente_nome: webhookPayload.remetente_nome,
          destinatario_celular: webhookPayload.destinatario_celular,
          webhook_response: responseText.substring(0, 500),
        });

        notificados++;
        console.log(`✅ Notificado: ${envio.codigoObjeto}`);

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`❌ Erro ao notificar ${envio.codigoObjeto}:`, errorMessage);
        erros.push(`${envio.codigoObjeto}: ${errorMessage}`);
      }
    }

    console.log(`🏁 Finalizado: ${notificados} notificados, ${erros.length} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Verificação concluída`,
        total_encontrados: envios.length,
        ja_notificados: codigosJaNotificados.size,
        notificados_agora: notificados,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro no CRON verificar-aguardando-retirada:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
