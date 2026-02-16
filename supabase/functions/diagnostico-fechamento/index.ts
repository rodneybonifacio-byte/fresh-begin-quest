// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Autenticação: usar token do header OU login admin OU FATURAMENTO_API_TOKEN
    let token = '';
    let useInternalToken = false;
    const authHeader = req.headers.get('Authorization');
    const baseApiUrl = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      // Tentar login admin
      const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
      const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');
      
      if (adminEmail && adminPassword) {
        try {
          const loginResp = await fetch(`https://envios.brhubb.com.br/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: adminPassword }),
          });
          if (loginResp.ok) {
            const loginData = await loginResp.json();
            token = loginData.token;
          }
        } catch (e) { /* fallback abaixo */ }
      }
      
      if (!token) {
        // Fallback: usar FATURAMENTO_API_TOKEN com x-internal-token
        token = Deno.env.get('FATURAMENTO_API_TOKEN') || '';
        useInternalToken = true;
      }
      
      if (!token) {
        return new Response(JSON.stringify({ error: 'Nenhum método de autenticação disponível' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const body = await req.json();
    const { codigo_fatura, fatura_id, fatura_pai_id, subfatura_id, cpf_cnpj_subcliente, valor_subfatura } = body;

    if (!codigo_fatura) {
      return new Response(JSON.stringify({ error: 'codigo_fatura é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const diagnostico: any = {
      timestamp: new Date().toISOString(),
      parametros_recebidos: { codigo_fatura, fatura_id, fatura_pai_id, subfatura_id, cpf_cnpj_subcliente, valor_subfatura },
      etapas: [],
    };

    const isSubfatura = !!subfatura_id;
    const cnpjLimpo = cpf_cnpj_subcliente?.replace(/\D/g, '') || '';
    const isCNPJ = cnpjLimpo.length === 14;

    // ETAPA 1: Buscar fatura da API
    const faturaUrl = `${baseApiUrl}/faturas/admin/${isSubfatura && fatura_pai_id ? fatura_pai_id : fatura_id}`;
    diagnostico.etapas.push({ etapa: '1-BUSCAR_FATURA', url: faturaUrl });

    const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (useInternalToken) {
      apiHeaders['x-internal-token'] = token;
    } else {
      apiHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const faturaResponse = await fetch(faturaUrl, {
      method: 'GET',
      headers: apiHeaders,
    });

    if (!faturaResponse.ok) {
      const errorText = await faturaResponse.text();
      diagnostico.etapas.push({ etapa: '1-ERRO', status: faturaResponse.status, erro: errorText });
      return new Response(JSON.stringify(diagnostico), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const faturaDataResponse = await faturaResponse.json();
    const fatura = faturaDataResponse.data;

    diagnostico.fatura_resumo = {
      id: fatura.id,
      codigo: fatura.codigo,
      totalFaturado: fatura.totalFaturado,
      totalCusto: fatura.totalCusto,
      totalObjetos: fatura.totalObjetos,
      periodoInicial: fatura.periodoInicial,
      periodoFinal: fatura.periodoFinal,
      dataVencimento: fatura.dataVencimento,
      status: fatura.status,
    };

    // Dados do cliente da fatura
    diagnostico.cliente_fatura = fatura.cliente ? {
      id: fatura.cliente.id,
      nome: fatura.cliente.nome,
      cpfCnpj: fatura.cliente.cpfCnpj,
      telefone: fatura.cliente.telefone,
      cep: fatura.cliente.cep,
      logradouro: fatura.cliente.logradouro,
      numero: fatura.cliente.numero,
      complemento: fatura.cliente.complemento,
      bairro: fatura.cliente.bairro,
      localidade: fatura.cliente.localidade,
      uf: fatura.cliente.uf,
    } : null;

    // Dados do remetente da fatura (se existir)
    diagnostico.remetente_fatura = fatura.remetente ? {
      id: fatura.remetente.id,
      nome: fatura.remetente.nome,
      cpfCnpj: fatura.remetente.cpfCnpj,
      telefone: fatura.remetente.telefone,
      cep: fatura.remetente.cep,
      logradouro: fatura.remetente.logradouro,
      numero: fatura.remetente.numero,
      bairro: fatura.remetente.bairro,
      localidade: fatura.remetente.localidade,
      uf: fatura.remetente.uf,
    } : null;

    // ETAPA 2: Se subfatura, buscar dados específicos
    if (isSubfatura) {
      diagnostico.tipo = 'SUBFATURA';

      // Buscar subfatura dentro da fatura pai
      const subfaturasArray = fatura.faturas || fatura.subFaturas || fatura.subclientes || [];
      diagnostico.subfaturas_encontradas = subfaturasArray.length;
      
      // Listar todas as subfaturas disponíveis
      diagnostico.lista_subfaturas = subfaturasArray.map((sf: any) => ({
        id: sf.id,
        nome: sf.nome,
        cpfCnpj: sf.cpfCnpj,
        totalFaturado: sf.totalFaturado || sf.valor,
        totalObjetos: sf.totalObjetos,
        cep: sf.cep,
        logradouro: sf.logradouro,
        numero: sf.numero,
        bairro: sf.bairro,
        localidade: sf.localidade || sf.cidade,
        uf: sf.uf || sf.estado,
        telefone: sf.telefone,
      }));

      const subfaturaEncontrada = subfaturasArray.find((f: any) => f.id === subfatura_id);
      
      if (subfaturaEncontrada) {
        diagnostico.subfatura_selecionada = {
          id: subfaturaEncontrada.id,
          nome: subfaturaEncontrada.nome,
          cpfCnpj: subfaturaEncontrada.cpfCnpj,
          totalFaturado: subfaturaEncontrada.totalFaturado || subfaturaEncontrada.valor,
          cep: subfaturaEncontrada.cep,
          logradouro: subfaturaEncontrada.logradouro,
          numero: subfaturaEncontrada.numero,
          bairro: subfaturaEncontrada.bairro,
          localidade: subfaturaEncontrada.localidade || subfaturaEncontrada.cidade,
          uf: subfaturaEncontrada.uf || subfaturaEncontrada.estado,
          telefone: subfaturaEncontrada.telefone,
          campos_disponiveis: Object.keys(subfaturaEncontrada),
        };
      } else {
        diagnostico.subfatura_selecionada = null;
        diagnostico.erro_subfatura = `Subfatura ${subfatura_id} não encontrada entre ${subfaturasArray.length} subfaturas`;
      }

      // ETAPA 3: BrasilAPI (se CNPJ)
      let remetenteData = null;

      if (subfaturaEncontrada?.cep) {
        remetenteData = {
          fonte: 'SUBFATURA_DIRETA',
          nome: subfaturaEncontrada.nome,
          cpfCnpj: subfaturaEncontrada.cpfCnpj || cpf_cnpj_subcliente,
          cep: subfaturaEncontrada.cep,
          logradouro: subfaturaEncontrada.logradouro,
          numero: subfaturaEncontrada.numero,
          bairro: subfaturaEncontrada.bairro,
          localidade: subfaturaEncontrada.localidade || subfaturaEncontrada.cidade,
          uf: subfaturaEncontrada.uf || subfaturaEncontrada.estado,
          telefone: subfaturaEncontrada.telefone,
        };
      }

      if (!remetenteData && isCNPJ) {
        try {
          const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
          if (brasilApiResponse.ok) {
            const cnpjData = await brasilApiResponse.json();
            remetenteData = {
              fonte: 'BRASIL_API',
              nome: cnpjData.razao_social || cnpjData.nome_fantasia,
              cpfCnpj: cnpjLimpo,
              telefone: cnpjData.ddd_telefone_1 ? `${cnpjData.ddd_telefone_1}`.replace(/\D/g, '') : null,
              cep: cnpjData.cep?.replace(/\D/g, ''),
              logradouro: cnpjData.logradouro,
              numero: cnpjData.numero || 'S/N',
              complemento: cnpjData.complemento,
              bairro: cnpjData.bairro,
              localidade: cnpjData.municipio,
              uf: cnpjData.uf,
            };
            diagnostico.brasil_api_raw = cnpjData;
          } else {
            diagnostico.brasil_api_erro = `Status ${brasilApiResponse.status}`;
          }
        } catch (e) {
          diagnostico.brasil_api_erro = e.message;
        }
      }

      if (!remetenteData && fatura.remetente) {
        remetenteData = {
          fonte: 'REMETENTE_FATURA',
          ...fatura.remetente,
        };
      }

      diagnostico.dados_pagador_final = remetenteData;

      // Validação dos dados que seriam usados no boleto
      const pagador = remetenteData || {};
      diagnostico.validacao_boleto = {
        nome: { valor: pagador.nome, ok: !!pagador.nome },
        cpfCnpj: { valor: pagador.cpfCnpj, ok: !!pagador.cpfCnpj },
        cep: { valor: pagador.cep, ok: !!pagador.cep },
        logradouro: { valor: pagador.logradouro, ok: !!pagador.logradouro },
        numero: { valor: pagador.numero, ok: !!pagador.numero },
        bairro: { valor: pagador.bairro, ok: !!pagador.bairro },
        localidade: { valor: pagador.localidade, ok: !!pagador.localidade },
        uf: { valor: pagador.uf, ok: !!pagador.uf },
        telefone: { valor: pagador.telefone, ok: !!pagador.telefone },
      };

      const camposFaltando = Object.entries(diagnostico.validacao_boleto)
        .filter(([_, v]: any) => !v.ok)
        .map(([k]) => k);
      
      diagnostico.campos_faltando = camposFaltando;
      diagnostico.boleto_pode_ser_gerado = camposFaltando.length === 0;

      // Valor que seria usado
      const valorSubf = valor_subfatura ? parseFloat(valor_subfatura) : null;
      const valorDaSubfatura = subfaturaEncontrada 
        ? parseFloat(subfaturaEncontrada.totalFaturado || subfaturaEncontrada.valor || '0') 
        : 0;
      
      diagnostico.valor_boleto = {
        valor_parametro: valorSubf,
        valor_subfatura_api: valorDaSubfatura,
        valor_fatura_pai: parseFloat(fatura.totalFaturado || '0'),
        valor_final: valorSubf && valorSubf > 0 ? valorSubf : (valorDaSubfatura > 0 ? valorDaSubfatura : parseFloat(fatura.totalFaturado || '0')),
      };

      // Payload exato que seria enviado ao banco-inter-create-boleto
      diagnostico.payload_boleto_simulado = {
        faturaId: fatura.id,
        codigoFatura: codigo_fatura,
        valorCobrado: diagnostico.valor_boleto.valor_final,
        pagadorNome: pagador.nome || 'N/A',
        pagadorCpfCnpj: pagador.cpfCnpj || cnpjLimpo,
        pagadorEndereco: {
          logradouro: pagador.logradouro || 'N/A',
          numero: pagador.numero || 'S/N',
          complemento: pagador.complemento || '',
          bairro: pagador.bairro || 'N/A',
          cidade: pagador.localidade || 'N/A',
          uf: pagador.uf || 'N/A',
          cep: pagador.cep || 'N/A',
        },
        multa: { tipo: 'PERCENTUAL', valor: 10 },
        juros: { tipo: 'PERCENTUAL_DIA', valor: 0.033 },
      };

    } else {
      diagnostico.tipo = 'FATURA_NORMAL';
      
      const clienteData = fatura.cliente;
      diagnostico.dados_pagador_final = {
        fonte: 'CLIENTE_FATURA',
        nome: clienteData?.nome,
        cpfCnpj: clienteData?.cpfCnpj,
        telefone: clienteData?.telefone,
        cep: clienteData?.cep,
        logradouro: clienteData?.logradouro,
        numero: clienteData?.numero,
        bairro: clienteData?.bairro,
        localidade: clienteData?.localidade,
        uf: clienteData?.uf,
      };

      diagnostico.validacao_boleto = {
        nome: { valor: clienteData?.nome, ok: !!clienteData?.nome },
        cpfCnpj: { valor: clienteData?.cpfCnpj, ok: !!clienteData?.cpfCnpj },
        cep: { valor: clienteData?.cep, ok: !!clienteData?.cep },
        logradouro: { valor: clienteData?.logradouro, ok: !!clienteData?.logradouro },
        numero: { valor: clienteData?.numero, ok: !!clienteData?.numero },
        bairro: { valor: clienteData?.bairro, ok: !!clienteData?.bairro },
        localidade: { valor: clienteData?.localidade, ok: !!clienteData?.localidade },
        uf: { valor: clienteData?.uf, ok: !!clienteData?.uf },
      };

      const camposFaltando = Object.entries(diagnostico.validacao_boleto)
        .filter(([_, v]: any) => !v.ok)
        .map(([k]) => k);
      
      diagnostico.campos_faltando = camposFaltando;
      diagnostico.boleto_pode_ser_gerado = camposFaltando.length === 0;

      diagnostico.valor_boleto = {
        valor_final: parseFloat(fatura.totalFaturado || '0'),
      };

      diagnostico.payload_boleto_simulado = {
        faturaId: fatura.id,
        codigoFatura: codigo_fatura,
        valorCobrado: diagnostico.valor_boleto.valor_final,
        pagadorNome: clienteData?.nome || 'N/A',
        pagadorCpfCnpj: clienteData?.cpfCnpj || 'N/A',
        pagadorEndereco: {
          logradouro: clienteData?.logradouro || 'N/A',
          numero: clienteData?.numero || 'S/N',
          complemento: clienteData?.complemento || '',
          bairro: clienteData?.bairro || 'N/A',
          cidade: clienteData?.localidade || 'N/A',
          uf: clienteData?.uf || 'N/A',
          cep: clienteData?.cep || 'N/A',
        },
        multa: { tipo: 'PERCENTUAL', valor: 10 },
        juros: { tipo: 'PERCENTUAL_DIA', valor: 0.033 },
      };
    }

    // Detalhes da fatura (itens)
    diagnostico.total_itens_detalhe = fatura.detalhe?.length || 0;
    diagnostico.amostra_detalhe = (fatura.detalhe || []).slice(0, 5).map((d: any) => ({
      id: d.id,
      nome: d.nome,
      codigoObjeto: d.codigoObjeto,
      valor: d.valor,
      status: d.status,
    }));

    return new Response(JSON.stringify(diagnostico, null, 2), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
