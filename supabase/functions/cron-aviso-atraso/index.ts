// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEADER_IMAGE_URL = 'https://xikvfybxthvqhpjbrszp.supabase.co/storage/v1/object/public/public-assets/aviso-atraso-header.png';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmissaoEmTransito {
  id: string
  codigoObjeto: string
  status: string
  servico?: string
  cliente?: {
    id: string
    nome: string
  }
  remetenteNome?: string
  destinatario?: {
    nome: string
  }
  dataPrevisaoEntrega?: string
  remetenteId?: string
  remetente?: {
    nome: string
  }
  remetenteCpfCnpj?: string
  destinatarioCelular?: string
}

async function resolverNomeRemetente(emissao: any): Promise<string> {
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

  const nomeDireto = (emissao.remetenteNome || '').trim();
  if (!isGenerico(nomeDireto)) return formatFullName(nomeDireto);

  const nomeObjeto = (emissao.remetente?.nome || '').trim();
  if (!isGenerico(nomeObjeto)) return formatFullName(nomeObjeto);

  const remetenteId = emissao.remetenteId || emissao.remetente_id;
  if (remetenteId) {
    try {
      const { data: rem } = await supabase
        .from('remetentes')
        .select('nome')
        .eq('id', remetenteId)
        .maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) return formatFullName(rem.nome);
    } catch (err) {
      console.warn('⚠️ Erro ao resolver remetente por ID:', err);
    }
  }

  const cpfCnpj = emissao.remetenteCpfCnpj || emissao.remetente?.cpfCnpj || '';
  if (cpfCnpj) {
    try {
      const { data: rem } = await supabase
        .from('remetentes')
        .select('nome')
        .eq('cpf_cnpj', cpfCnpj.replace(/\D/g, ''))
        .limit(1)
        .maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) return formatFullName(rem.nome);
    } catch (err) {
      console.warn('⚠️ Erro ao resolver remetente por CPF/CNPJ:', err);
    }
  }

  const nomeCliente = (emissao.cliente?.nome || '').trim();
  if (!isGenerico(nomeCliente)) return formatFullName(nomeCliente);

  return 'Loja';
}

async function loginAdmin(): Promise<string> {
  const baseApiUrl = Deno.env.get('BASE_API_URL');
  const email = Deno.env.get('API_ADMIN_EMAIL');
  const password = Deno.env.get('API_ADMIN_PASSWORD');

  if (!email || !password || !baseApiUrl) {
    throw new Error('Credenciais de admin não configuradas');
  }

  const response = await fetch(`${baseApiUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Falha no login admin');
  }

  const data = await response.json();
  return data.token;
}

async function fetchEmissoesEmTransito(token: string): Promise<any[]> {
  const baseApiUrl = Deno.env.get('BASE_API_URL');
  const allEmissoes: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `${baseApiUrl}/emissoes/admin?status=EM_TRANSITO&limit=${limit}&offset=${offset}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error(`Erro de rede ao buscar emissões:`, err);
      break;
    }

    if (!response.ok) {
      console.error(`Erro ao buscar emissões: ${response.status}`);
      const body = await response.text();
      console.error(`Body: ${body}`);
      break;
    }

    const data = await response.json();
    const emissoes = data.data || [];
    allEmissoes.push(...emissoes);

    if (emissoes.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allEmissoes;
}

function isAtrasado(dateString: string): boolean {
  if (!dateString) return false;
  
  try {
    const dataPrevisao = new Date(dateString);
    if (isNaN(dataPrevisao.getTime())) return false;

    const agoraBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    const hojeDia = new Date(agoraBrasilia);
    hojeDia.setHours(0, 0, 0, 0);
    
    const previsaoDia = new Date(dataPrevisao);
    previsaoDia.setHours(0, 0, 0, 0);
    
    if (hojeDia > previsaoDia) return true;
    
    if (hojeDia.getTime() === previsaoDia.getTime()) {
      const hora = agoraBrasilia.getHours();
      const minuto = agoraBrasilia.getMinutes();
      return (hora > 16) || (hora === 16 && minuto >= 30);
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Busca códigos de rastreio que já receberam notificação de atraso nos últimos 30 dias
 */
async function buscarJaNotificados(): Promise<Set<string>> {
  const desde = new Date();
  desde.setDate(desde.getDate() - 30);

  const { data: msgs } = await supabase
    .from('whatsapp_messages')
    .select('content, metadata')
    .eq('direction', 'outbound')
    .eq('content_type', 'hsm')
    .gte('created_at', desde.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  const notificados = new Set<string>();

  if (msgs) {
    for (const msg of msgs) {
      const meta = msg.metadata as any;
      if (meta?.trigger_key === 'atraso') {
        // tracking_code pode estar no topo OU dentro de variables.codigo_rastreio
        const code = meta?.tracking_code || meta?.variables?.codigo_rastreio;
        if (code) {
          notificados.add(code);
        }
      }
    }
  }

  console.log(`🔍 ${notificados.size} códigos já notificados de atraso nos últimos 30 dias`);
  return notificados;
}

/**
 * Busca dados de rastreio para obter previsão de entrega
 */
async function fetchRastreio(token: string, codigoObjeto: string): Promise<any | null> {
  const baseApiUrl = Deno.env.get('BASE_API_URL');

  try {
    const response = await fetch(`${baseApiUrl}/rastrear?codigo=${codigoObjeto}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Formata data para DD/MM/YYYY
 */
function formatDateBR(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

async function enviarNotificacaoAtraso(emissao: any, previsaoFormatada: string): Promise<boolean> {
  try {
    const nomeRemetente = await resolverNomeRemetente(emissao);
    const celular = emissao.destinatario?.celular || '';
    
    if (!celular) {
      console.warn(`Sem celular para ${emissao.codigoObjeto}, pulando...`);
      return false;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        trigger_key: 'atraso',
        phone: celular,
        variables: {
          nome_destinatario: emissao.destinatario?.nome || '',
          codigo_rastreio: emissao.codigoObjeto || '',
          nome_remetente: nomeRemetente,
          previsao_entrega: previsaoFormatada,
          header_image_url: HEADER_IMAGE_URL,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ Falha atraso ${emissao.codigoObjeto}: ${response.status} - ${errText}`);
      return false;
    }

    console.log(`✅ Atraso notificado: ${emissao.codigoObjeto} (previsão: ${previsaoFormatada})`);
    return true;
  } catch (error) {
    console.error(`❌ Erro atraso ${emissao.codigoObjeto}:`, error);
    return false;
  }
}

/**
 * Atualiza ou cria card no pipeline de rastreio com status "atrasado"
 */
async function atualizarPipeline(emissao: any): Promise<void> {
  try {
    const codigo = emissao.codigoObjeto;
    const celular = emissao.destinatario?.celular || '';
    const nomeContato = emissao.destinatario?.nome || '';

    // Buscar card existente para este código
    const { data: existingCards } = await supabase
      .from('ai_support_pipeline')
      .select('id, status')
      .eq('category', 'rastreio')
      .ilike('subject', `%${codigo}%`)
      .limit(1);

    if (existingCards && existingCards.length > 0) {
      const card = existingCards[0];
      // Só atualizar se não estiver em status final
      if (!['entregue', 'cancelado', 'concluido'].includes(card.status)) {
        await supabase
          .from('ai_support_pipeline')
          .update({
            status: 'atrasado',
            updated_at: new Date().toISOString(),
          })
          .eq('id', card.id);
        console.log(`📋 Pipeline ${codigo}: ${card.status} → atrasado`);
      }
    } else if (celular) {
      // Criar novo card de rastreio com status atrasado
      await supabase
        .from('ai_support_pipeline')
        .insert({
          category: 'rastreio',
          status: 'atrasado',
          subject: `Rastreio ${codigo}`,
          contact_name: nomeContato,
          contact_phone: celular.replace(/\D/g, ''),
          priority: 'high',
          detected_by: 'cron-aviso-atraso',
          description: `Objeto ${codigo} com entrega atrasada`,
        });
      console.log(`📋 Pipeline ${codigo}: novo card criado como atrasado`);
    }
  } catch (err) {
    console.warn(`⚠️ Erro ao atualizar pipeline para ${emissao.codigoObjeto}:`, err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CRON-ATRASO] Iniciando verificação de avisos de atraso...');

    const token = await loginAdmin();
    console.log('[CRON-ATRASO] Login admin OK');

    // Buscar emissões em trânsito
    const emissoesEmTransito = await fetchEmissoesEmTransito(token);
    console.log(`[CRON-ATRASO] ${emissoesEmTransito.length} emissões em trânsito`);

    // Deduplicação: buscar códigos já notificados nos últimos 30 dias
    const jaNotificados = await buscarJaNotificados();

    // Filtrar emissões com código de rastreio e que não foram notificadas
    const emissoesComCodigo = emissoesEmTransito.filter(e => e.codigoObjeto && !jaNotificados.has(e.codigoObjeto));
    console.log(`[CRON-ATRASO] ${emissoesComCodigo.length} emissões para verificar (${jaNotificados.size} já notificadas)`);

    let enviados = 0;
    let pipelineAtualizados = 0;
    let falhas = 0;

    // Processar em lotes de 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < emissoesComCodigo.length; i += BATCH_SIZE) {
      const batch = emissoesComCodigo.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (emissao) => {
          // Consultar rastreio para obter previsão real
          const rastreio = await fetchRastreio(token, emissao.codigoObjeto);
          const dataPrevisao = rastreio?.data?.dataPrevisaoEntrega || emissao.dataPrevisaoEntrega;

          if (!dataPrevisao || !isAtrasado(dataPrevisao)) {
            return { sent: false, pipeline: false };
          }

          const previsaoFormatada = formatDateBR(dataPrevisao);

          // Enviar notificação
          const sent = await enviarNotificacaoAtraso(emissao, previsaoFormatada);

          // Atualizar pipeline (independente de ter enviado mensagem)
          await atualizarPipeline(emissao);

          return { sent, pipeline: true };
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.sent) enviados++;
          if (r.value.pipeline) pipelineAtualizados++;
          if (!r.value.sent && r.value.pipeline) falhas++;
        }
      }

      // Delay entre lotes
      if (i + BATCH_SIZE < emissoesComCodigo.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`[CRON-ATRASO] ✅ Concluído: ${enviados} notificados, ${pipelineAtualizados} pipeline, ${falhas} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verificação de avisos de atraso concluída',
        total_verificadas: emissoesComCodigo.length,
        avisos_enviados: enviados,
        pipeline_atualizados: pipelineAtualizados,
        falhas,
        ja_notificados: jaNotificados.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[CRON-ATRASO] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
