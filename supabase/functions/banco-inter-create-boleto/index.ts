// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmitirBoletoRequest {
  faturaId: string;
  valorCobrado: number;
  dataVencimento: string;
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

async function obterTokenBancoInter(): Promise<string> {
  const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET');
  const cert = Deno.env.get('BANCO_INTER_CLIENT_CERT');
  const key = Deno.env.get('BANCO_INTER_CLIENT_KEY');
  const caCert = Deno.env.get('BANCO_INTER_CA_CERT');

  console.log('🔐 Verificando credenciais do Banco Inter...');
  
  if (!clientId || !clientSecret || !cert || !key || !caCert) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  console.log('✅ Todas as credenciais encontradas');
  console.log('🔧 Formatando certificados...');
  
  const certFixed = formatPemCert(cert);
  const keyFixed = formatPemCert(key);
  const caCertFixed = formatPemCert(caCert);
  
  console.log('Certificado formatado - primeira linha:', certFixed.split('\n')[0]);

  const tokenUrl = 'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
  
  console.log('🌐 Criando cliente HTTP com mTLS...');
  
  // Criar cliente HTTP com mTLS (mesma estrutura da função PIX)
  const httpClient = Deno.createHttpClient({
    cert: certFixed,
    key: keyFixed,
    caCerts: [caCertFixed]
  });

  try {
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
  } finally {
    httpClient.close();
  }
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

    // Obter token de autenticação
    const accessToken = await obterTokenBancoInter();
    console.log('✅ Token obtido com sucesso');

    // Preparar dados do boleto
    const cpfCnpj = body.pagadorCpfCnpj.replace(/\D/g, '');
    const tipoPessoa = cpfCnpj.length === 11 ? 'FISICA' : 'JURIDICA';

    const boletoData = {
      seuNumero: body.faturaId,
      valorNominal: body.valorCobrado,
      dataVencimento: dataVencimento,
      numDiasAgenda: 60,
      pagador: {
        tipoPessoa: tipoPessoa,
        nome: body.pagadorNome,
        ...(tipoPessoa === 'FISICA' 
          ? { cpf: cpfCnpj }
          : { cnpj: cpfCnpj }
        ),
        ...(body.pagadorEndereco && {
          endereco: body.pagadorEndereco.logradouro,
          numero: body.pagadorEndereco.numero,
          complemento: body.pagadorEndereco.complemento || '',
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
      multa: {
        codigoMulta: body.multa?.tipo === 'PERCENTUAL' ? 'PERCENTUAL' : 'VALORFIXO',
        ...(body.multa?.tipo === 'PERCENTUAL'
          ? { taxa: body.multa?.valor || 10 }
          : { valor: body.multa?.valor || 0 }
        ),
        data: dataVencimento,
      },
      mora: {
        codigoMora: body.juros?.tipo === 'PERCENTUAL_DIA' ? 'TAXAMENSAL' : 'VALORDIA',
        ...(body.juros?.tipo === 'PERCENTUAL_DIA'
          ? { taxa: body.juros?.valor || 1 }
          : { valor: body.juros?.valor || 0 }
        ),
        data: dataVencimento,
      },
    };

    console.log('📝 Dados do boleto preparados');
    console.log('📋 Payload do boleto:', JSON.stringify(boletoData, null, 2));

    // Criar cliente HTTP com mTLS para emissão do boleto
    const cert = Deno.env.get('BANCO_INTER_CLIENT_CERT')!;
    const key = Deno.env.get('BANCO_INTER_CLIENT_KEY')!;
    const caCert = Deno.env.get('BANCO_INTER_CA_CERT')!;
    
    const certFixed = formatPemCert(cert);
    const keyFixed = formatPemCert(key);
    const caCertFixed = formatPemCert(caCert);
    
    const httpClient = Deno.createHttpClient({
      cert: certFixed,
      key: keyFixed,
      caCerts: [caCertFixed]
    });

    try {
      // Emitir boleto via API do Banco Inter com mTLS
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
        httpClient.close();
        throw new Error(`Erro ao emitir boleto: ${boletoResponse.status} - ${errorText}`);
      }

      const boletoResult = await boletoResponse.json();
      console.log('✅ Boleto emitido:', boletoResult.nossoNumero);

      // Aguardar alguns segundos para o boleto estar disponível no sistema
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Buscar PDF do boleto com mTLS
      const pdfUrl = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${boletoResult.nossoNumero}/pdf`;
      
      console.log('📄 Baixando PDF do boleto com mTLS...');
      const pdfResponse = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/pdf',
        },
        client: httpClient,
      } as any);

      if (!pdfResponse.ok) {
        console.warn('⚠️ Não foi possível obter o PDF do boleto');
      }

      const pdfBuffer = pdfResponse.ok ? await pdfResponse.arrayBuffer() : null;
      const pdfBase64 = pdfBuffer 
        ? btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))
        : null;

      const resultado = {
        nossoNumero: boletoResult.nossoNumero,
        seuNumero: boletoResult.seuNumero,
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
