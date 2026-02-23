// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@^1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Função para gerar PDF de fatura personalizado - LAYOUT PROFISSIONAL
async function gerarPdfFaturaPersonalizado(
  fatura: any,
  pagadorData: any,
  isSubfatura: boolean,
  valorTotal?: number,
  detalhesSubfatura?: any[]
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Cores baseadas na identidade BRHUB
  const primaryOrange = rgb(0.95, 0.33, 0.11); // #F2541B
  const darkColor = rgb(0.15, 0.15, 0.15);
  const grayColor = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.96, 0.96, 0.98);
  const whiteColor = rgb(1, 1, 1);
  const headerBg = rgb(0.12, 0.12, 0.12);
  
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 40;
  const ROW_HEIGHT = 28;
  const HEADER_TABLE_HEIGHT = 30;
  
  const detalhes = (isSubfatura && detalhesSubfatura) ? detalhesSubfatura : (fatura.detalhe || []);
  console.log(`📋 Total de itens no PDF: ${detalhes.length}`);
  
  const totalObjetosExibir = isSubfatura && detalhesSubfatura 
    ? detalhesSubfatura.length 
    : (fatura.totalObjetos || '1');
  
  const valorParaExibir = valorTotal !== undefined ? valorTotal : parseFloat(fatura.totalFaturado || 0);
  
  // Calcular paginação
  const FIRST_PAGE_ITEMS = 12;
  const OTHER_PAGE_ITEMS = 22;
  
  let totalPages = 1;
  if (detalhes.length > FIRST_PAGE_ITEMS) {
    totalPages = 1 + Math.ceil((detalhes.length - FIRST_PAGE_ITEMS) / OTHER_PAGE_ITEMS);
  }
  
  // Função para desenhar header da tabela
  const drawTableHeader = (page: any, yPos: number) => {
    page.drawRectangle({
      x: MARGIN,
      y: yPos - 5,
      width: PAGE_WIDTH - (MARGIN * 2),
      height: HEADER_TABLE_HEIGHT,
      color: headerBg,
    });
    
    page.drawText('Nº', { x: MARGIN + 10, y: yPos + 5, size: 9, font: fontBold, color: whiteColor });
    page.drawText('DESCRIÇÃO DO ENVIO', { x: MARGIN + 50, y: yPos + 5, size: 9, font: fontBold, color: whiteColor });
    page.drawText('CÓDIGO', { x: 380, y: yPos + 5, size: 9, font: fontBold, color: whiteColor });
    page.drawText('VALOR', { x: 490, y: yPos + 5, size: 9, font: fontBold, color: whiteColor });
    
    return yPos - 35;
  };
  
  // Função para desenhar footer completo estilo modelo
  const drawFooter = (page: any, pageNum: number, totalPages: number) => {
    // Endereço acima da barra preta
    page.drawText('Rua Xavantes, 719 - Setimo andar, sala 718 - Sao Paulo, SP', {
      x: MARGIN, y: 70, size: 9, font: fontRegular, color: grayColor,
    });
    
    // Barra inferior preta
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: 50,
      color: headerBg,
    });
    
    // Informações de contato na barra preta
    page.drawText('(11) 94627-8338 / 91154-4095', {
      x: MARGIN, y: 22, size: 9, font: fontRegular, color: whiteColor,
    });
    page.drawText('financeiro@brhubb.com.br', {
      x: 200, y: 22, size: 9, font: fontRegular, color: whiteColor,
    });
    page.drawText('envios.brhubb.com.br', {
      x: 380, y: 22, size: 9, font: fontRegular, color: whiteColor,
    });
    page.drawText(`Pagina ${pageNum}/${totalPages}`, {
      x: PAGE_WIDTH - 80, y: 22, size: 8, font: fontRegular, color: whiteColor,
    });
  };
  
  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  let currentPageNum = 1;
  let itemIndex = 0;
  
  // === HEADER PRINCIPAL COM LOGO ===
  // Logo BRHUB com barra laranja + texto
  // Barra laranja vertical (representa o raio)
  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 28,
    width: 6,
    height: 32,
    color: primaryOrange,
  });
  
  // Texto BRHUB
  currentPage.drawText('BRHUB', {
    x: MARGIN + 12,
    y: y - 18,
    size: 26,
    font: fontBold,
    color: darkColor,
  });
  
  // Subtítulo
  currentPage.drawText('ENVIOS', {
    x: MARGIN + 12,
    y: y - 32,
    size: 10,
    font: fontRegular,
    color: grayColor,
  });
  
  // Badge "FATURA" à direita
  currentPage.drawRectangle({
    x: PAGE_WIDTH - MARGIN - 120,
    y: y - 25,
    width: 120,
    height: 35,
    color: headerBg,
  });
  currentPage.drawText('FATURA', {
    x: PAGE_WIDTH - MARGIN - 95,
    y: y - 12,
    size: 16,
    font: fontBold,
    color: whiteColor,
  });
  
  y -= 70;
  
  // Linha divisória
  currentPage.drawLine({
    start: { x: MARGIN, y: y },
    end: { x: PAGE_WIDTH - MARGIN, y: y },
    thickness: 1,
    color: lightGray,
  });
  
  y -= 25;
  
  // === DADOS DO PAGADOR (esquerda) e DADOS DA FATURA (direita) ===
  // Lado esquerdo - Dados do pagador
  currentPage.drawText('Código da Fatura', { x: MARGIN, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText(`#${fatura.codigo}`, { x: MARGIN + 100, y: y, size: 9, font: fontBold, color: darkColor });
  
  // Lado direito - Data
  currentPage.drawText('Data Emissão:', { x: 380, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText(formatDate(new Date().toISOString()), { x: 460, y: y, size: 9, font: fontBold, color: darkColor });
  
  y -= 18;
  
  currentPage.drawText('Cliente', { x: MARGIN, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText((pagadorData.nome || 'N/A').substring(0, 40), { x: MARGIN + 100, y: y, size: 9, font: fontBold, color: darkColor });
  
  currentPage.drawText('Vencimento:', { x: 380, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText(formatDate(fatura.dataVencimento), { x: 460, y: y, size: 9, font: fontBold, color: darkColor });
  
  y -= 18;
  
  const cpfFormatado = pagadorData.cpfCnpj?.length === 14 
    ? pagadorData.cpfCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    : pagadorData.cpfCnpj?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || 'N/A';
  
  currentPage.drawText('CPF/CNPJ', { x: MARGIN, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText(cpfFormatado, { x: MARGIN + 100, y: y, size: 9, font: fontBold, color: darkColor });
  
  currentPage.drawText('Período:', { x: 380, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText(`${formatDate(fatura.periodoInicial)} a ${formatDate(fatura.periodoFinal)}`, { x: 460, y: y, size: 9, font: fontRegular, color: darkColor });
  
  y -= 18;
  
  const endereco = pagadorData.endereco;
  const enderecoLinha = `${endereco?.logradouro || ''}, ${endereco?.numero || 'S/N'} - ${endereco?.bairro || ''}`;
  const cidadeUf = `${endereco?.cidade || ''}/${endereco?.uf || ''} - CEP: ${endereco?.cep || ''}`;
  
  currentPage.drawText('Endereço', { x: MARGIN, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText(enderecoLinha.substring(0, 50), { x: MARGIN + 100, y: y, size: 9, font: fontRegular, color: darkColor });
  
  if (isSubfatura) {
    currentPage.drawText('Tipo:', { x: 380, y: y, size: 9, font: fontRegular, color: grayColor });
    currentPage.drawText('SUBFATURA', { x: 460, y: y, size: 9, font: fontBold, color: primaryOrange });
  }
  
  y -= 18;
  currentPage.drawText('', { x: MARGIN, y: y, size: 9, font: fontRegular, color: grayColor });
  currentPage.drawText(cidadeUf.substring(0, 50), { x: MARGIN + 100, y: y, size: 9, font: fontRegular, color: darkColor });
  
  y -= 35;
  
  // Linha divisória antes da tabela
  currentPage.drawLine({
    start: { x: MARGIN, y: y },
    end: { x: PAGE_WIDTH - MARGIN, y: y },
    thickness: 1,
    color: lightGray,
  });
  
  y -= 20;
  
  // === TABELA DE ITENS ===
  y = drawTableHeader(currentPage, y);
  
  // Desenhar itens
  let somaItens = 0;
  while (itemIndex < detalhes.length) {
    const item = detalhes[itemIndex];
    
    // Verificar se precisa de nova página
    if (y < 150) {
      drawFooter(currentPage, currentPageNum, totalPages);
      
      currentPageNum++;
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      
      // Header simplificado
      currentPage.drawText('BRHUB', { x: MARGIN + 30, y: y - 10, size: 20, font: fontBold, color: darkColor });
      currentPage.drawText(`Fatura #${fatura.codigo} - Continuação`, { x: 200, y: y - 10, size: 12, font: fontRegular, color: grayColor });
      
      y -= 50;
      y = drawTableHeader(currentPage, y);
    }
    
    // Fundo alternado
    const bgColor = itemIndex % 2 === 0 ? whiteColor : lightGray;
    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 5,
      width: PAGE_WIDTH - (MARGIN * 2),
      height: ROW_HEIGHT,
      color: bgColor,
    });
    
    // Linhas de borda horizontal
    currentPage.drawLine({
      start: { x: MARGIN, y: y - 5 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - 5 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    const numero = String(itemIndex + 1).padStart(2, '0');
    const valorItem = parseFloat(item.valor || 0);
    somaItens += valorItem;
    
    currentPage.drawText(numero, { x: MARGIN + 10, y: y + 5, size: 9, font: fontRegular, color: darkColor });
    currentPage.drawText((item.nome || 'Envio').substring(0, 50), { x: MARGIN + 50, y: y + 5, size: 9, font: fontRegular, color: darkColor });
    currentPage.drawText(item.codigoObjeto || '-', { x: 380, y: y + 5, size: 9, font: fontRegular, color: grayColor });
    currentPage.drawText(`R$ ${valorItem.toFixed(2)}`, { x: 490, y: y + 5, size: 9, font: fontBold, color: darkColor });
    
    y -= ROW_HEIGHT;
    itemIndex++;
  }
  
  // Linha final da tabela
  currentPage.drawLine({
    start: { x: MARGIN, y: y + ROW_HEIGHT - 5 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + ROW_HEIGHT - 5 },
    thickness: 1,
    color: headerBg,
  });
  
  y -= 40;
  
  // === SEÇÃO DE TOTAIS - Layout estilo modelo ===
  // Sub-Total à esquerda
  currentPage.drawText('Sub-Total', { x: MARGIN, y: y, size: 10, font: fontRegular, color: grayColor });
  currentPage.drawText(`R$ ${somaItens.toFixed(2)}`, { x: MARGIN + 100, y: y, size: 10, font: fontBold, color: darkColor });
  
  y -= 18;
  
  // Total de objetos
  currentPage.drawText('Total Objetos:', { x: MARGIN, y: y, size: 10, font: fontRegular, color: grayColor });
  currentPage.drawText(String(totalObjetosExibir), { x: MARGIN + 100, y: y, size: 10, font: fontBold, color: darkColor });
  
  y -= 18;
  
  // Total Geral à esquerda
  currentPage.drawText('Total Geral:', { x: MARGIN, y: y, size: 10, font: fontBold, color: darkColor });
  currentPage.drawText(`R$ ${valorParaExibir.toFixed(2)}`, { x: MARGIN + 100, y: y, size: 12, font: fontBold, color: darkColor });
  
  // TOTAL A PAGAR à direita (destacado)
  const totalBoxY = y + 35;
  currentPage.drawText('Total Due:', { x: 400, y: totalBoxY + 20, size: 10, font: fontRegular, color: grayColor });
  currentPage.drawText(`R$ ${valorParaExibir.toFixed(2)}`, { x: 400, y: totalBoxY - 5, size: 24, font: fontBold, color: darkColor });
  
  y -= 40;
  
  // Informações do desenvolvedor
  currentPage.drawText('Desenvolvido por: BRHUB Envios - Sistema de Gestão de Fretes', {
    x: 300, y: y, size: 8, font: fontRegular, color: grayColor,
  });
  
  y -= 12;
  currentPage.drawText(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    x: 300, y: y, size: 8, font: fontRegular, color: grayColor,
  });
  
  // Footer
  drawFooter(currentPage, currentPageNum, totalPages);
  
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
  apenas_pdf?: boolean;
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
    let tokenPayload: any = null;
    try {
      tokenPayload = JSON.parse(atob(tokenParts[1]));
      console.log('✅ Token decodificado - Usuário:', tokenPayload.name || tokenPayload.email);
      console.log('📋 Role do usuário:', tokenPayload.role);
      console.log('📋 Payload completo:', JSON.stringify(tokenPayload, null, 2));
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

    // Parse body primeiro para verificar se é modo teste
    const requestBody = await req.json() as FechamentoRequest & { 
      fatura_id?: string;
      fatura_pai_id?: string;
      subfatura_id?: string;
      cpf_cnpj_subcliente?: string;
      valor_subfatura?: string;
    };
    
    const { codigo_fatura, nome_cliente, fatura_id, fatura_pai_id, subfatura_id, cpf_cnpj_subcliente, valor_subfatura, apenas_pdf } = requestBody;

    // Verificar se é admin (exceto para modo teste)
    if (tokenPayload.role !== 'ADMIN' && !apenas_pdf) {
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
    
    if (apenas_pdf) {
      console.log('🧪 MODO TESTE - Bypass de verificação admin para teste de PDF');
    }

    console.log('🚀 Iniciando fechamento da fatura:', codigo_fatura);
    console.log('🔄 VERSÃO DA FUNÇÃO: 6.0 - OTIMIZAÇÃO DE PERFORMANCE');

    // 🚀 OTIMIZAÇÃO: Verificar se já existe fechamento em cache
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar cache apenas se não for modo teste
    if (!apenas_pdf) {
      console.log('🔍 Verificando cache de fechamento...');
      const cacheQuery = supabaseAdmin
        .from('fechamentos_fatura')
        .select('*')
        .eq('codigo_fatura', codigo_fatura);
      
      if (subfatura_id) {
        cacheQuery.eq('subfatura_id', subfatura_id);
      } else {
        cacheQuery.is('subfatura_id', null);
      }
      
      const { data: fechamentoCache } = await cacheQuery.single();
      
      if (fechamentoCache && fechamentoCache.fatura_pdf && fechamentoCache.boleto_pdf) {
        console.log('✅ CACHE HIT - Retornando PDFs do cache');
        return new Response(
          JSON.stringify({
            status: 'ok',
            mensagem: 'Fechamento recuperado do cache',
            nome_cliente: fechamentoCache.nome_cliente,
            codigo_fatura: codigo_fatura,
            fatura_pdf: fechamentoCache.fatura_pdf,
            boleto_pdf: fechamentoCache.boleto_pdf,
            boleto_info: {
              nossoNumero: fechamentoCache.boleto_id,
            },
            from_cache: true,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      console.log('📝 Cache não encontrado, gerando novo fechamento...');
    }

    // ✅ ETAPA 1: Buscar dados em PARALELO para otimização
    console.log('📊 Etapa 1: Buscando dados (otimizado)...');
    
    const baseApiUrl = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const apiToken = authHeader.replace('Bearer ', '');
    
    let fatura;
    let isSubfatura = !!subfatura_id;
    let valorSubfatura: number | null = valor_subfatura ? parseFloat(valor_subfatura) : null;
    let remetenteData = null;
    
    // 🚀 OTIMIZAÇÃO: Iniciar chamadas em paralelo
    const cnpjLimpo = cpf_cnpj_subcliente?.replace(/\D/g, '') || '';
    const isCNPJ = cnpjLimpo.length === 14;
    
    // Preparar promessas para execução paralela
    const faturaPromise = fetch(`${baseApiUrl}/faturas/admin/${isSubfatura && fatura_pai_id ? fatura_pai_id : fatura_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Buscar BrasilAPI em paralelo (apenas se for CNPJ e subfatura)
    const brasilApiPromise = (isSubfatura && isCNPJ) 
      ? fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`).catch(() => null)
      : Promise.resolve(null);
    
    // Executar ambas em paralelo
    const [faturaResponse, brasilApiResponse] = await Promise.all([faturaPromise, brasilApiPromise]);
    
    // Processar resposta da fatura
    if (!faturaResponse.ok) {
      const errorText = await faturaResponse.text();
      throw new Error(`Erro ao buscar fatura: ${faturaResponse.status} - ${errorText}`);
    }
    const faturaDataResponse = await faturaResponse.json();
    fatura = faturaDataResponse.data;
    
    // Processar subfatura se necessário
    if (isSubfatura && fatura_pai_id) {
      const subfaturasArray = fatura.faturas || fatura.subFaturas || fatura.subclientes || [];
      
      if (subfatura_id && subfaturasArray.length > 0) {
        const subfaturaEncontrada = subfaturasArray.find((f: any) => f.id === subfatura_id);
        
        if (subfaturaEncontrada) {
          if (valorSubfatura === null || valorSubfatura === 0) {
            valorSubfatura = parseFloat(subfaturaEncontrada.totalFaturado || subfaturaEncontrada.valor || '0');
          }
          
          // Extrair dados do remetente da subfatura se disponível
          if (subfaturaEncontrada.cep) {
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
          }
        }
      }
      
      // Usar dados da BrasilAPI se não temos remetenteData e a requisição foi bem sucedida
      if (!remetenteData && brasilApiResponse && brasilApiResponse.ok) {
        try {
          const cnpjData = await brasilApiResponse.json();
          remetenteData = {
            nome: cnpjData.razao_social || cnpjData.nome_fantasia || nome_cliente,
            cpfCnpj: cnpjLimpo,
            telefone: cnpjData.ddd_telefone_1 ? `${cnpjData.ddd_telefone_1}`.replace(/\D/g, '') : '11999999999',
            cep: cnpjData.cep?.replace(/\D/g, '') || '',
            logradouro: cnpjData.logradouro || '',
            numero: cnpjData.numero || 'S/N',
            complemento: (cnpjData.complemento || '').substring(0, 30),
            bairro: cnpjData.bairro || '',
            localidade: cnpjData.municipio || '',
            uf: cnpjData.uf || '',
          };
        } catch (e) {
          console.log('⚠️ Erro ao processar BrasilAPI');
        }
      }
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
    let logradouro = clienteData.logradouro;
    let numero = clienteData.numero;
    const complemento = clienteData.complemento || '';
    let bairro = clienteData.bairro;
    let localidade = clienteData.localidade || clienteData.cidade;
    let uf = clienteData.uf || clienteData.estado;
    
    if (!cpfCnpj) {
      console.error('❌ CPF/CNPJ não encontrado no objeto cliente');
      throw new Error('Dados do cliente incompletos: CPF/CNPJ não encontrado');
    }
    
    // 🔄 FALLBACK: Se logradouro ou bairro estão vazios, buscar via BrasilAPI/ViaCEP usando o CEP
    if (cep && (!logradouro || !bairro || !localidade || !uf)) {
      console.log('🔄 Endereço incompleto, buscando via BrasilAPI com CEP:', cep);
      const cepLimpo = cep.replace(/\D/g, '');
      try {
        const cepResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepLimpo}`);
        if (cepResponse.ok) {
          const cepData = await cepResponse.json();
          console.log('✅ Dados do CEP obtidos:', JSON.stringify(cepData, null, 2));
          if (!logradouro && cepData.street) logradouro = cepData.street;
          if (!bairro && cepData.neighborhood) bairro = cepData.neighborhood;
          if (!localidade && cepData.city) localidade = cepData.city;
          if (!uf && cepData.state) uf = cepData.state;
        } else {
          console.log('⚠️ BrasilAPI falhou, tentando ViaCEP...');
          const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
          if (viaCepResponse.ok) {
            const viaCepData = await viaCepResponse.json();
            if (!viaCepData.erro) {
              console.log('✅ Dados do ViaCEP obtidos:', JSON.stringify(viaCepData, null, 2));
              if (!logradouro && viaCepData.logradouro) logradouro = viaCepData.logradouro;
              if (!bairro && viaCepData.bairro) bairro = viaCepData.bairro;
              if (!localidade && viaCepData.localidade) localidade = viaCepData.localidade;
              if (!uf && viaCepData.uf) uf = viaCepData.uf;
            }
          } else {
            await viaCepResponse.text(); // consume body
          }
        }
      } catch (cepErr) {
        console.log('⚠️ Erro ao buscar CEP:', cepErr);
      }
    }
    
    // Se número ainda estiver vazio, usar S/N
    if (!numero) numero = 'S/N';
    
    if (!cep || !logradouro || !bairro || !localidade || !uf) {
      console.error('❌ Dados de endereço incompletos mesmo após fallback:', {
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
      
      // 🔍 BUSCAR ENVIOS ESPECÍFICOS DA SUBFATURA
      // Estratégia: Usar os códigos de etiqueta (codigoObjeto) para buscar emissões e obter o remetente
      console.log('🔍 Buscando envios da subfatura - Código:', codigo_fatura, 'ID:', subfatura_id);
      let detalhesSubfatura: any[] = [];
      const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');
      
      try {
        // ESTRATÉGIA: Usar os códigos de etiqueta da fatura.detalhe para buscar emissões
        // Cada detalhe tem codigoObjeto - buscar emissão pelo código retorna remetenteCpfCnpj
        
        if (fatura.detalhe && Array.isArray(fatura.detalhe) && fatura.detalhe.length > 0) {
          console.log('📋 Total de detalhes na fatura:', fatura.detalhe.length);
          
          // Extrair todos os códigos de objeto
          const codigosObjeto = fatura.detalhe
            .map((item: any) => item.codigoObjeto)
            .filter((codigo: string) => codigo && codigo !== '-');
          
          console.log('📋 Códigos de etiqueta encontrados:', codigosObjeto.length);
          
          // ⚡ OTIMIZAÇÃO: Buscar emissões em PARALELO (muito mais rápido)
          const emissoesFiltradas: any[] = [];
          const BATCH_SIZE = 100; // Maior batch pois são paralelas
          
          // Limitar a 200 códigos para performance
          const codigosLimitados = codigosObjeto.slice(0, 200);
          console.log(`⚡ Buscando ${codigosLimitados.length} emissões em paralelo...`);
          
          // Função para buscar uma emissão
          const buscarEmissao = async (codigoObj: string) => {
            try {
              const emissaoUrl = `${baseApiUrl}/emissoes/admin?codigoObjeto=${codigoObj}`;
              const emissaoResponse = await fetch(emissaoUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiToken}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (emissaoResponse.ok) {
                const emissaoData = await emissaoResponse.json();
                const emissoes = emissaoData.data || emissaoData || [];
                const emissao = Array.isArray(emissoes) ? emissoes[0] : emissoes;
                
                if (emissao && emissao.remetenteCpfCnpj) {
                  const emissaoCpfCnpj = emissao.remetenteCpfCnpj.replace(/\D/g, '');
                  
                  if (emissaoCpfCnpj === cpfCnpjLimpo) {
                    const valorVenda = emissao.valor || emissao.valorVenda || emissao.valorPostagem || '0';
                    return {
                      id: emissao.id,
                      status: emissao.status || 'PENDENTE',
                      nome: emissao.destinatario?.nome || 'Envio',
                      valor: valorVenda,
                      codigoObjeto: emissao.codigoObjeto || codigoObj,
                      criadoEm: emissao.criadoEm,
                    };
                  }
                }
              }
            } catch (err) {
              // Ignora erro individual
            }
            return null;
          };
          
          // Processar em batches paralelos
          for (let i = 0; i < codigosLimitados.length; i += BATCH_SIZE) {
            const lote = codigosLimitados.slice(i, i + BATCH_SIZE);
            console.log(`🔄 Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${lote.length} códigos em paralelo`);
            
            // ⚡ EXECUÇÃO PARALELA - todas as requisições ao mesmo tempo
            const resultados = await Promise.all(lote.map(codigo => buscarEmissao(codigo)));
            
            // Filtrar resultados válidos
            resultados.forEach(r => {
              if (r) emissoesFiltradas.push(r);
            });
          }
          
          detalhesSubfatura = emissoesFiltradas;
          console.log(`✅ Encontradas ${detalhesSubfatura.length} emissões do remetente ${cpfCnpjLimpo}`);
        }
        
        // FALLBACK: Se não encontrou emissões, usar detalhes da fatura
        if (detalhesSubfatura.length === 0 && fatura.detalhe && Array.isArray(fatura.detalhe)) {
          console.log('⚠️ Nenhuma emissão filtrada - usando detalhes da fatura como fallback');
          detalhesSubfatura = fatura.detalhe.map((item: any) => ({
            id: item.id,
            status: item.status || 'PENDENTE',
            nome: item.nome || item.destinatario?.nome || 'Envio',
            valor: item.valor || item.valorVenda || '0',
            codigoObjeto: item.codigoObjeto || '-',
            criadoEm: item.criadoEm,
          }));
          console.log(`📋 Total de envios usados (fallback): ${detalhesSubfatura.length}`);
        }
      } catch (enviosErr) {
        console.log('⚠️ Erro ao buscar envios:', enviosErr);
      }
      
      // Se não conseguiu obter detalhes, usar array vazio com aviso
      if (detalhesSubfatura.length === 0) {
        console.log('⚠️ Nenhum envio encontrado para o remetente, PDF terá tabela vazia');
      }
      
      // Passar o valor da subfatura para o PDF
      const valorParaPdf = valorSubfatura !== null && valorSubfatura > 0 ? valorSubfatura : parseFloat(fatura.totalFaturado);
      console.log('💰 Valor para PDF da subfatura:', valorParaPdf);
      console.log('📊 Total de itens para o PDF:', detalhesSubfatura.length);
      
      faturaPdfBase64 = await gerarPdfFaturaPersonalizado(fatura, pagadorParaPdf, true, valorParaPdf, detalhesSubfatura);
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

    // 🧪 MODO TESTE: Se apenas_pdf=true, retornar apenas o PDF sem emitir boleto
    if (apenas_pdf) {
      console.log('🧪 MODO TESTE - Retornando apenas PDF sem emitir boleto');
      return new Response(
        JSON.stringify({
          status: 'ok',
          mensagem: 'PDF gerado com sucesso (modo teste)',
          nome_cliente: nome_cliente,
          codigo_fatura: codigo_fatura,
          fatura_pdf: faturaPdfBase64,
          boleto_pdf: null,
          boleto_info: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ✅ ETAPA 4: Emitir boleto via Banco Inter
    console.log('💰 Etapa 4: Emitindo boleto...');
    
    // Para SUBFATURAS: usar o valor específico da subfatura, não da fatura pai
    const valorBoleto = isSubfatura && valorSubfatura !== null && valorSubfatura > 0 
      ? valorSubfatura 
      : parseFloat(fatura.totalFaturado);
    
    console.log('💰 Valor do boleto:', valorBoleto, isSubfatura ? '(valor da SUBFATURA)' : '(valor da fatura)');
    
    console.log('📤 Enviando requisição para banco-inter-create-boleto...');
    console.log('📋 Dados do pagador:', {
      nome: clienteData.nome,
      cpfCnpj: cpfCnpj,
      cep: cep
    });
    
    // Adicionar timeout de 60 segundos para evitar trava
    const boletoController = new AbortController();
    const boletoTimeout = setTimeout(() => boletoController.abort(), 60000);
    
    const boletoResponse = await fetch(`${supabaseUrl}/functions/v1/banco-inter-create-boleto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      signal: boletoController.signal,
      body: JSON.stringify({
        faturaId: fatura.id,
        codigoFatura: codigo_fatura,
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
          valor: 10,
        },
        juros: {
          tipo: 'PERCENTUAL_DIA',
          valor: 0.033,
        },
      }),
    });
    
    clearTimeout(boletoTimeout);

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

    // ✅ Salvar fechamento no banco ANTES de responder (garante persistência entre dispositivos)
    try {
      // Verificar se já existe registro para este fechamento
      const existQuery = supabaseAdmin
        .from('fechamentos_fatura')
        .select('id')
        .eq('codigo_fatura', codigo_fatura);
      
      if (subfatura_id) {
        existQuery.eq('subfatura_id', subfatura_id);
      } else {
        existQuery.is('subfatura_id', null);
      }
      
      const { data: existente } = await existQuery.maybeSingle();
      
      const fechamentoPayload = {
        fatura_id: fatura_id,
        subfatura_id: subfatura_id || null,
        codigo_fatura: codigo_fatura,
        nome_cliente: clienteData.nome,
        cpf_cnpj: cpfCnpj,
        boleto_id: boletoData.nossoNumero,
        nosso_numero: boletoData.nossoNumero,
        fatura_pdf: faturaPdfBase64,
        boleto_pdf: boletoPdfBase64,
        status_pagamento: 'PENDENTE',
      };
      
      if (existente) {
        await supabaseAdmin
          .from('fechamentos_fatura')
          .update(fechamentoPayload)
          .eq('id', existente.id);
        console.log('✅ Fechamento atualizado no banco - nossoNumero:', boletoData.nossoNumero);
      } else {
        await supabaseAdmin
          .from('fechamentos_fatura')
          .insert(fechamentoPayload);
        console.log('✅ Fechamento inserido no banco - nossoNumero:', boletoData.nossoNumero);
      }
    } catch (saveError) {
      console.error('❌ Erro ao salvar fechamento no banco:', saveError);
    }

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
