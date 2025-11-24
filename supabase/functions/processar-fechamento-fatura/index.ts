// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { codigo_fatura, nome_cliente, fatura_id } = await req.json() as FechamentoRequest & { fatura_id?: string };

    console.log('🚀 Iniciando fechamento da fatura:', codigo_fatura);
    console.log('📋 Cliente:', nome_cliente);
    console.log('🆔 Fatura ID:', fatura_id);

    // ✅ ETAPA 1: Buscar dados completos da fatura via API Backend
    console.log('📊 Etapa 1: Buscando dados completos da fatura...');
    
    const baseApiUrl = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const apiToken = authHeader.replace('Bearer ', '');
    
    // Buscar pela API usando o ID da fatura
    const faturaResponse = await fetch(`${baseApiUrl}/faturas/admin/${fatura_id || codigo_fatura}`, {
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
    const fatura = faturaDataResponse.data;

    if (!fatura) {
      throw new Error('Fatura não encontrada');
    }

    console.log('✅ Fatura encontrada:', {
      id: fatura.id,
      codigo: fatura.codigo,
      valor: fatura.totalFaturado,
      periodo: `${fatura.periodoInicial} - ${fatura.periodoFinal}`,
    });

    // ✅ ETAPA 3: Extrair cadastro completo do cliente
    console.log('👤 Etapa 3: Validando dados do cliente...');
    
    const clienteData = fatura.cliente;
    
    // Log completo do objeto cliente para debug
    console.log('🔍 DEBUG - Estrutura completa do cliente:', JSON.stringify(clienteData, null, 2));
    
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
    
    const valorBoleto = parseFloat(fatura.totalFaturado);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
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

    if (!boletoResponse.ok) {
      const errorText = await boletoResponse.text();
      throw new Error(`Erro ao emitir boleto: ${boletoResponse.status} - ${errorText}`);
    }

    const boletoData = await boletoResponse.json();
    const boletoPdfBase64 = boletoData.pdf;
    const dataVencimento = boletoData.dataVencimento;

    console.log('✅ Boleto emitido:', boletoData.nossoNumero);

    // ✅ ETAPA 5: Concatenar PDFs (Boleto + Fatura)
    console.log('🔗 Etapa 5: Concatenando PDFs...');
    
    // Importar pdf-lib dinamicamente
    const { PDFDocument } = await import('https://cdn.skypack.dev/pdf-lib@^1.17.1');
    
    // Decodificar Base64 para bytes
    const boletoBytes = Uint8Array.from(atob(boletoPdfBase64), c => c.charCodeAt(0));
    const faturaBytes = Uint8Array.from(atob(faturaPdfBase64), c => c.charCodeAt(0));
    
    // Carregar PDFs
    const boletoPdf = await PDFDocument.load(boletoBytes);
    const faturaPdf = await PDFDocument.load(faturaBytes);
    
    // Criar PDF final
    const pdfFinal = await PDFDocument.create();
    
    // Copiar páginas do boleto primeiro
    const boletoPages = await pdfFinal.copyPages(boletoPdf, boletoPdf.getPageIndices());
    boletoPages.forEach((page) => pdfFinal.addPage(page));
    
    // Depois copiar páginas da fatura
    const faturaPages = await pdfFinal.copyPages(faturaPdf, faturaPdf.getPageIndices());
    faturaPages.forEach((page) => pdfFinal.addPage(page));
    
    // Salvar PDF final
    const pdfFinalBytes = await pdfFinal.save();
    const pdfFinalBase64 = btoa(String.fromCharCode(...pdfFinalBytes));

    console.log('✅ PDFs concatenados');

    // 📤 RESPOSTA FINAL
    const resultado = {
      status: 'ok',
      mensagem: 'Fechamento realizado com sucesso.',
      nome_cliente,
      codigo_fatura,
      telefone_cliente,
      fatura_pdf: faturaPdfBase64,
      boleto_pdf: boletoPdfBase64,
      arquivo_final_pdf: pdfFinalBase64,
      boleto_info: {
        nosso_numero: boletoData.nossoNumero,
        linha_digitavel: boletoData.linhaDigitavel,
        codigo_barras: boletoData.codigoBarras,
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
