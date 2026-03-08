// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Resolve o nome real do remetente, evitando genéricos.
 * Hierarquia: remetenteNome → remetente.nome → remetenteId → cpf_cnpj → cliente.nome → "Loja"
 */
async function resolverNomeRemetente(supabase: any, envio: any): Promise<string> {
  const genericos = ['remetente', 'loja', ''];
  const isGenerico = (n: string) => {
    const l = (n || '').trim().toLowerCase();
    return genericos.includes(l) || l.length < 2;
  };
  const formatFullName = (n: string) => {
    const name = n.trim();
    if (!name) return "";
    return name.split(/\s+/).map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  };

  const nomeDireto = (envio.remetenteNome || '').trim();
  if (!isGenerico(nomeDireto)) return formatFullName(nomeDireto);

  const nomeObjeto = (envio.remetente?.nome || '').trim();
  if (!isGenerico(nomeObjeto)) return formatFullName(nomeObjeto);

  const remetenteId = envio.remetenteId || envio.remetente_id;
  if (remetenteId) {
    try {
      const { data: rem } = await supabase.from('remetentes').select('nome').eq('id', remetenteId).maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) {
        console.log(`🔍 Remetente resolvido via ID: "${rem.nome}"`);
        return formatFullName(rem.nome);
      }
    } catch (err) { console.warn('⚠️ Erro resolver remetente ID:', err); }
  }

  const cpfCnpj = envio.remetenteCpfCnpj || envio.remetente?.cpfCnpj || '';
  if (cpfCnpj) {
    try {
      const { data: rem } = await supabase.from('remetentes').select('nome').eq('cpf_cnpj', cpfCnpj.replace(/\D/g, '')).limit(1).maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) {
        console.log(`🔍 Remetente resolvido via CPF/CNPJ: "${rem.nome}"`);
        return formatFullName(rem.nome);
      }
    } catch (err) { console.warn('⚠️ Erro resolver remetente CPF:', err); }
  }

  const nomeCliente = (envio.cliente?.nome || '').trim();
  if (!isGenerico(nomeCliente)) {
    console.log(`🔍 Usando nome do cliente: "${nomeCliente}"`);
    return formatFullName(nomeCliente);
  }

  return 'Loja';
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/78d24e18-565d-4a01-9e68-85775e33e278';
const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se há filtro de código objeto específico (reenvio individual)
    let codigoObjetoFiltro: string | null = null;
    try {
      const body = await req.json();
      codigoObjetoFiltro = body?.codigoObjeto || null;
      console.log('📋 Body recebido:', JSON.stringify(body));
    } catch {
      // Sem body ou não é JSON
    }

    console.log('🔄 Iniciando verificação de envios AGUARDANDO_RETIRADA...');
    if (codigoObjetoFiltro) {
      console.log(`🎯 Modo REENVIO para objeto específico: ${codigoObjetoFiltro}`);
    }

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
    let envios = enviosData?.data || [];

    // Se temos um código objeto específico, filtrar apenas ele
    if (codigoObjetoFiltro) {
      envios = envios.filter((e: any) => e.codigoObjeto === codigoObjetoFiltro);
      console.log(`🎯 Filtrado para ${envios.length} envio(s) com código ${codigoObjetoFiltro}`);
    }

    console.log(`📊 Encontrados ${envios.length} envios com status AGUARDANDO_RETIRADA`);

    if (envios.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: codigoObjetoFiltro 
            ? `Objeto ${codigoObjetoFiltro} não encontrado com status AGUARDANDO_RETIRADA` 
            : 'Nenhum envio AGUARDANDO_RETIRADA encontrado', 
          notificados: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se é reenvio individual (codigoObjetoFiltro), não verificar se já foi notificado
    // pois o registro foi deletado antes de chamar esta função
    let codigosJaNotificados = new Set<string>();
    
    if (!codigoObjetoFiltro) {
      // Buscar códigos já notificados apenas no modo batch (sem filtro)
      const codigosObjetos = envios.map((e: any) => e.codigoObjeto).filter(Boolean);
      
      const { data: jaNotificados } = await supabase
        .from('notificacoes_aguardando_retirada')
        .select('codigo_objeto')
        .in('codigo_objeto', codigosObjetos);

      codigosJaNotificados = new Set((jaNotificados || []).map((n: any) => n.codigo_objeto));
    }
    
    // Filtrar envios pendentes de notificação (ou todos se for reenvio individual)
    const enviosPendentes = codigoObjetoFiltro 
      ? envios  // Reenvio: processar todos os filtrados
      : envios.filter((e: any) => e.codigoObjeto && !codigosJaNotificados.has(e.codigoObjeto));

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

        // Log completo do envio para debug
        console.log(`📦 Dados do envio ${envio.codigoObjeto}:`, JSON.stringify(envio).substring(0, 2000));

        // PASSO 1: Verificar se há override de celular cadastrado no Supabase
        let celularOverride: string | null = null;
        const { data: overrideData } = await supabase
          .from('celulares_override')
          .select('celular')
          .eq('codigo_objeto', envio.codigoObjeto)
          .maybeSingle();
        
        if (overrideData?.celular) {
          celularOverride = overrideData.celular;
          console.log(`📱 Celular OVERRIDE encontrado: "${celularOverride}"`);
        }

        // PASSO 2: Tentar múltiplos campos possíveis onde o celular pode estar (fallback)
        let celular = celularOverride || destinatario.celular || destinatario.telefone || 
                      envio.destinatarioCelular || envio.destinatario_celular ||
                      envio.celular || envio.telefone || '';
        console.log(`📱 Celular encontrado (raw): "${celular}"`);
        
        // Remover caracteres não numéricos
        celular = celular.replace(/\D/g, '');
        // Adicionar prefixo 55 se não tiver
        if (celular && !celular.startsWith('55')) {
          celular = '55' + celular;
        }
        console.log(`📱 Celular formatado: "${celular}"`);

        // Preparar payload para o webhook DataCrazy
        // Resolver nome real do remetente (evitar genérico "Remetente")
        const nomeRemetenteResolvido = await resolverNomeRemetente(supabase, envio);
        
        const webhookPayload = {
          destinatario_nome: destinatario.nome || envio.destinatarioNome || '',
          codigo_objeto: envio.codigoObjeto || '',
          remetente_nome: nomeRemetenteResolvido,
          destinatario_celular: celular,
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
