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

interface ManifestoRequest {
  // Opção 1: Buscar por CPF/CNPJ do remetente
  cpfCnpj?: string;
  // Opção 2: Buscar por ID do remetente
  remetenteId?: string;
  // Opção 3: Buscar por nome do remetente (busca parcial)
  nomeRemetente?: string;
  // Lista de códigos de objeto específicos (opcional - se não informado, pega todos com status POSTADO)
  codigosObjeto?: string[];
  // Se true, seleciona automaticamente todas as postagens disponíveis
  selecionarTodos?: boolean;
}

interface ManifestoResponse {
  success: boolean;
  message: string;
  data?: {
    manifestoId?: string;
    pdfBase64?: string;
    remetente?: {
      id: string;
      nome: string;
      cpfCnpj: string;
    };
    postagensIncluidas: number;
    codigosObjeto: string[];
  };
  error?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 API Gerar Manifesto - Iniciando...');

    // Verificar autenticação via token MCP ou API key
    const authHeader = req.headers.get('authorization');
    const mcpToken = Deno.env.get('MCP_AUTH_TOKEN');
    
    // Verificar se há autorização válida
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token de autorização não fornecido',
          message: 'Inclua o header Authorization: Bearer <token>'
        } as ManifestoResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (mcpToken && token !== mcpToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token inválido',
          message: 'O token de autorização fornecido não é válido'
        } as ManifestoResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: ManifestoRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Corpo da requisição inválido',
          message: 'Envie um JSON válido com cpfCnpj, remetenteId ou nomeRemetente'
        } as ManifestoResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Parâmetros recebidos:', JSON.stringify(body));

    const { cpfCnpj, remetenteId, nomeRemetente, codigosObjeto, selecionarTodos } = body;

    // Validar parâmetros
    if (!cpfCnpj && !remetenteId && !nomeRemetente) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Parâmetro obrigatório não fornecido',
          message: 'Informe cpfCnpj, remetenteId ou nomeRemetente para identificar o remetente'
        } as ManifestoResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar o remetente
    console.log('🔍 Buscando remetente...');
    let query = supabaseAdmin.from('remetentes').select('id, nome, cpf_cnpj, cliente_id');

    if (remetenteId) {
      query = query.eq('id', remetenteId);
    } else if (cpfCnpj) {
      // Limpar CPF/CNPJ para comparação
      const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');
      query = query.or(`cpf_cnpj.eq.${cpfCnpjLimpo},cpf_cnpj.eq.${cpfCnpj}`);
    } else if (nomeRemetente) {
      query = query.ilike('nome', `%${nomeRemetente}%`);
    }

    const { data: remetentes, error: remetenteError } = await query.limit(1);

    if (remetenteError) {
      console.error('❌ Erro ao buscar remetente:', remetenteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar remetente',
          message: remetenteError.message
        } as ManifestoResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!remetentes || remetentes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Remetente não encontrado',
          message: `Nenhum remetente encontrado com os parâmetros: ${JSON.stringify({ cpfCnpj, remetenteId, nomeRemetente })}`
        } as ManifestoResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const remetente = remetentes[0];
    console.log('✅ Remetente encontrado:', remetente.nome);

    // 2. Buscar emissões com status POSTADO
    console.log('🔍 Buscando emissões com status POSTADO...');
    
    // Chamar a API externa para buscar emissões
    const BASE_API_URL = Deno.env.get('BASE_API_URL');
    const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL');
    const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD');

    if (!BASE_API_URL || !API_ADMIN_EMAIL || !API_ADMIN_PASSWORD) {
      console.error('❌ Variáveis de ambiente da API não configuradas');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração incompleta',
          message: 'As variáveis BASE_API_URL, API_ADMIN_EMAIL e API_ADMIN_PASSWORD precisam estar configuradas'
        } as ManifestoResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer login para obter token
    console.log('🔐 Autenticando na API externa...');
    const loginResponse = await fetch(`${BASE_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: API_ADMIN_EMAIL, password: API_ADMIN_PASSWORD })
    });

    if (!loginResponse.ok) {
      console.error('❌ Falha no login da API externa');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha na autenticação',
          message: 'Não foi possível autenticar na API de emissões'
        } as ManifestoResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loginData = await loginResponse.json();
    const apiToken = loginData.token || loginData.accessToken;
    console.log('✅ Autenticado na API externa');

    // Buscar emissões do remetente
    const emissaoUrl = new URL(`${BASE_API_URL}/emissao`);
    emissaoUrl.searchParams.set('remetenteId', remetente.id);
    emissaoUrl.searchParams.set('status', 'POSTADO');
    emissaoUrl.searchParams.set('limit', '200');

    console.log('📡 Buscando emissões:', emissaoUrl.toString());
    const emissaoResponse = await fetch(emissaoUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!emissaoResponse.ok) {
      const errorText = await emissaoResponse.text();
      console.error('❌ Erro ao buscar emissões:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar emissões',
          message: 'Não foi possível obter as emissões do remetente'
        } as ManifestoResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emissaoData = await emissaoResponse.json();
    let emissoes = emissaoData.data || emissaoData || [];
    console.log(`📋 ${emissoes.length} emissões encontradas com status POSTADO`);

    if (emissoes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhuma emissão disponível',
          message: `O remetente "${remetente.nome}" não possui emissões com status POSTADO para gerar manifesto`,
          data: {
            remetente: {
              id: remetente.id,
              nome: remetente.nome,
              cpfCnpj: remetente.cpf_cnpj
            },
            postagensIncluidas: 0,
            codigosObjeto: []
          }
        } as ManifestoResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Filtrar por códigos específicos se informados
    if (codigosObjeto && codigosObjeto.length > 0 && !selecionarTodos) {
      emissoes = emissoes.filter((e: any) => codigosObjeto.includes(e.codigoObjeto));
      console.log(`📋 ${emissoes.length} emissões após filtro por códigos específicos`);
      
      if (emissoes.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Códigos não encontrados',
            message: `Nenhum dos códigos informados foi encontrado com status POSTADO: ${codigosObjeto.join(', ')}`
          } as ManifestoResponse),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Preparar dados para o manifesto
    const emissoesParaManifesto = emissoes.map((e: any) => ({
      id: e.id,
      codigoObjeto: e.codigoObjeto,
      remetenteNome: e.remetenteNome || remetente.nome,
      destinatarioNome: e.destinatario?.nome || e.destinatarioNome || '',
      status: e.status,
      criadoEm: e.criadoEm
    }));

    console.log('📤 Enviando para API de manifesto...');

    // 5. Chamar API de manifesto
    const manifestoResponse = await fetch(`${BASE_API_URL}/manifestos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emissoesParaManifesto)
    });

    if (!manifestoResponse.ok) {
      const errorText = await manifestoResponse.text();
      console.error('❌ Erro ao gerar manifesto:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao gerar manifesto',
          message: 'Falha na geração do manifesto na API'
        } as ManifestoResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const manifestoData = await manifestoResponse.json();
    console.log('✅ Manifesto gerado com sucesso!');

    const codigosIncluidos = emissoes.map((e: any) => e.codigoObjeto);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Manifesto gerado com sucesso para ${remetente.nome}`,
        data: {
          manifestoId: manifestoData.manifestoId,
          pdfBase64: manifestoData.dados,
          remetente: {
            id: remetente.id,
            nome: remetente.nome,
            cpfCnpj: remetente.cpf_cnpj
          },
          postagensIncluidas: emissoes.length,
          codigosObjeto: codigosIncluidos
        }
      } as ManifestoResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na edge function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno',
        message: error instanceof Error ? error.message : 'Erro desconhecido ao processar requisição'
      } as ManifestoResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
