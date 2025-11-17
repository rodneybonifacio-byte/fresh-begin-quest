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

    // ✅ ETAPA 2: Gerar PDF da Fatura
    console.log('📄 Etapa 2: Gerando PDF da fatura...');
    
    const pdfFaturaResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpAuthToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'gerar_pdf_fatura',
          arguments: {
            codigo_fatura,
          }
        },
        id: Date.now(),
      }),
    });

    const pdfFaturaData = await pdfFaturaResponse.json();
    const faturaPdfBase64 = pdfFaturaData.result?.content?.[0]?.text 
      ? JSON.parse(pdfFaturaData.result.content[0].text).pdf_base64
      : pdfFaturaData.result.pdf_base64;

    console.log('✅ PDF da fatura gerado');

    // ✅ ETAPA 4: Emitir boleto via Banco Inter
    console.log('💰 Etapa 4: Emitindo boleto...');
    
    const valorBoleto = parseFloat(fatura.totalFaturado);
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 1); // D+1

    const boletoResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpAuthToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'emitir_boleto_inter',
          arguments: {
            valor: valorBoleto,
            vencimento: dataVencimento.toISOString().split('T')[0],
            pagador_nome: clienteData.nome,
            pagador_documento: clienteData.cpfCnpj.replace(/\D/g, ''),
            instrucao: `Referente aos serviços BRHUB Envios - Fatura ${codigo_fatura}`,
          }
        },
        id: Date.now(),
      }),
    });

    const boletoData = await boletoResponse.json();
    const boletoPdfBase64 = boletoData.result?.content?.[0]?.text 
      ? JSON.parse(boletoData.result.content[0].text).boleto_pdf_base64
      : boletoData.result.boleto_pdf_base64;

    console.log('✅ Boleto emitido com sucesso');

    // ✅ ETAPA 5: Concatenar PDFs (Fatura + Boleto)
    console.log('🔗 Etapa 5: Concatenando PDFs...');
    
    const concatenarResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpAuthToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'concatenar_pdfs',
          arguments: {
            pdf1_base64: faturaPdfBase64,
            pdf2_base64: boletoPdfBase64,
          }
        },
        id: Date.now(),
      }),
    });

    const concatenarData = await concatenarResponse.json();
    const pdfFinalBase64 = concatenarData.result?.content?.[0]?.text 
      ? JSON.parse(concatenarData.result.content[0].text).pdf_concatenado_base64
      : concatenarData.result.pdf_concatenado_base64;

    console.log('✅ PDFs concatenados');

    // ✅ ETAPA 6: Enviar via WhatsApp
    console.log('📱 Etapa 6: Enviando via WhatsApp...');
    
    const mensagem = `Olá ${nome_cliente}, tudo bem? 😊

Concluímos o fechamento da sua fatura BRHUB Envios – código ${codigo_fatura}.

Segue anexo o documento com a fatura e o boleto bancário (vencimento para amanhã).

Qualquer dúvida, estou à disposição!`;

    const whatsappResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpAuthToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'enviar_whatsapp_com_arquivo',
          arguments: {
            telefone: telefone_cliente,
            mensagem,
            arquivo_base64: pdfFinalBase64,
            nome_arquivo: `fatura_${codigo_fatura}.pdf`,
          }
        },
        id: Date.now(),
      }),
    });

    const whatsappData = await whatsappResponse.json();
    
    if (whatsappData.error) {
      console.warn('⚠️ Erro ao enviar WhatsApp:', whatsappData.error);
    } else {
      console.log('✅ WhatsApp enviado com sucesso');
    }

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
      detalhes: {
        valor_total: fatura.totalFaturado,
        periodo: `${fatura.periodoInicial} a ${fatura.periodoFinal}`,
        vencimento_boleto: dataVencimento.toISOString().split('T')[0],
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
