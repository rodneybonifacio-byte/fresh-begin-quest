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
    console.log('📄 Resposta da API:', enviosText.substring(0, 1500));
    
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
        // Buscar dados de rastreio do objeto para obter informações da unidade
        let rastreioData: any = null;
        if (envio.codigoObjeto) {
          try {
            // Endpoint correto de rastreio: rastrear?codigo={codigo}
            const rastreioUrl = `${BASE_API_URL}/rastrear?codigo=${envio.codigoObjeto}`;
            console.log(`🔍 Buscando rastreio: ${rastreioUrl}`);
            const rastreioResponse = await fetch(rastreioUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            console.log(`📡 Status rastreio ${envio.codigoObjeto}: ${rastreioResponse.status}`);
            if (rastreioResponse.ok) {
              const rastreioText = await rastreioResponse.text();
              console.log(`📍 Rastreio raw ${envio.codigoObjeto}:`, rastreioText.substring(0, 1000));
              const rastreioJson = JSON.parse(rastreioText);
              rastreioData = rastreioJson.data || rastreioJson;
            } else {
              const errText = await rastreioResponse.text();
              console.log(`⚠️ Rastreio falhou ${envio.codigoObjeto}: ${errText.substring(0, 200)}`);
            }
          } catch (rastreioErr) {
            console.log(`⚠️ Erro ao obter rastreio de ${envio.codigoObjeto}:`, rastreioErr);
          }
        }

        // Extrair dados do evento de AGUARDANDO_RETIRADA (LDI = Local de retirada identificado)
        const eventos = Array.isArray(rastreioData) ? rastreioData : (rastreioData?.eventos || []);
        // Buscar o evento LDI (aguardando retirada) que contém a unidade correta
        const eventoLDI = eventos.find((e: any) => e.codigo === 'LDI') || eventos[0] || {};
        const unidade = eventoLDI.unidade || {};
        const enderecoUnidade = unidade.endereco || {};
        
        // Extrair cidade e UF do cidadeUf (fallback)
        const cidadeUf = unidade.cidadeUf || '';
        const [cidadeFallback, ufFallback] = cidadeUf.includes('-') ? cidadeUf.split('-') : [cidadeUf, ''];
        
        console.log(`📍 Evento LDI: ${JSON.stringify(eventoLDI).substring(0, 800)}`);

        // Extrair dados do destinatário (objeto aninhado na API)
        const destinatario = envio.destinatario || {};
        const enderecoDestinatario = destinatario.endereco || {};

        // Preparar payload para o webhook DataCrazy
        const webhookPayload = {
          destinatario_nome: destinatario.nome || envio.destinatarioNome || '',
          codigo_objeto: envio.codigoObjeto || '',
          remetente_nome: envio.remetenteNome || envio.cliente?.nome || '',
          destinatario_celular: destinatario.celular || envio.destinatarioCelular || '',
          // Endereço do destinatário
          destinatario_cep: enderecoDestinatario.cep || '',
          destinatario_logradouro: enderecoDestinatario.logradouro || '',
          destinatario_numero: enderecoDestinatario.numero || '',
          destinatario_complemento: enderecoDestinatario.complemento || '',
          destinatario_bairro: enderecoDestinatario.bairro || '',
          destinatario_cidade: enderecoDestinatario.localidade || '',
          destinatario_uf: enderecoDestinatario.uf || '',
          // Dados COMPLETOS da unidade dos Correios (onde retirar)
          unidade_tipo: unidade.tipo || '',
          unidade_cep: enderecoUnidade.cep || '',
          unidade_logradouro: enderecoUnidade.logradouro || '',
          unidade_numero: enderecoUnidade.numero || '',
          unidade_bairro: enderecoUnidade.bairro || '',
          unidade_cidade: enderecoUnidade.cidade || cidadeFallback || '',
          unidade_uf: enderecoUnidade.uf || ufFallback || '',
        };

        console.log('📋 Payload webhook:', JSON.stringify(webhookPayload));

        console.log(`📤 Notificando: ${envio.codigoObjeto}`);

        // Enviar para webhook
        const webhookResponse = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        const status = webhookResponse.status;
        const responseText = await webhookResponse.text();
        console.log(`📬 Resposta webhook (${envio.codigoObjeto}):`, status, responseText.substring(0, 500));

        if (!webhookResponse.ok) {
          // Registrar tentativa com erro
          await supabase.from('notificacoes_aguardando_retirada').insert({
            codigo_objeto: envio.codigoObjeto,
            destinatario_nome: webhookPayload.destinatario_nome,
            remetente_nome: webhookPayload.remetente_nome,
            destinatario_celular: webhookPayload.destinatario_celular,
            webhook_response: `ERRO ${status}: ${responseText.substring(0, 450)}`,
          });

          throw new Error(`Webhook retornou status ${status}`);
        }

        // Registrar notificação com sucesso
        await supabase.from('notificacoes_aguardando_retirada').insert({
          codigo_objeto: envio.codigoObjeto,
          destinatario_nome: webhookPayload.destinatario_nome,
          remetente_nome: webhookPayload.remetente_nome,
          destinatario_celular: webhookPayload.destinatario_celular,
          webhook_response: `OK ${status}: ${responseText.substring(0, 450)}`,
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
