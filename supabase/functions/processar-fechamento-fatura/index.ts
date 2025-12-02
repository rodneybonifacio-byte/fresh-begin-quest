// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@^1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar PDF de fatura personalizado
async function gerarPdfFaturaPersonalizado(
  fatura: any,
  pagadorData: any,
  isSubfatura: boolean
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const primaryColor = rgb(0.96, 0.33, 0.11); // #F2541B (laranja)
  const darkColor = rgb(0.1, 0.1, 0.1);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);
  
  let y = height - 50;
  
  // === HEADER ===
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: primaryColor,
  });
  
  page.drawText('BRHUB ENVIOS', {
    x: 40,
    y: height - 50,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  
  page.drawText('FATURA', {
    x: 40,
    y: height - 75,
    size: 14,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });
  
  page.drawText(`#${fatura.codigo}`, {
    x: width - 150,
    y: height - 50,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  
  if (isSubfatura) {
    page.drawText('SUBFATURA', {
      x: width - 150,
      y: height - 75,
      size: 10,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });
  }
  
  y = height - 130;
  
  // === DADOS DO PAGADOR ===
  page.drawText('DADOS DO PAGADOR', {
    x: 40,
    y: y,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });
  
  y -= 25;
  
  // Box do pagador
  page.drawRectangle({
    x: 40,
    y: y - 80,
    width: width - 80,
    height: 90,
    color: lightGray,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
  });
  
  page.drawText(pagadorData.nome || 'N/A', {
    x: 50,
    y: y - 5,
    size: 14,
    font: fontBold,
    color: darkColor,
  });
  
  const cpfFormatado = pagadorData.cpfCnpj?.length === 14 
    ? pagadorData.cpfCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    : pagadorData.cpfCnpj?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || 'N/A';
  
  page.drawText(`CPF/CNPJ: ${cpfFormatado}`, {
    x: 50,
    y: y - 25,
    size: 10,
    font: fontRegular,
    color: grayColor,
  });
  
  const endereco = pagadorData.endereco;
  const enderecoLinha1 = `${endereco?.logradouro || ''}, ${endereco?.numero || 'S/N'}${endereco?.complemento ? ' - ' + endereco.complemento : ''}`;
  const enderecoLinha2 = `${endereco?.bairro || ''} - ${endereco?.cidade || ''}/${endereco?.uf || ''} - CEP: ${endereco?.cep || ''}`;
  
  page.drawText(enderecoLinha1.substring(0, 70), {
    x: 50,
    y: y - 45,
    size: 10,
    font: fontRegular,
    color: grayColor,
  });
  
  page.drawText(enderecoLinha2.substring(0, 70), {
    x: 50,
    y: y - 60,
    size: 10,
    font: fontRegular,
    color: grayColor,
  });
  
  y -= 110;
  
  // === DETALHES DA FATURA ===
  page.drawText('DETALHES DA FATURA', {
    x: 40,
    y: y,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });
  
  y -= 30;
  
  // Grid de informações
  const infoItems = [
    { label: 'Período:', value: `${formatDate(fatura.periodoInicial)} a ${formatDate(fatura.periodoFinal)}` },
    { label: 'Vencimento:', value: formatDate(fatura.dataVencimento) },
    { label: 'Total de Objetos:', value: String(fatura.totalObjetos || '1') },
    { label: 'Status:', value: fatura.status || 'PENDENTE' },
  ];
  
  infoItems.forEach((item, index) => {
    const xPos = index % 2 === 0 ? 40 : 300;
    const yPos = y - Math.floor(index / 2) * 25;
    
    page.drawText(item.label, {
      x: xPos,
      y: yPos,
      size: 10,
      font: fontBold,
      color: grayColor,
    });
    
    page.drawText(item.value, {
      x: xPos + 100,
      y: yPos,
      size: 10,
      font: fontRegular,
      color: darkColor,
    });
  });
  
  y -= 70;
  
  // === TABELA DE ITENS ===
  page.drawText('ITENS', {
    x: 40,
    y: y,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });
  
  y -= 25;
  
  // Header da tabela
  page.drawRectangle({
    x: 40,
    y: y - 5,
    width: width - 80,
    height: 25,
    color: darkColor,
  });
  
  page.drawText('DESCRIÇÃO', { x: 50, y: y + 3, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('CÓDIGO', { x: 280, y: y + 3, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('STATUS', { x: 380, y: y + 3, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('VALOR', { x: 480, y: y + 3, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  
  y -= 30;
  
  // Itens da fatura
  const detalhes = fatura.detalhe || [];
  detalhes.forEach((item: any, index: number) => {
    const bgColor = index % 2 === 0 ? rgb(1, 1, 1) : lightGray;
    
    page.drawRectangle({
      x: 40,
      y: y - 5,
      width: width - 80,
      height: 22,
      color: bgColor,
    });
    
    page.drawText((item.nome || 'Envio').substring(0, 30), { x: 50, y: y + 2, size: 9, font: fontRegular, color: darkColor });
    page.drawText(item.codigoObjeto || '-', { x: 280, y: y + 2, size: 9, font: fontRegular, color: darkColor });
    page.drawText(item.status || '-', { x: 380, y: y + 2, size: 9, font: fontRegular, color: darkColor });
    page.drawText(`R$ ${parseFloat(item.valor || 0).toFixed(2)}`, { x: 480, y: y + 2, size: 9, font: fontBold, color: darkColor });
    
    y -= 22;
  });
  
  y -= 20;
  
  // === TOTAL ===
  page.drawRectangle({
    x: 350,
    y: y - 10,
    width: 205,
    height: 50,
    color: primaryColor,
  });
  
  page.drawText('TOTAL A PAGAR', {
    x: 365,
    y: y + 20,
    size: 10,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });
  
  page.drawText(`R$ ${parseFloat(fatura.totalFaturado || 0).toFixed(2)}`, {
    x: 365,
    y: y - 2,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  
  // === FOOTER ===
  page.drawText('BRHUB Envios - Sistema de Gestão de Fretes', {
    x: 40,
    y: 40,
    size: 8,
    font: fontRegular,
    color: grayColor,
  });
  
  page.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    x: 40,
    y: 25,
    size: 8,
    font: fontRegular,
    color: grayColor,
  });
  
  const pdfBytes = await pdfDoc.save();
  return btoa(String.fromCharCode(...pdfBytes));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

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

    const { codigo_fatura, nome_cliente, fatura_id, fatura_pai_id, subfatura_id, cpf_cnpj_subcliente } = await req.json() as FechamentoRequest & { 
      fatura_id?: string;
      fatura_pai_id?: string;
      subfatura_id?: string;
      cpf_cnpj_subcliente?: string;
    };

    console.log('🚀 Iniciando fechamento da fatura:', codigo_fatura);
    console.log('📋 Cliente:', nome_cliente);
    console.log('🆔 Fatura ID:', fatura_id);
    console.log('👨‍👧 Fatura Pai ID:', fatura_pai_id);
    console.log('👶 Subfatura ID:', subfatura_id);
    console.log('📄 CPF/CNPJ Subcliente:', cpf_cnpj_subcliente);
    console.log('🔄 VERSÃO DA FUNÇÃO: 3.0 - BUSCA REMETENTE');

    // ✅ ETAPA 1: Buscar dados completos da fatura via API Backend
    console.log('📊 Etapa 1: Buscando dados completos da fatura...');
    
    const baseApiUrl = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const apiToken = authHeader.replace('Bearer ', '');
    
    let fatura;
    let isSubfatura = !!subfatura_id;
    let remetenteData = null;
    
    // Se for subfatura, precisamos buscar a fatura pai E os dados do remetente
    if (isSubfatura && fatura_pai_id) {
      console.log('🔍 É SUBFATURA - Buscando fatura PAI com ID:', fatura_pai_id);
      
      // Buscar fatura pai
      const faturaResponse = await fetch(`${baseApiUrl}/faturas/admin/${fatura_pai_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!faturaResponse.ok) {
        const errorText = await faturaResponse.text();
        throw new Error(`Erro ao buscar fatura pai: ${faturaResponse.status} - ${errorText}`);
      }

      const faturaDataResponse = await faturaResponse.json();
      fatura = faturaDataResponse.data;
      console.log('✅ Fatura pai encontrada');
      
      // LOG DETALHADO: Ver TODOS os campos da fatura pai
      console.log('📋 CAMPOS da fatura pai:', Object.keys(fatura));
      console.log('📋 fatura.faturas existe?:', !!fatura.faturas);
      console.log('📋 fatura.subFaturas existe?:', !!fatura.subFaturas);
      console.log('📋 ESTRUTURA COMPLETA FATURA PAI:', JSON.stringify(fatura, null, 2));
      
      // Procurar a subfatura - tentar múltiplos nomes de campo
      const subfaturasArray = fatura.faturas || fatura.subFaturas || fatura.subclientes || [];
      
      if (subfatura_id && subfaturasArray.length > 0) {
        console.log('🔍 Procurando subfatura dentro do array (length:', subfaturasArray.length, ')...');
        const subfaturaEncontrada = subfaturasArray.find((f: any) => f.id === subfatura_id);
        
        if (subfaturaEncontrada) {
          console.log('✅ Subfatura encontrada:', JSON.stringify(subfaturaEncontrada, null, 2));
          
          // Extrair dados do remetente da subfatura
          // A subfatura contém os dados do remetente/subcliente
          remetenteData = {
            nome: subfaturaEncontrada.nome || nome_cliente,
            cpfCnpj: subfaturaEncontrada.cpfCnpj || cpf_cnpj_subcliente,
            telefone: subfaturaEncontrada.telefone || '11999999999',
            cep: subfaturaEncontrada.cep,
            logradouro: subfaturaEncontrada.logradouro,
            numero: subfaturaEncontrada.numero,
            complemento: subfaturaEncontrada.complemento || '',
            bairro: subfaturaEncontrada.bairro,
            localidade: subfaturaEncontrada.localidade || subfaturaEncontrada.cidade,
            uf: subfaturaEncontrada.uf || subfaturaEncontrada.estado,
          };
          console.log('📋 Dados do remetente extraídos da subfatura:', JSON.stringify(remetenteData, null, 2));
        } else {
          console.log('⚠️ Subfatura não encontrada no array faturas');
        }
      }
      
      // Buscar dados do CNPJ via BrasilAPI (Receita Federal)
      if (!remetenteData && cpf_cnpj_subcliente) {
        const cnpjLimpo = cpf_cnpj_subcliente.replace(/\D/g, '');
        console.log('🔍 Buscando CNPJ na BrasilAPI (Receita Federal):', cnpjLimpo);
        
        // Verificar se é CNPJ (14 dígitos) - BrasilAPI só funciona para CNPJ
        if (cnpjLimpo.length === 14) {
          try {
            const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
            console.log('📡 BrasilAPI Status:', brasilApiResponse.status);
            
            if (brasilApiResponse.ok) {
              const cnpjData = await brasilApiResponse.json();
              console.log('✅ Dados CNPJ da Receita Federal:', JSON.stringify(cnpjData, null, 2));
              
              remetenteData = {
                nome: cnpjData.razao_social || cnpjData.nome_fantasia || nome_cliente,
                cpfCnpj: cnpjLimpo,
                telefone: cnpjData.ddd_telefone_1 ? `${cnpjData.ddd_telefone_1}`.replace(/\D/g, '') : '11999999999',
                cep: cnpjData.cep?.replace(/\D/g, '') || '',
                logradouro: cnpjData.logradouro || cnpjData.descricao_tipo_de_logradouro + ' ' + cnpjData.logradouro || '',
                numero: cnpjData.numero || 'S/N',
                complemento: (cnpjData.complemento || '').substring(0, 30),
                bairro: cnpjData.bairro || '',
                localidade: cnpjData.municipio || '',
                uf: cnpjData.uf || '',
              };
              console.log('✅ Dados do remetente via BrasilAPI:', JSON.stringify(remetenteData, null, 2));
            } else {
              const errorText = await brasilApiResponse.text();
              console.log('⚠️ BrasilAPI erro:', errorText);
            }
          } catch (brasilApiErr) {
            console.log('⚠️ Erro ao consultar BrasilAPI:', brasilApiErr);
          }
        } else {
          console.log('⚠️ CPF não suportado pela BrasilAPI, usando dados do cliente principal');
        }
      }
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

    console.log('🔍 DEBUG - Fatura obtida');

    if (!fatura) {
      throw new Error('Fatura não encontrada');
    }

    console.log('✅ Fatura encontrada:', {
      id: fatura.id,
      codigo: fatura.codigo,
      valor: fatura.totalFaturado,
      periodo: `${fatura.periodoInicial} - ${fatura.periodoFinal}`,
      isSubfatura: isSubfatura,
      temRemetenteData: !!remetenteData,
    });

    // ✅ ETAPA 3: Extrair cadastro completo do cliente/pagador
    // Para subfaturas: usar dados do remetente buscado via API como pagador
    // Para faturas normais: usar dados do cliente da fatura
    console.log('👤 Etapa 3: Validando dados do pagador...');
    
    let clienteData;
    
    if (isSubfatura && remetenteData) {
      // Subfatura: pagador é o remetente buscado via API
      console.log('📋 Usando dados do REMETENTE (buscado via API) como pagador');
      clienteData = remetenteData;
    } else if (isSubfatura && fatura.remetente) {
      // Subfatura: pagador é o remetente da fatura
      console.log('📋 Usando dados do REMETENTE da fatura como pagador');
      clienteData = fatura.remetente;
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

    // ✅ ETAPA 2: Gerar PDF da Fatura
    console.log('📄 Etapa 2: Gerando PDF da fatura...');
    
    let faturaPdfBase64;
    
    // Para SUBFATURAS: Gerar PDF personalizado com dados corretos do pagador
    if (isSubfatura) {
      console.log('📄 Gerando PDF PERSONALIZADO para subfatura...');
      
      const pagadorParaPdf = {
        nome: clienteData.nome,
        cpfCnpj: cpfCnpj,
        telefone: telefone_cliente,
        endereco: {
          logradouro: logradouro,
          numero: numero,
          complemento: complemento,
          bairro: bairro,
          cidade: localidade,
          uf: uf,
          cep: cep,
        }
      };
      
      faturaPdfBase64 = await gerarPdfFaturaPersonalizado(fatura, pagadorParaPdf, true);
      console.log('✅ PDF personalizado da subfatura gerado');
    } else {
      // Para FATURAS NORMAIS: usar API externa
      const pdfUrl = `${baseApiUrl}/faturas/imprimir/${fatura.id}`;
      console.log('📄 URL para gerar PDF:', pdfUrl);
      
      const pdfFaturaResponse = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!pdfFaturaResponse.ok) {
        const pdfErrorText = await pdfFaturaResponse.text();
        console.error('❌ Erro ao gerar PDF:', pdfErrorText);
        throw new Error(`Erro ao gerar PDF da fatura: ${pdfFaturaResponse.status}`);
      }

      const pdfFaturaData = await pdfFaturaResponse.json();
      faturaPdfBase64 = pdfFaturaData.dados;
      console.log('✅ PDF da fatura gerado via API');
    }

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
      pagador: {
        nome: clienteData.nome,
        cpfCnpj: cpfCnpj,
        telefone: telefone_cliente,
        endereco: {
          logradouro: logradouro,
          numero: numero,
          complemento: complemento,
          bairro: bairro,
          cidade: localidade,
          uf: uf,
          cep: cep,
        }
      },
      is_subfatura: isSubfatura,
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
