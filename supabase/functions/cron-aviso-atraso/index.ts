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
 * Resolve o nome real do remetente, evitando genéricos.
 * Hierarquia: remetenteNome → remetente.nome → remetenteId → cpf_cnpj → "Loja"
 */
async function resolverNomeRemetente(emissao: EmissaoEmTransito): Promise<string> {
  const genericos = ['remetente', 'loja', ''];
  const isGenerico = (n: string) => {
    const l = (n || '').trim().toLowerCase();
    return genericos.includes(l) || l.length < 2;
  };
  const capitalize = (n: string) => {
    const first = n.trim().split(/\s+/)[0] || n.trim();
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  };

  // 1. Nome direto
  const nomeDireto = (emissao.remetenteNome || '').trim();
  if (!isGenerico(nomeDireto)) return capitalize(nomeDireto);

  // 2. Objeto aninhado remetente (se existir no payload da API)
  const nomeObjeto = ((emissao as any).remetente?.nome || '').trim();
  if (!isGenerico(nomeObjeto)) return capitalize(nomeObjeto);

  // 3. Buscar via remetenteId
  const remetenteId = emissao.remetenteId || (emissao as any).remetente_id;
  if (remetenteId) {
    try {
      const { data: rem } = await supabase
        .from('remetentes')
        .select('nome')
        .eq('id', remetenteId)
        .maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) {
        console.log(`🔍 Remetente resolvido via ID: "${rem.nome}"`);
        return capitalize(rem.nome);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao resolver remetente por ID:', err);
    }
  }

  // 4. Buscar via CPF/CNPJ
  const cpfCnpj = (emissao as any).remetenteCpfCnpj || (emissao as any).remetente?.cpfCnpj || '';
  if (cpfCnpj) {
    try {
      const { data: rem } = await supabase
        .from('remetentes')
        .select('nome')
        .eq('cpf_cnpj', cpfCnpj.replace(/\D/g, ''))
        .limit(1)
        .maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) {
        console.log(`🔍 Remetente resolvido via CPF/CNPJ: "${rem.nome}"`);
        return capitalize(rem.nome);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao resolver remetente por CPF/CNPJ:', err);
    }
  }

  // 5. Nome do cliente
  const nomeCliente = ((emissao as any).cliente?.nome || '').trim();
  if (!isGenerico(nomeCliente)) {
    console.log(`🔍 Usando nome do cliente: "${nomeCliente}"`);
    return capitalize(nomeCliente);
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
    const nomeRemetente = await resolverNomeRemetente(emissao);
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
