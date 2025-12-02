// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "npm:pdf-lib@^1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FechamentoRequest {
  codigo_fatura: string;
  nome_cliente: string;
  telefone_cliente: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔒 Validação de autenticação JWT
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Token JWT ausente ou inválido');
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          mensagem: 'Autenticação necessária. Token JWT não fornecido.' 
        }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('✅ Token JWT recebido');
    
    // Validar que o token tem estrutura JWT válida (3 partes separadas por ponto)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Token JWT com formato inválido');
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          mensagem: 'Token JWT com formato inválido.' 
        }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Decodificar payload para verificar permissões (sem validar assinatura)
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('✅ Token decodificado - Usuário:', payload.name || payload.email);
      
      // Verificar se é admin
      if (payload.role !== 'ADMIN') {
        console.error('❌ Usuário sem permissão de admin');
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            mensagem: 'Apenas administradores podem realizar fechamento de faturas.' 
          }), 
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (decodeError) {
      console.error('❌ Erro ao decodificar token:', decodeError);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          mensagem: 'Token JWT inválido.' 
        }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { codigo_fatura, nome_cliente, fatura_id, fatura_pai_id, subfatura_id } = await req.json() as FechamentoRequest & { 
      fatura_id?: string;
      fatura_pai_id?: string;
      subfatura_id?: string;
    };

    console.log('🚀 Iniciando fechamento da fatura:', codigo_fatura);
    console.log('📋 Cliente:', nome_cliente);
    console.log('🆔 Fatura ID:', fatura_id);
    console.log('👨‍👧 Fatura Pai ID:', fatura_pai_id);
    console.log('👶 Subfatura ID:', subfatura_id);
    console.log('🔄 VERSÃO DA FUNÇÃO: 2.0 - DEBUG ATIVADO');

    // ✅ ETAPA 1: Buscar dados completos da fatura via API Backend
    console.log('📊 Etapa 1: Buscando dados completos da fatura...');
    
    const baseApiUrl = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const apiToken = authHeader.replace('Bearer ', '');
    
    let fatura;
    let isSubfatura = false;
    
    // Se temos subfatura_id, buscar diretamente a subfatura
    if (subfatura_id) {
      console.log('🔍 Buscando SUBFATURA diretamente com ID:', subfatura_id);
      isSubfatura = true;
      
      const subfaturaResponse = await fetch(`${baseApiUrl}/faturas/admin/${subfatura_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!subfaturaResponse.ok) {
        const errorText = await subfaturaResponse.text();
        throw new Error(`Erro ao buscar subfatura: ${subfaturaResponse.status} - ${errorText}`);
      }

      const subfaturaDataResponse = await subfaturaResponse.json();
      fatura = subfaturaDataResponse.data;
      console.log('✅ Subfatura encontrada diretamente');
    } else {
      // Buscar fatura normal
      const idParaBuscar = fatura_id || codigo_fatura;
      console.log('🔍 Buscando fatura com ID:', idParaBuscar);
      
      const faturaResponse = await fetch(`${baseApiUrl}/faturas/admin/${idParaBuscar}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!faturaResponse.ok) {
        const errorText = await faturaResponse.text();
        throw new Error(`Erro ao buscar fatura: ${faturaResponse.status} - ${errorText}`);
      }

      const faturaDataResponse = await faturaResponse.json();
      fatura = faturaDataResponse.data;
    }

    console.log('🔍 DEBUG - Fatura obtida:', JSON.stringify(fatura, null, 2));

    if (!fatura) {
      throw new Error('Fatura não encontrada');
    }

    console.log('✅ Fatura encontrada:', {
      id: fatura.id,
      codigo: fatura.codigo,
      valor: fatura.totalFaturado,
      periodo: `${fatura.periodoInicial} - ${fatura.periodoFinal}`,
      isSubfatura: isSubfatura,
      temRemetente: !!fatura.remetente,
    });

    // ✅ ETAPA 3: Extrair cadastro completo do cliente/pagador
    // Para subfaturas: usar dados do remetente da subfatura como pagador
    // Para faturas normais: usar dados do cliente da fatura
    console.log('👤 Etapa 3: Validando dados do pagador...');
    
    let clienteData;
    
    if (isSubfatura && fatura.remetente) {
      // Subfatura: pagador é o remetente da subfatura
      console.log('📋 Usando dados do REMETENTE da subfatura como pagador');
      clienteData = fatura.remetente;
    } else if (isSubfatura && fatura.cliente) {
      // Subfatura com cliente próprio
      console.log('📋 Usando dados do CLIENTE da subfatura como pagador');
      clienteData = fatura.cliente;
    } else {
      // Fatura normal: pagador é o cliente da fatura
      console.log('📋 Usando dados do CLIENTE da fatura como pagador');
      clienteData = fatura.cliente;
    }
    
    // Log completo do objeto cliente/pagador para debug
    console.log('🔍 DEBUG - Estrutura completa do pagador:', JSON.stringify(clienteData, null, 2));
    
    // Suportar tanto camelCase quanto snake_case
    const cpfCnpj = clienteData.cpfCnpj || clienteData.cpf_cnpj;
    const telefone_cliente = clienteData.telefone || '11999999999'; // Default se não vier
    const cep = clienteData.cep;
    const logradouro = clienteData.logradouro;
    const numero = clienteData.numero;
    const complemento = clienteData.complemento || '';
    const bairro = clienteData.bairro;
    const localidade = clienteData.localidade || clienteData.cidade;
    const uf = clienteData.uf || clienteData.estado;
    
    if (!cpfCnpj) {
      console.error('❌ CPF/CNPJ não encontrado no objeto cliente');
      throw new Error('Dados do cliente incompletos: CPF/CNPJ não encontrado');
    }
    
    if (!cep || !logradouro || !numero || !bairro || !localidade || !uf) {
      console.error('❌ Dados de endereço incompletos:', {
        cep: !!cep,
        logradouro: !!logradouro,
        numero: !!numero,
        bairro: !!bairro,
        localidade: !!localidade,
        uf: !!uf
      });
      throw new Error('Dados de endereço do cliente incompletos');
    }

    console.log('✅ Dados do cliente validados:', {
      nome: clienteData.nome,
      documento: cpfCnpj,
      telefone: telefone_cliente,
      endereco_completo: `${logradouro}, ${numero} - ${bairro}, ${localidade}/${uf}`
    });

    // ✅ ETAPA 2: Gerar PDF da Fatura via API
    console.log('📄 Etapa 2: Gerando PDF da fatura...');
    
    const pdfFaturaResponse = await fetch(`${baseApiUrl}/faturas/imprimir/${fatura.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!pdfFaturaResponse.ok) {
      throw new Error(`Erro ao gerar PDF da fatura: ${pdfFaturaResponse.status}`);
    }

    const pdfFaturaData = await pdfFaturaResponse.json();
    const faturaPdfBase64 = pdfFaturaData.dados;

    console.log('✅ PDF da fatura gerado');

    // ✅ ETAPA 4: Emitir boleto via Banco Inter
    console.log('💰 Etapa 4: Emitindo boleto...');
    console.log('💰 Valor do boleto:', fatura.totalFaturado);
    
    const valorBoleto = parseFloat(fatura.totalFaturado);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('📤 Enviando requisição para banco-inter-create-boleto...');
    console.log('📋 Dados do pagador:', {
      nome: clienteData.nome,
      cpfCnpj: cpfCnpj,
      cep: cep
    });
    
    const boletoResponse = await fetch(`${supabaseUrl}/functions/v1/banco-inter-create-boleto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        faturaId: fatura.id,
        valorCobrado: valorBoleto,
        pagadorNome: clienteData.nome,
        pagadorCpfCnpj: cpfCnpj,
        pagadorEndereco: {
          logradouro: logradouro,
          numero: numero,
          complemento: complemento,
          bairro: bairro,
          cidade: localidade,
          uf: uf,
          cep: cep,
        },
        mensagem: `Fatura ${codigo_fatura} - BRHUB Envios`,
        multa: {
          tipo: 'PERCENTUAL',
          valor: 10, // 10% de multa após vencimento
        },
        juros: {
          tipo: 'PERCENTUAL_DIA',
          valor: 0.033, // 1% ao mês = 0.033% ao dia
        },
      }),
    });

    console.log('📡 Resposta do banco-inter-create-boleto - Status:', boletoResponse.status);

    if (!boletoResponse.ok) {
      const errorText = await boletoResponse.text();
      console.error('❌ Erro detalhado do boleto:', errorText);
      throw new Error(`Erro ao emitir boleto: ${boletoResponse.status} - ${errorText}`);
    }

    const boletoData = await boletoResponse.json();
    const boletoPdfBase64 = boletoData.pdf;
    const dataVencimento = boletoData.dataVencimento;

    console.log('✅ Boleto emitido:', boletoData.nossoNumero);
    console.log('📋 Status do PDF:', boletoPdfBase64 ? 'PDF disponível' : 'PDF não disponível');

    // Retornar PDFs separados para o frontend fazer o merge
    const resultado = {
      status: 'ok',
      mensagem: 'Fechamento realizado com sucesso',
      nome_cliente: clienteData.nome,
      codigo_fatura: codigo_fatura,
      telefone_cliente: telefone_cliente,
      fatura_pdf: faturaPdfBase64,
      boleto_pdf: boletoPdfBase64,
      boleto_info: {
        nossoNumero: boletoData.nossoNumero,
        linhaDigitavel: boletoData.linhaDigitavel,
        codigoBarras: boletoData.codigoBarras,
        dataVencimento: dataVencimento,
        valor: valorBoleto,
      },
      detalhes: {
        valor_total: fatura.totalFaturado,
        periodo: `${fatura.periodoInicial} a ${fatura.periodoFinal}`,
        vencimento_boleto: dataVencimento,
        multa_percentual: '10%',
        juros_mensal: '1%',
      }
    };

    console.log('✅ Processo concluído com sucesso');

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no fechamento:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        mensagem: error.message,
        erro_detalhado: error.stack,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
