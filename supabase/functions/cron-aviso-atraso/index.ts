// @ts-nocheck
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/181d8bbe-a92e-43f1-9660-b2e3acf2632b';

// Inicializar Supabase para resolver nomes de remetentes
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Resolve o nome real do remetente, evitando o genérico "Remetente".
 * Tenta buscar na tabela remetentes pelo remetenteId se o nome vier genérico.
 */
async function resolverNomeRemetente(remetenteNome: string, remetenteId?: string): Promise<string> {
  const nomeLimpo = (remetenteNome || '').trim();
  const genericos = ['remetente', 'loja', ''];
  
  if (!genericos.includes(nomeLimpo.toLowerCase()) && nomeLimpo.length > 2) {
    // Nome já é válido, capitalizar primeiro nome
    const first = nomeLimpo.split(/\s+/)[0] || nomeLimpo;
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  
  // Tentar resolver pelo ID na tabela remetentes
  if (remetenteId) {
    try {
      const { data: rem } = await supabase
        .from('remetentes')
        .select('nome')
        .eq('id', remetenteId)
        .maybeSingle();
      
      if (rem?.nome && rem.nome.trim().length > 2) {
        const first = rem.nome.trim().split(/\s+/)[0];
        console.log(`🔍 Nome remetente resolvido via DB: "${rem.nome}" → "${first}"`);
        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
      }
    } catch (err) {
      console.warn('⚠️ Erro ao resolver nome remetente via DB:', err);
    }
  }
  
  return 'Loja';
}

interface EmissaoEmTransito {
  codigoObjeto: string;
  remetenteNome: string;
  remetenteId?: string;
  destinatario: {
    nome: string;
    celular: string;
  };
  dataPrevisaoEntrega: string;
}

async function loginAdmin(): Promise<string> {
  const email = Deno.env.get('API_ADMIN_EMAIL');
  const password = Deno.env.get('API_ADMIN_PASSWORD');

  if (!email || !password) {
    throw new Error('Credenciais de admin não configuradas');
  }

  const response = await fetch('https://envios.brhubb.com.br/api/auth/login', {
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

async function fetchEmissoesEmTransito(token: string): Promise<EmissaoEmTransito[]> {
  const response = await fetch('https://envios.brhubb.com.br/api/emissoes?status=EM_TRANSITO&limit=1000', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Falha ao buscar emissões em trânsito');
  }

  const data = await response.json();
  return data.data || [];
}

function isToday(dateString: string): boolean {
  if (!dateString) return false;
  
  try {
    const hoje = new Date();
    const dataPrevisao = new Date(dateString);
    
    return (
      hoje.getFullYear() === dataPrevisao.getFullYear() &&
      hoje.getMonth() === dataPrevisao.getMonth() &&
      hoje.getDate() === dataPrevisao.getDate()
    );
  } catch {
    return false;
  }
}

async function enviarWebhookAviso(emissao: EmissaoEmTransito): Promise<boolean> {
  try {
    const nomeRemetente = await resolverNomeRemetente(emissao.remetenteNome || '', emissao.remetenteId);
    const payload = {
      telefone_destinatario: emissao.destinatario?.celular || '',
      nome_destinatario: emissao.destinatario?.nome || '',
      nome_remetente: nomeRemetente,
      codigo_objeto: emissao.codigoObjeto || '',
      data_prevista: emissao.dataPrevisaoEntrega || '',
    };

    console.log(`Enviando webhook para ${emissao.codigoObjeto}:`, payload);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Falha ao enviar webhook para ${emissao.codigoObjeto}: ${response.status}`);
      return false;
    }

    console.log(`Webhook enviado com sucesso para ${emissao.codigoObjeto}`);
    return true;
  } catch (error) {
    console.error(`Erro ao enviar webhook para ${emissao.codigoObjeto}:`, error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando verificação de avisos de atraso...');

    // Login admin
    const token = await loginAdmin();
    console.log('Login admin realizado com sucesso');

    // Buscar emissões em trânsito
    const emissoesEmTransito = await fetchEmissoesEmTransito(token);
    console.log(`Total de emissões em trânsito: ${emissoesEmTransito.length}`);

    // Filtrar emissões com data prevista = hoje
    const emissoesParaAvisar = emissoesEmTransito.filter(emissao => 
      isToday(emissao.dataPrevisaoEntrega)
    );
    console.log(`Emissões com data prevista hoje: ${emissoesParaAvisar.length}`);

    // Enviar webhooks
    let enviados = 0;
    let falhas = 0;

    for (const emissao of emissoesParaAvisar) {
      const sucesso = await enviarWebhookAviso(emissao);
      if (sucesso) {
        enviados++;
      } else {
        falhas++;
      }
      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Avisos enviados: ${enviados}, Falhas: ${falhas}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verificação de avisos de atraso concluída',
        total_verificadas: emissoesEmTransito.length,
        avisos_enviados: enviados,
        falhas: falhas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro no CRON de aviso de atraso:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
