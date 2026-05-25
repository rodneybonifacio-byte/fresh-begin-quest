// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para formatar certificado PEM corretamente
function formatPemCert(pemString: string): string {
  let cleaned = pemString.trim();
  
  if (cleaned.includes('\n')) {
    return cleaned;
  }
  
  const beginRegex = /(-----BEGIN [^-]+-----)/;
  const endRegex = /(-----END [^-]+-----)/;
  
  const beginMatch = cleaned.match(beginRegex);
  const endMatch = cleaned.match(endRegex);
  
  if (!beginMatch || !endMatch) {
    console.error('Formato de certificado inválido');
    return pemString;
  }
  
  const header = beginMatch[0];
  const footer = endMatch[0];
  const startPos = cleaned.indexOf(header) + header.length;
  const endPos = cleaned.indexOf(footer);
  const content = cleaned.substring(startPos, endPos).replace(/\s/g, '');
  
  const formatted = content.match(/.{1,64}/g)?.join('\n') || content;
  
  return `${header}\n${formatted}\n${footer}`;
}

async function obterTokenBancoInter(httpClient: Deno.HttpClient): Promise<string> {
  const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET');

  console.log('🔐 Verificando credenciais do Banco Inter...');
  
  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  const tokenUrl = 'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
  
  console.log('📡 Obtendo token de autenticação...');
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'boleto-cobranca.read boleto-cobranca.write',
      grant_type: 'client_credentials',
    }),
    client: httpClient,
  } as any);

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro na resposta:', error);
    throw new Error(`Erro ao obter token (${response.status}): ${error}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error('Token não retornado pela API do Banco Inter');
  }
  
  console.log('✅ Token obtido com sucesso');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let httpClient: Deno.HttpClient | null = null;

  try {
    const { nossoNumero, codigoFatura, cpfCnpj } = await req.json();
    
    if (!nossoNumero && !codigoFatura && !cpfCnpj) {
      return new Response(
        JSON.stringify({ error: 'nossoNumero, codigoFatura ou cpfCnpj é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Buscando boleto:', { nossoNumero, codigoFatura, cpfCnpj });

    // PRIMEIRO: Verificar se temos o boleto salvo no fechamentos_fatura
    let boletoSalvo = null;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (codigoFatura && cpfCnpj) {
      // Buscar pelo codigo_fatura E cpf_cnpj para garantir match correto
      const cpfLimpoDb = String(cpfCnpj).replace(/\D/g, '');
      console.log(`📦 Buscando fechamento: codigo_fatura=${codigoFatura}, cpf_cnpj=${cpfLimpoDb}`);
      
      const fechamentoResponse = await fetch(
        `${supabaseUrl}/rest/v1/fechamentos_fatura?codigo_fatura=eq.${codigoFatura}&cpf_cnpj=eq.${cpfLimpoDb}&select=boleto_id,boleto_pdf,nosso_numero,nome_cliente`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      
      if (fechamentoResponse.ok) {
        const fechamentos = await fechamentoResponse.json();
        console.log(`📦 Fechamentos encontrados: ${fechamentos?.length || 0}`);
        
        if (fechamentos && fechamentos.length > 0) {
          boletoSalvo = fechamentos[0];
          console.log('📦 Fechamento encontrado:', { 
            nome: boletoSalvo.nome_cliente,
            boleto_id: boletoSalvo.boleto_id,
            tem_pdf: !!boletoSalvo.boleto_pdf,
            nosso_numero: boletoSalvo.nosso_numero
          });
          
          // Se já temos o PDF salvo, retornar diretamente
          if (boletoSalvo.boleto_pdf) {
            console.log('✅ Retornando PDF do banco de dados');
            return new Response(
              JSON.stringify({ 
                success: true, 
                pdf: boletoSalvo.boleto_pdf,
                nossoNumero: boletoSalvo.nosso_numero || boletoSalvo.boleto_id || nossoNumero,
                fonte: 'database'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Se temos nosso_numero válido (não MANUAL-), usar para buscar
          if (boletoSalvo.nosso_numero && !boletoSalvo.nosso_numero.startsWith('MANUAL-')) {
            console.log('📦 Usando nosso_numero do fechamento:', boletoSalvo.nosso_numero);
          }
        }
      }
    }

    // Criar cliente HTTP com mTLS
    const cert = Deno.env.get('BANCO_INTER_CLIENT_CERT')!;
    const key = Deno.env.get('BANCO_INTER_CLIENT_KEY')!;
    const caCert = Deno.env.get('BANCO_INTER_CA_CERT')!;
    
    console.log('🔧 Formatando certificados...');
    const certFixed = formatPemCert(cert);
    const keyFixed = formatPemCert(key);
    const caCertFixed = formatPemCert(caCert);
    
    console.log('🌐 Criando cliente HTTP com mTLS...');
    httpClient = Deno.createHttpClient({
      cert: certFixed,
      key: keyFixed,
      caCerts: [caCertFixed]
    });

    // Obter token de autenticação
    const accessToken = await obterTokenBancoInter(httpClient);

    let boletoNossoNumero = nossoNumero;
    let boletoEncontrado = null;

    // Se o nossoNumero começa com "MANUAL-", ignorar e buscar pelo codigoFatura
    if (boletoNossoNumero && boletoNossoNumero.startsWith('MANUAL-')) {
      console.log('⚠️ nossoNumero é manual, ignorando:', boletoNossoNumero);
      boletoNossoNumero = null;
    }

    // Se não temos o nossoNumero válido, buscar na lista de boletos
    if (!boletoNossoNumero) {
      console.log('🔎 Buscando boletos na lista...');
      
      // Calcular período de busca (últimos 90 dias)
      const hoje = new Date();
      const dataFinal = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
      const dataInicial = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log(`📅 Período de busca: ${dataInicial} a ${dataFinal}`);
      
      // IMPORTANTE: Buscar por CPF/CNPJ que é único por cliente
      if (cpfCnpj) {
        const cpfLimpo = String(cpfCnpj).replace(/\D/g, '');
        console.log(`🔎 Buscando por CPFCNPJ: ${cpfLimpo}, codigoFatura esperado: ${codigoFatura}`);
        
        const url = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas?dataInicial=${dataInicial}&dataFinal=${dataFinal}&filtrarPor=CPFCNPJ&filtro=${cpfLimpo}&itensPorPagina=100&paginaAtual=0&ordenarPor=DATASITUACAO`;
        console.log('📡 URL:', url);
        
        const listResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            client: httpClient,
          } as any
        );

        if (listResponse.ok) {
          const listData = await listResponse.json();
          console.log(`📋 Boletos encontrados por CPFCNPJ:`, listData.totalElementos || 0);
          
          if (listData.cobrancas && listData.cobrancas.length > 0) {
            // Buscar APENAS correspondência exata pelo codigoFatura - NÃO usar fallback
            for (const cobranca of listData.cobrancas) {
              const seuNumero = cobranca.cobranca?.seuNumero || '';
              const situacao = cobranca.cobranca?.situacao;
              
              // Status válidos para boleto ativo
              const statusValidos = ['A_RECEBER', 'ATRASADO', 'MARCADO_RECEBIDO'];
              const isStatusValido = statusValidos.includes(situacao);
              
              console.log(`  📝 Verificando: seuNumero=${seuNumero}, situacao=${situacao}, codigoFatura=${codigoFatura}`);
              
              // SOMENTE correspondência exata do codigoFatura
              if (codigoFatura && seuNumero === codigoFatura && isStatusValido) {
                boletoEncontrado = cobranca;
                boletoNossoNumero = cobranca.boleto?.nossoNumero || cobranca.nossoNumero;
                console.log('✅ Boleto EXATO encontrado! seuNumero:', seuNumero, 'nossoNumero:', boletoNossoNumero);
                break;
              }
            }
            
            if (!boletoEncontrado) {
              console.log('❌ Nenhum boleto encontrado com codigoFatura:', codigoFatura);
            }
          }
        } else {
          const errText = await listResponse.text();
          console.log(`⚠️ Busca por CPFCNPJ falhou:`, errText);
        }
      }
    }

    if (!boletoNossoNumero) {
      console.log('❌ Boleto não encontrado. Dados da busca:', { codigoFatura, cpfCnpj, temFechamento: !!boletoSalvo });
      return new Response(
        JSON.stringify({ 
          error: 'Boleto não encontrado no Banco Inter. O boleto pode não ter sido gerado corretamente ou precisa ser re-emitido.',
          detalhes: {
            codigoFatura,
            cpfCnpj,
            temFechamentoLocal: !!boletoSalvo,
            sugestao: 'Cancele o fechamento atual e emita um novo boleto'
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar PDF do boleto usando codigoSolicitacao
    const codigoSolicitacao = boletoEncontrado?.cobranca?.codigoSolicitacao || boletoNossoNumero;
    console.log('📄 Baixando PDF do boleto, codigoSolicitacao:', codigoSolicitacao);
    
    const pdfResponse = await fetch(
      `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        client: httpClient,
      } as any
    );

    console.log('📡 Resposta PDF - Status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('❌ Erro ao baixar PDF:', errorText);

      let parsedError: any = null;
      try {
        parsedError = JSON.parse(errorText);
      } catch (_) {
        parsedError = null;
      }

      const detail = String(parsedError?.detail || parsedError?.title || errorText || '');
      const isProcessing = pdfResponse.status === 400 && detail.toLowerCase().includes('processamento');

      return new Response(
        JSON.stringify({
          success: false,
          code: isProcessing ? 'PDF_PROCESSING' : 'PDF_UNAVAILABLE',
          error: isProcessing
            ? 'Boleto emitido, PDF ainda em processamento pelo Banco Inter.'
            : `Erro ao baixar PDF: ${pdfResponse.status}`,
          nossoNumero: boletoNossoNumero,
          detalhes: parsedError || errorText,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // A API retorna JSON com o PDF em base64
    const pdfData = await pdfResponse.json();
    
    let pdfBase64;
    if (pdfData.pdf) {
      pdfBase64 = pdfData.pdf;
    } else if (pdfData.arquivo) {
      pdfBase64 = pdfData.arquivo;
    } else if (typeof pdfData === 'string') {
      pdfBase64 = pdfData;
    } else {
      throw new Error('Formato de PDF não reconhecido na resposta');
    }

    console.log('✅ PDF obtido com sucesso!');

    // Salvar PDF no banco para cache futuro
    if (codigoFatura && cpfCnpj) {
      const cpfLimpoDb = String(cpfCnpj).replace(/\D/g, '');
      try {
        console.log('💾 Salvando PDF no banco de dados...');
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/fechamentos_fatura?codigo_fatura=eq.${codigoFatura}&cpf_cnpj=eq.${cpfLimpoDb}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              boleto_pdf: pdfBase64,
              nosso_numero: boletoNossoNumero
            })
          }
        );
        if (updateResponse.ok) {
          console.log('✅ PDF salvo no banco com sucesso');
        } else {
          console.log('⚠️ Erro ao salvar PDF:', await updateResponse.text());
        }
      } catch (saveErr) {
        console.log('⚠️ Erro ao salvar PDF no cache:', saveErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf: pdfBase64,
        nossoNumero: boletoNossoNumero 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('❌ Erro:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    if (httpClient) {
      console.log('🔒 Fechando cliente HTTP...');
      httpClient.close();
    }
  }
});
