// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmitirBoletoRequest {
  faturaId: string;
  codigoFatura: string; // IMPORTANTE: Código da fatura para usar como seuNumero
  valorCobrado: number;
  dataVencimento?: string;
  pagadorNome: string;
  pagadorCpfCnpj: string;
  pagadorEndereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  mensagem?: string;
  desconto?: {
    tipo: 'PERCENTUAL' | 'VALOR_FIXO';
    valor: number;
    dataLimite?: string;
  };
  multa?: {
    tipo: 'PERCENTUAL' | 'VALOR_FIXO';
    valor: number;
  };
  juros?: {
    tipo: 'PERCENTUAL_DIA' | 'VALOR_DIA';
    valor: number;
  };
}

// Função para calcular o próximo dia útil
function calcularProximoDiaUtil(data: Date): Date {
  const resultado = new Date(data);
  const diaSemana = resultado.getDay();
  
  // Se for sábado (6), adiciona 2 dias para segunda
  if (diaSemana === 6) {
    resultado.setDate(resultado.getDate() + 2);
  }
  // Se for domingo (0), adiciona 1 dia para segunda
  else if (diaSemana === 0) {
    resultado.setDate(resultado.getDate() + 1);
  }
  
  return resultado;
}

// Função para calcular vencimento D+1 considerando dias úteis
function calcularVencimentoDMaisUm(): string {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  
  const vencimento = calcularProximoDiaUtil(amanha);
  return vencimento.toISOString().split('T')[0];
}

// Função para obter token OAuth do Banco Inter
// Função para formatar certificado PEM corretamente (reutilizada da função PIX)
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

  console.log('✅ Credenciais encontradas');

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

  console.log('📡 Resposta recebida - Status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro na resposta:', error);
    throw new Error(`Erro ao obter token (${response.status}): ${error}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    console.error('❌ Token não encontrado na resposta:', data);
    throw new Error('Token não retornado pela API do Banco Inter');
  }
  
  console.log('✅ Token obtido com sucesso');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎫 Iniciando emissão de boleto...');
    
    const body = await req.json() as EmitirBoletoRequest;
    
    // Calcular vencimento se não fornecido
    const dataVencimento = body.dataVencimento || calcularVencimentoDMaisUm();
    console.log('📅 Data de vencimento:', dataVencimento);

    // Criar cliente HTTP com mTLS ÚNICO para todas as operações
    const cert = Deno.env.get('BANCO_INTER_CLIENT_CERT')!;
    const key = Deno.env.get('BANCO_INTER_CLIENT_KEY')!;
    const caCert = Deno.env.get('BANCO_INTER_CA_CERT')!;
    
    console.log('🔧 Formatando certificados...');
    const certFixed = formatPemCert(cert);
    const keyFixed = formatPemCert(key);
    const caCertFixed = formatPemCert(caCert);
    
    console.log('🌐 Criando cliente HTTP com mTLS...');
    const httpClient = Deno.createHttpClient({
      cert: certFixed,
      key: keyFixed,
      caCerts: [caCertFixed]
    });

    try {
      // Obter token de autenticação usando o mesmo cliente HTTP
      const accessToken = await obterTokenBancoInter(httpClient);
      console.log('✅ Token obtido com sucesso');

    // Preparar dados do boleto
    const cpfCnpj = body.pagadorCpfCnpj?.replace(/\D/g, '') || '';
    
    if (!cpfCnpj) {
      throw new Error('CPF/CNPJ do pagador é obrigatório');
    }
    
    const tipoPessoa = cpfCnpj.length === 11 ? 'FISICA' : 'JURIDICA';
    
    // IMPORTANTE: Usar codigoFatura como seuNumero para facilitar busca posterior
    // seuNumero máximo 15 caracteres - usar codigoFatura ou fallback
    const seuNumero = body.codigoFatura 
      ? body.codigoFatura.substring(0, 15) 
      : (Date.now().toString().slice(-8) + body.faturaId.replace(/-/g, '').slice(0, 7));
    
    console.log('🔑 seuNumero para Banco Inter:', seuNumero, '| codigoFatura:', body.codigoFatura);

    // 🚀 VERIFICAR SE JÁ EXISTE BOLETO COM MESMO seuNumero
    console.log('🔍 Verificando se já existe boleto com seuNumero:', seuNumero);
    
    // Tentar buscar boleto existente - tratar erros 400 como "não encontrado"
    let boletoExistente = null;
    
    try {
      // Primeiro: buscar diretamente pelo seuNumero
      const searchUrl = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas?seuNumero=${seuNumero}&situacao=A_RECEBER`;
      
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        client: httpClient,
      } as any);

      console.log('📡 Resposta busca boleto existente - Status:', searchResponse.status);

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        console.log('📋 Resultado busca:', JSON.stringify(searchResult).substring(0, 500));
        
        const cobrancas = searchResult.cobrancas || searchResult || [];
        
        if (Array.isArray(cobrancas) && cobrancas.length > 0) {
          boletoExistente = cobrancas[0];
        }
      } else {
        console.log('⚠️ Busca por seuNumero retornou erro, tentando busca por período...');
        
        // Fallback: buscar por período recente (últimos 7 dias)
        const hoje = new Date();
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        
        const dataInicial = seteDiasAtras.toISOString().split('T')[0];
        const dataFinal = hoje.toISOString().split('T')[0];
        
        const fallbackUrl = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas?dataInicial=${dataInicial}&dataFinal=${dataFinal}&situacao=A_RECEBER`;
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          client: httpClient,
        } as any);

        console.log('📡 Resposta busca por período - Status:', fallbackResponse.status);

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          const cobrancasFallback = fallbackResult.cobrancas || fallbackResult || [];
          
          if (Array.isArray(cobrancasFallback)) {
            // Procurar boleto com mesmo seuNumero na lista
            boletoExistente = cobrancasFallback.find((c: any) => c.seuNumero === seuNumero);
            
            if (boletoExistente) {
              console.log('✅ Boleto encontrado via busca por período');
            }
          }
        }
      }
    } catch (searchError) {
      console.warn('⚠️ Erro na busca por boleto existente:', searchError);
      // Continuar para tentar criar o boleto
    }

    // Se encontrou boleto existente, retornar ele
    if (boletoExistente) {
      const boletoId = boletoExistente.codigoSolicitacao || boletoExistente.nossoNumero;
      
      console.log('✅ Boleto existente encontrado! ID:', boletoId);
      console.log('📋 Dados boleto existente:', JSON.stringify(boletoExistente).substring(0, 500));
      
      // Buscar PDF do boleto existente
      console.log('📄 Baixando PDF do boleto existente...');
      const pdfUrl = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${boletoId}/pdf`;
      
      const pdfResponse = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        client: httpClient,
      } as any);
      
      let pdfBase64 = null;
      if (pdfResponse.ok) {
        const pdfData = await pdfResponse.json();
        pdfBase64 = pdfData.pdf || pdfData.arquivo || (typeof pdfData === 'string' ? pdfData : null);
        console.log('✅ PDF do boleto existente recuperado');
      } else {
        console.warn('⚠️ Não foi possível obter PDF do boleto existente');
      }
      
      const resultado = {
        nossoNumero: boletoId,
        seuNumero: boletoExistente.seuNumero || seuNumero,
        codigoBarras: boletoExistente.codigoBarras,
        linhaDigitavel: boletoExistente.linhaDigitavel,
        pdf: pdfBase64,
        dataVencimento: boletoExistente.dataVencimento,
        valor: boletoExistente.valorNominal || body.valorCobrado,
        status: 'EXISTENTE',
        from_existing: true,
      };
      
      console.log('🔒 Fechando cliente HTTP...');
      httpClient.close();
      
      return new Response(
        JSON.stringify(resultado),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    console.log('📝 Nenhum boleto existente encontrado, criando novo...');

    const boletoData = {
      seuNumero: seuNumero,
      valorNominal: body.valorCobrado,
      dataVencimento: dataVencimento,
      numDiasAgenda: 60,
      pagador: {
        cpfCnpj: cpfCnpj,
        tipoPessoa: tipoPessoa,
        nome: body.pagadorNome,
        ...(body.pagadorEndereco && {
          endereco: body.pagadorEndereco.logradouro,
          numero: body.pagadorEndereco.numero,
          // Banco Inter limita complemento a 30 caracteres
          complemento: (body.pagadorEndereco.complemento || '').substring(0, 30),
          bairro: body.pagadorEndereco.bairro,
          cidade: body.pagadorEndereco.cidade,
          uf: body.pagadorEndereco.uf,
          cep: body.pagadorEndereco.cep.replace(/\D/g, ''),
        })
      },
      mensagem: {
        linha1: body.mensagem || `Fatura ${body.faturaId} - BRHUB Envios`
      },
      ...(body.desconto && {
        desconto: {
          codigoDesconto: body.desconto.tipo === 'PERCENTUAL' ? 'PERCENTUALDATAINFORMADA' : 'VALORFIXODATAINFORMADA',
          ...(body.desconto.tipo === 'PERCENTUAL' 
            ? { taxa: body.desconto.valor }
            : { valor: body.desconto.valor }
          ),
          data: body.desconto.dataLimite || dataVencimento,
        }
      }),
      ...(body.multa && {
        multa: {
          codigo: body.multa.tipo === 'PERCENTUAL' ? 'PERCENTUAL' : 'VALORFIXO',
          taxa: body.multa.valor,
        }
      }),
      ...(body.juros && {
        mora: {
          codigo: body.juros.tipo === 'PERCENTUAL_DIA' ? 'TAXAMENSAL' : 'VALORDIA',
          taxa: body.juros.tipo === 'PERCENTUAL_DIA' ? (body.juros.valor * 30) : body.juros.valor,
        }
      }),
    };

    console.log('📝 Dados do boleto preparados');
    console.log('📋 Payload do boleto:', JSON.stringify(boletoData, null, 2));
    console.log('🔍 CPF/CNPJ:', cpfCnpj, '| Tipo:', tipoPessoa, '| seuNumero:', seuNumero);

    // Emitir boleto via API do Banco Inter com mTLS (usando o mesmo httpClient)
    const boletoUrl = 'https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas';
    
    console.log('🌐 Enviando requisição para emitir boleto com mTLS...');
    const boletoResponse = await fetch(boletoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(boletoData),
        client: httpClient,
      } as any);

      console.log('📡 Resposta da API - Status:', boletoResponse.status);

      if (!boletoResponse.ok) {
        const errorText = await boletoResponse.text();
        console.error('❌ Erro ao emitir boleto:', errorText);
        throw new Error(`Erro ao emitir boleto: ${boletoResponse.status} - ${errorText}`);
      }

      const boletoResult = await boletoResponse.json();
      console.log('📋 Resposta completa do boleto:', JSON.stringify(boletoResult, null, 2));
      
      // O campo pode ser 'nossoNumero' ou 'codigoSolicitacao'
      const boletoId = boletoResult.nossoNumero || boletoResult.codigoSolicitacao || boletoResult.id;
      
      if (!boletoId) {
        console.error('❌ Nenhum identificador de boleto encontrado na resposta');
        throw new Error('Resposta da API do Inter não contém identificador do boleto');
      }
      
      console.log('✅ Boleto emitido - ID:', boletoId);

      // Aguardar mais tempo para o PDF ser gerado no sistema do Inter
      console.log('⏳ Aguardando 5 segundos para geração do PDF...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Buscar PDF do boleto com mTLS (usando o mesmo httpClient)
      const pdfUrl = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${boletoId}/pdf`;
      
      console.log('📄 Baixando PDF do boleto com mTLS...');
      console.log('🔗 URL do PDF:', pdfUrl);
      
      const pdfResponse = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        client: httpClient,
      } as any);
      
      console.log('📡 Resposta PDF - Status:', pdfResponse.status);
      console.log('📡 Resposta PDF - Headers:', Object.fromEntries(pdfResponse.headers.entries()));

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.error('❌ Erro ao baixar PDF - Status:', pdfResponse.status);
        console.error('❌ Erro ao baixar PDF - Resposta:', errorText);
        
        // Se falhar, retornar sem o PDF mas com os dados do boleto
        console.warn('⚠️ Continuando sem o PDF do boleto');
        
        const resultado = {
          nossoNumero: boletoId,
          seuNumero: boletoResult.seuNumero || seuNumero,
          codigoBarras: boletoResult.codigoBarras,
          linhaDigitavel: boletoResult.linhaDigitavel,
          pdf: null,
          dataVencimento: dataVencimento,
          valor: body.valorCobrado,
          status: 'EMITIDO_SEM_PDF',
        };
        
        return new Response(
          JSON.stringify(resultado),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // A API retorna JSON com o PDF em base64
      const pdfData = await pdfResponse.json();
      console.log('📋 Estrutura da resposta PDF:', Object.keys(pdfData));
      
      let pdfBase64;
      
      // O PDF pode vir em diferentes formatos na resposta
      if (pdfData.pdf) {
        pdfBase64 = pdfData.pdf;
      } else if (pdfData.arquivo) {
        pdfBase64 = pdfData.arquivo;
      } else if (typeof pdfData === 'string') {
        pdfBase64 = pdfData;
      } else {
        throw new Error('Formato de PDF não reconhecido na resposta');
      }

      const resultado = {
        nossoNumero: boletoId,
        seuNumero: boletoResult.seuNumero || seuNumero,
        codigoBarras: boletoResult.codigoBarras,
        linhaDigitavel: boletoResult.linhaDigitavel,
        pdf: pdfBase64,
        dataVencimento: dataVencimento,
        valor: body.valorCobrado,
        status: 'EMITIDO',
      };

      console.log('✅ Boleto processado com sucesso');

      return new Response(
        JSON.stringify(resultado),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } finally {
      // Fechar o cliente HTTP uma única vez
      console.log('🔒 Fechando cliente HTTP...');
      httpClient.close();
    }

  } catch (error: any) {
    console.error('❌ Erro ao emitir boleto:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao emitir boleto',
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
