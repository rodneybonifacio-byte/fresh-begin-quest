// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAdminToken(): Promise<string> {
  const baseUrl = Deno.env.get('BASE_API_URL');
  const email = Deno.env.get('API_ADMIN_EMAIL');
  const password = Deno.env.get('API_ADMIN_PASSWORD');

  console.log('🔐 Obtendo token admin...');

  if (!baseUrl || !email || !password) {
    throw new Error('Credenciais admin não configuradas');
  }

  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao autenticar: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Token admin obtido');
  return data.data?.token || data.token;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const baseUrl = Deno.env.get('BASE_API_URL');
    if (!baseUrl) {
      throw new Error('BASE_API_URL não configurada');
    }

    const { clienteId, userToken } = await req.json();

    if (!clienteId) {
      return new Response(
        JSON.stringify({ error: 'clienteId é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('🔍 Consultando serviços habilitados para cliente:', clienteId);

    // Usar token do usuário ou admin
    let token = userToken;
    if (!token) {
      token = await getAdminToken();
    }

    // 1. Buscar dados do cliente (inclui configurações de transportadora)
    const clienteResponse = await fetch(`${baseUrl}/clientes/${clienteId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let clienteData = null;
    if (clienteResponse.ok) {
      const clienteJson = await clienteResponse.json();
      clienteData = clienteJson.data || clienteJson;
      console.log('📋 Dados do cliente:', JSON.stringify(clienteData).substring(0, 500));
    } else {
      console.log('⚠️ Não foi possível buscar dados do cliente:', clienteResponse.status);
    }

    // 2. Buscar transportadoras configuradas para o cliente
    const transportadorasResponse = await fetch(`${baseUrl}/clientes/${clienteId}/transportadoras`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let transportadorasData = null;
    if (transportadorasResponse.ok) {
      const transportadorasJson = await transportadorasResponse.json();
      transportadorasData = transportadorasJson.data || transportadorasJson;
      console.log('🚚 Transportadoras do cliente:', JSON.stringify(transportadorasData).substring(0, 500));
    } else {
      console.log('⚠️ Não foi possível buscar transportadoras:', transportadorasResponse.status);
    }

    // 3. Buscar serviços disponíveis (endpoint global)
    const servicosResponse = await fetch(`${baseUrl}/servicos`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let servicosData = null;
    if (servicosResponse.ok) {
      const servicosJson = await servicosResponse.json();
      servicosData = servicosJson.data || servicosJson;
      console.log('📦 Serviços disponíveis:', JSON.stringify(servicosData).substring(0, 500));
    } else {
      console.log('⚠️ Não foi possível buscar serviços:', servicosResponse.status);
    }

    // 4. Buscar credenciais de Correios do cliente
    const credenciaisResponse = await fetch(`${baseUrl}/frete/credenciais`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let credenciaisData = null;
    if (credenciaisResponse.ok) {
      const credenciaisJson = await credenciaisResponse.json();
      credenciaisData = credenciaisJson.data || credenciaisJson;
      console.log('🔑 Credenciais Correios:', JSON.stringify(credenciaisData).substring(0, 300));
    } else {
      console.log('⚠️ Não foi possível buscar credenciais:', credenciaisResponse.status);
    }

    // 5. Verificar especificamente serviços de logística reversa
    const reversaResponse = await fetch(`${baseUrl}/frete/servicos-reversa`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let reversaData = null;
    if (reversaResponse.ok) {
      const reversaJson = await reversaResponse.json();
      reversaData = reversaJson.data || reversaJson;
      console.log('🔄 Serviços de logística reversa:', JSON.stringify(reversaData).substring(0, 500));
    } else {
      console.log('⚠️ Endpoint de serviços reversa não disponível:', reversaResponse.status);
    }

    // 6. Tentar endpoint de configurações do cliente
    const configResponse = await fetch(`${baseUrl}/clientes/${clienteId}/configuracoes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let configData = null;
    if (configResponse.ok) {
      const configJson = await configResponse.json();
      configData = configJson.data || configJson;
      console.log('⚙️ Configurações do cliente:', JSON.stringify(configData).substring(0, 500));
    } else {
      console.log('⚠️ Endpoint de configurações não disponível:', configResponse.status);
    }

    // 7. TESTE: Fazer cotação de PAC REVERSO usando token admin
    console.log('🧪 Testando cotação PAC REVERSO com token admin...');
    const adminToken = await getAdminToken();
    
    // Formato correto da API BRHUB
    const cotacaoTestePayload = {
      clienteId: clienteId,
      cepOrigem: '01310100', // CEP teste SP
      cepDestino: '20040020', // CEP teste RJ
      embalagem: {
        peso: 1000, // gramas
        altura: 10, // cm
        largura: 15, // cm
        comprimento: 20, // cm
      },
      valorDeclarado: 50,
      servicosCodigo: ['03301'], // PAC REVERSO
    };

    console.log('📦 Payload cotação PAC REVERSO:', JSON.stringify(cotacaoTestePayload));

    const cotacaoResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cotacaoTestePayload),
    });

    let cotacaoReversa = null;
    let cotacaoErro = null;
    if (cotacaoResponse.ok) {
      const cotacaoJson = await cotacaoResponse.json();
      cotacaoReversa = cotacaoJson.data || cotacaoJson;
      console.log('✅ Cotação PAC REVERSO:', JSON.stringify(cotacaoReversa).substring(0, 500));
    } else {
      const erroText = await cotacaoResponse.text();
      cotacaoErro = {
        status: cotacaoResponse.status,
        mensagem: erroText,
      };
      console.log('❌ Erro na cotação PAC REVERSO:', cotacaoResponse.status, erroText);
    }

    // 8. Testar cotação com todos os serviços para comparar
    const cotacaoTodosPayload = {
      clienteId: clienteId,
      cepOrigem: '01310100',
      cepDestino: '20040020',
      embalagem: {
        peso: 1000,
        altura: 10,
        largura: 15,
        comprimento: 20,
      },
      valorDeclarado: 50,
    };

    console.log('📦 Payload cotação todos:', JSON.stringify(cotacaoTodosPayload));

    const cotacaoTodosResponse = await fetch(`${baseUrl}/frete/cotacao`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cotacaoTodosPayload),
    });

    let cotacaoTodos = null;
    if (cotacaoTodosResponse.ok) {
      const cotacaoTodosJson = await cotacaoTodosResponse.json();
      cotacaoTodos = cotacaoTodosJson.data || cotacaoTodosJson;
      console.log('📋 Cotação todos serviços:', JSON.stringify(cotacaoTodos).substring(0, 800));
    } else {
      console.log('⚠️ Erro cotação geral:', cotacaoTodosResponse.status);
    }

    // Montar resposta consolidada
    const resultado = {
      clienteId,
      cliente: clienteData ? {
        nome: clienteData.nome,
        status: clienteData.status,
        plano: clienteData.plano,
        tipoContrato: clienteData.tipoContrato,
      } : null,
      transportadoras: transportadorasData,
      servicosGlobais: servicosData,
      credenciaisCorreios: credenciaisData ? {
        quantidade: Array.isArray(credenciaisData) ? credenciaisData.length : 1,
        ativos: Array.isArray(credenciaisData) 
          ? credenciaisData.filter((c: any) => c.status === 'ATIVO').length 
          : (credenciaisData.status === 'ATIVO' ? 1 : 0),
        detalhes: Array.isArray(credenciaisData) 
          ? credenciaisData.map((c: any) => ({
              id: c.id,
              cartaoPostagem: c.cartaoPostagem,
              status: c.status,
              tipoContrato: c.tipoContrato,
            }))
          : [{
              id: credenciaisData.id,
              cartaoPostagem: credenciaisData.cartaoPostagem,
              status: credenciaisData.status,
              tipoContrato: credenciaisData.tipoContrato,
            }],
      } : null,
      servicosReversa: reversaData,
      configuracoes: configData,
      // TESTE PAC REVERSO
      testePacReverso: {
        cotacaoSucesso: cotacaoReversa !== null,
        cotacao: cotacaoReversa,
        erro: cotacaoErro,
      },
      // Cotação com todos serviços disponíveis
      servicosDisponiveis: cotacaoTodos ? {
        quantidade: Array.isArray(cotacaoTodos) ? cotacaoTodos.length : 1,
        servicos: Array.isArray(cotacaoTodos) 
          ? cotacaoTodos.map((s: any) => ({
              codigo: s.codigoServico || s.codigo,
              nome: s.nomeServico || s.nome || s.servico,
              valor: s.valor || s.valorFrete,
              prazo: s.prazo || s.prazoEntrega,
            }))
          : cotacaoTodos,
      } : null,
      // Verificação específica de PAC REVERSO (03301)
      pacReversoHabilitado: verificarPacReverso(servicosData, transportadorasData, credenciaisData, cotacaoReversa),
    };

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro ao consultar serviços:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function verificarPacReverso(servicos: any, transportadoras: any, credenciais: any, cotacaoReversa: any): { habilitado: boolean; motivo: string } {
  // Se a cotação funcionou, está habilitado
  if (cotacaoReversa) {
    return { habilitado: true, motivo: 'Cotação PAC REVERSO realizada com sucesso' };
  }

  // Verificar se há credenciais de Correios ativas
  const temCredenciaisAtivas = credenciais && (
    (Array.isArray(credenciais) && credenciais.some((c: any) => c.status === 'ATIVO')) ||
    (!Array.isArray(credenciais) && credenciais.status === 'ATIVO')
  );

  if (!temCredenciaisAtivas) {
    return { habilitado: false, motivo: 'Sem credenciais de Correios ativas' };
  }

  // Verificar se transportadora Correios está habilitada
  const correiosHabilitado = transportadoras && (
    (Array.isArray(transportadoras) && transportadoras.some((t: any) => 
      t.transportadora?.toLowerCase() === 'correios' && t.ativo === true
    )) ||
    (!Array.isArray(transportadoras) && transportadoras.correios?.ativo === true)
  );

  if (!correiosHabilitado) {
    return { habilitado: false, motivo: 'Transportadora Correios não está habilitada' };
  }

  // Verificar se serviço 03301 está na lista de serviços
  const servicoPacReverso = servicos && (
    (Array.isArray(servicos) && servicos.some((s: any) => 
      s.codigo === '03301' || s.codigoServico === '03301'
    ))
  );

  if (servicos && !servicoPacReverso) {
    return { habilitado: false, motivo: 'Serviço PAC REVERSO (03301) não encontrado na lista de serviços' };
  }

  return { habilitado: false, motivo: 'Cotação falhou - verificar contrato Correios para logística reversa' };
}
