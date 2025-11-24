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
    
    // Validar o token com o Supabase
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseServiceKey || '',
        }
      });

      if (!verifyResponse.ok) {
        console.error('❌ Token JWT inválido ou expirado');
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            mensagem: 'Token JWT inválido ou expirado.' 
          }), 
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const user = await verifyResponse.json();
      console.log('✅ Usuário autenticado:', user.email);
      
    } catch (authError) {
      console.error('❌ Erro ao validar token:', authError);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          mensagem: 'Erro ao validar autenticação.' 
        }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { codigo_fatura, nome_cliente } = await req.json() as FechamentoRequest;

    console.log('🚀 Iniciando fechamento da fatura:', codigo_fatura);
    console.log('📋 Cliente:', nome_cliente);

    // ✅ ETAPA 1: Buscar dados completos da fatura via MCP
    console.log('📊 Etapa 1: Buscando dados completos da fatura...');
    
    const mcpUrl = Deno.env.get('MCP_URL') || 'https://connectores.srv762140.hstgr.cloud/mcp';
    const mcpAuthToken = Deno.env.get('MCP_AUTH_TOKEN');
    
    if (!mcpAuthToken) {
      throw new Error('MCP_AUTH_TOKEN não configurado');
    }

    const mcpResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpAuthToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'buscar_fatura_completa',
          arguments: {
            codigo_fatura,
          }
        },
        id: Date.now(),
      }),
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      throw new Error(`Erro ao buscar fatura: ${mcpResponse.status} - ${errorText}`);
    }

    const faturaData = await mcpResponse.json();
    
    if (faturaData.error) {
      throw new Error(`Erro MCP: ${faturaData.error.message}`);
    }

    const fatura = faturaData.result?.content?.[0]?.text 
      ? JSON.parse(faturaData.result.content[0].text)
      : faturaData.result;

    console.log('✅ Fatura encontrada:', {
      codigo: fatura.codigo,
      valor: fatura.totalFaturado,
      periodo: `${fatura.periodoInicial} - ${fatura.periodoFinal}`,
    });

    // ✅ ETAPA 3: Extrair cadastro completo do cliente
    console.log('👤 Etapa 3: Validando dados do cliente...');
    
    const clienteData = fatura.cliente;
    const telefone_cliente = clienteData.telefone;
    
    if (!clienteData.cpfCnpj || !telefone_cliente) {
      throw new Error('Dados do cliente incompletos (falta CPF/CNPJ ou telefone)');
    }

    console.log('✅ Dados do cliente validados:', {
      nome: clienteData.nome,
      documento: clienteData.cpfCnpj,
      telefone: telefone_cliente,
    });

    // ✅ ETAPA 2: Gerar PDF da Fatura via API
    console.log('📄 Etapa 2: Gerando PDF da fatura...');
    
    const baseApiUrl = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const apiToken = authHeader.replace('Bearer ', '');
    
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
        pagadorCpfCnpj: clienteData.cpfCnpj,
        pagadorEndereco: {
          logradouro: clienteData.logradouro,
          numero: clienteData.numero,
          complemento: clienteData.complemento || '',
          bairro: clienteData.bairro,
          cidade: clienteData.localidade,
          uf: clienteData.uf,
          cep: clienteData.cep,
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
