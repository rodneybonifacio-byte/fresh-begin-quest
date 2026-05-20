// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-brhub-authorization',
}

// 🔒 Função para validar acesso - aceita service_role ou admin JWT
async function validateAdminAccess(req: Request): Promise<{ isAdmin: boolean; token?: string; error?: string }> {
  const brhubAuthHeader = req.headers.get('x-brhub-authorization');
  const authHeader = brhubAuthHeader || req.headers.get('authorization');
  
  if (!authHeader) {
    return { isAdmin: false, error: 'Token de autorização não fornecido' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Check if it's service_role key (starts with eyJ and has specific structure)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && token === serviceRoleKey) {
    console.log('✅ Acesso via service_role key');
    return { isAdmin: true, token };
  }
  
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    console.log('🔐 Validando acesso admin...', { role: payload.role, email: payload.email });
    
    // Check if it's Supabase service_role
    if (payload.role === 'service_role') {
      console.log('✅ Acesso via Supabase service_role');
      return { isAdmin: true, token };
    }
    
    const isAdminRole = payload.role === 'admin' || 
                        payload.role === 'ADMIN' ||
                        payload.isAdmin === true;
    
    if (isAdminRole) {
      console.log('✅ Usuário é admin');
      return { isAdmin: true, token };
    }
    
    const permissoes = payload.permissoes || [];
    const hasAdminPermission = permissoes.some((p: string) => 
      p === 'ADMIN' || p === 'admin' || p.toLowerCase().includes('admin')
    );
    
    if (hasAdminPermission) {
      console.log('✅ Usuário é admin (via permissoes)');
      return { isAdmin: true, token };
    }
    
    console.log('❌ Usuário não é admin');
    return { isAdmin: false, error: 'Acesso negado: permissão de administrador necessária' };
    
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return { isAdmin: false, error: 'Token inválido' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 🔒 Validar acesso admin
    const { isAdmin, token, error: authError } = await validateAdminAccess(req);
    
    if (!isAdmin) {
      console.error('🚫 Acesso negado:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError || 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { remetenteNome, data, dryRun = true } = body;

    console.log('📋 Parâmetros:', { remetenteNome, data, dryRun });

    const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL');
    const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD');

    // Login admin (cache)
    console.log('🔐 Obtendo token admin (cache)...');
    const adminToken = await getAdminTokenCached();


    // Buscar etiquetas do OPERA KIDS na data especificada (ou hoje)
    const dataFiltro = data || new Date().toISOString().split('T')[0];
    const remetente = remetenteNome || 'OPERA KIDS';
    
    console.log(`📦 Buscando etiquetas de "${remetente}" do dia ${dataFiltro}...`);

    // Buscar emissões com paginação real da API (ela limita a 100 por página)
    let emissoesBrutas: any[] = [];
    let offset = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const searchParams = new URLSearchParams({
        dataInicio: dataFiltro,
        dataFim: dataFiltro,
        limit: String(pageSize),
        offset: String(offset),
      });

      const emissaoResponse = await fetch(`${BASE_API_URL}/emissoes/admin?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!emissaoResponse.ok) {
        const errorText = await emissaoResponse.text();
        throw new Error(`Erro ao buscar emissões: ${errorText}`);
      }

      const emissaoData = await emissaoResponse.json();
      const pageData = emissaoData?.data || emissaoData || [];
      emissoesBrutas = emissoesBrutas.concat(pageData);

      console.log(`📄 Página offset=${offset}: ${pageData.length} registros`);

      if (pageData.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }
    
    console.log(`📊 Total de etiquetas brutas da API: ${emissoesBrutas.length}`);

    // Filtrar por remetenteNome com correspondência exata normalizada
    const normalizar = (str: string) => str
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toUpperCase()
      .trim() || '';
    const remetenteNormalizado = normalizar(remetente);
    
    const emissoes = emissoesBrutas.filter((e: any) => {
      const nomeRemetente = normalizar(e.remetenteNome || e.remetente?.nome || '');
      const dataEmissaoRaw = e.criadoEm || e.createdAt || e.created_at || e.dataEmissao || e.data;
      const dataEmissao = dataEmissaoRaw ? new Date(dataEmissaoRaw).toISOString().split('T')[0] : null;

      return nomeRemetente === remetenteNormalizado && dataEmissao === dataFiltro;
    });
    
    console.log(`📊 Após filtro por "${remetente}" na data ${dataFiltro}: ${emissoes.length} etiquetas`);

    if (emissoes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma etiqueta encontrada com os filtros especificados',
          filtros: { remetente, data: dataFiltro },
          debug: { totalBruto: emissoesBrutas.length }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular novos valores e preparar prévia
    const preview: any[] = [];
    const updates: any[] = [];

    for (const emissao of emissoes) {
      const valorVenda = parseFloat(emissao.valor || emissao.valorVenda || '0');
      const valorCustoAtual = parseFloat(emissao.valorPostagem || emissao.valorCusto || '0');
      
      // Fórmula: Custo = Venda * 0.78 (Venda - 22%)
      const novoCusto = valorVenda * 0.78;
      
      preview.push({
        id: emissao.id,
        codigoObjeto: emissao.codigoObjeto,
        remetenteNome: emissao.remetenteNome,
        valorVenda: valorVenda.toFixed(2),
        custoAtual: valorCustoAtual.toFixed(2),
        novoCusto: novoCusto.toFixed(2),
        diferenca: (valorCustoAtual - novoCusto).toFixed(2),
      });

      updates.push({
        emissaoId: emissao.id,
        novoCusto: novoCusto.toFixed(2),
      });
    }

    // Se for dry run, apenas retornar preview
    if (dryRun) {
      const totalVenda = preview.reduce((sum, p) => sum + parseFloat(p.valorVenda), 0);
      const totalCustoAtual = preview.reduce((sum, p) => sum + parseFloat(p.custoAtual), 0);
      const totalNovoCusto = preview.reduce((sum, p) => sum + parseFloat(p.novoCusto), 0);

      return new Response(
        JSON.stringify({ 
          success: true, 
          dryRun: true,
          message: `Preview: ${preview.length} etiquetas serão atualizadas`,
          resumo: {
            totalEtiquetas: preview.length,
            totalVenda: totalVenda.toFixed(2),
            totalCustoAtual: totalCustoAtual.toFixed(2),
            totalNovoCusto: totalNovoCusto.toFixed(2),
            diferencaTotal: (totalCustoAtual - totalNovoCusto).toFixed(2),
          },
          preview: preview.slice(0, 20), // Limitar preview a 20 itens
          totalPreview: preview.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Executar atualizações
    console.log('🔄 Executando atualizações...');
    const resultados: any[] = [];
    const erros: any[] = [];

    for (const update of updates) {
      try {
        const updateResponse = await fetch(`${BASE_API_URL}/emissoes/${update.emissaoId}/atualizar-precos`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            emissaoId: update.emissaoId,
            tipoAtualizacao: 'VALOR_CUSTO',
            valor: update.novoCusto,
          }),
        });

        if (updateResponse.ok) {
          resultados.push({ id: update.emissaoId, novoCusto: update.novoCusto });
          console.log(`✅ Atualizada: ${update.emissaoId} → R$ ${update.novoCusto}`);
        } else {
          const errorText = await updateResponse.text();
          erros.push({ id: update.emissaoId, error: errorText });
          console.error(`❌ Erro ao atualizar ${update.emissaoId}: ${errorText}`);
        }
      } catch (err) {
        erros.push({ id: update.emissaoId, error: err.message });
        console.error(`❌ Exceção ao atualizar ${update.emissaoId}:`, err);
      }
    }

    const totalVenda = preview.reduce((sum, p) => sum + parseFloat(p.valorVenda), 0);
    const totalCustoAtual = preview.reduce((sum, p) => sum + parseFloat(p.custoAtual), 0);
    const totalNovoCusto = preview.reduce((sum, p) => sum + parseFloat(p.novoCusto), 0);

    return new Response(
      JSON.stringify({ 
        success: true,
        dryRun: false,
        message: `${resultados.length} etiquetas atualizadas com sucesso${erros.length > 0 ? `, ${erros.length} com erro` : ''}`,
        resumo: {
          atualizadas: resultados.length,
          erros: erros.length,
          totalVenda: totalVenda.toFixed(2),
          totalCustoAnterior: totalCustoAtual.toFixed(2),
          totalNovoCusto: totalNovoCusto.toFixed(2),
          economia: (totalCustoAtual - totalNovoCusto).toFixed(2),
        },
        errosDetalhes: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error?.message || error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
