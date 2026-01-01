import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, ArrowLeft, Barcode, Building2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BoletoService } from '../../../../services/BoletoService';
import { ButtonComponent } from '../../../../components/button';
import { CardComponent } from '../../../../components/card';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

// Dados fixos para esta NF específica - BRHUB
const dadosEmitente = {
  razaoSocial: 'BR HUB SOLUCOES E TECNOLOGIAS LTDA',
  nomeFantasia: 'BR HUB',
  cnpj: '56.691.028/0001-77',
  inscricaoEstadual: 'ISENTO',
  endereco: 'Rua Xavantes, 715, Sala 718 Andar 7',
  bairro: 'Brás',
  cidade: 'São Paulo',
  uf: 'SP',
  cep: '03027-000',
  telefone: '(11) 1154-4095',
  email: 'contato@brhubenvios.com.br'
};

const dadosDestinatario = {
  razaoSocial: 'ASSOCIACAO DOS LOJISTAS DO SHOPPING TIJUCA',
  cnpj: '39.893.339/0001-08',
  inscricaoEstadual: 'ISENTO',
  endereco: 'Rua Xavantes, 715, Andar 4',
  bairro: 'Brás',
  cidade: 'São Paulo',
  uf: 'SP',
  cep: '03027-000',
  telefone: '(11) 2886-5858'
};

const itensNota = [
  {
    codigo: '001',
    descricao: 'Rolo 350 metros de rede cabo blindado',
    ncm: '85444900',
    cfop: '5102',
    unidade: 'UN',
    quantidade: 1,
    valorUnitario: 1650.00,
    valorTotal: 1650.00
  },
  {
    codigo: '002',
    descricao: 'Caixa com 70 metros de cabo de rede',
    ncm: '85444900',
    cfop: '5102',
    unidade: 'CX',
    quantidade: 1,
    valorUnitario: 300.00,
    valorTotal: 300.00
  },
  {
    codigo: '003',
    descricao: 'Rack 5u',
    ncm: '85176294',
    cfop: '5102',
    unidade: 'UN',
    quantidade: 1,
    valorUnitario: 250.00,
    valorTotal: 250.00
  }
];

const valorTotalNota = itensNota.reduce((acc, item) => acc + item.valorTotal, 0);

export const GerarNotaFiscal = () => {
  const navigate = useNavigate();
  const [gerando, setGerando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [boletoGerado, setBoletoGerado] = useState<any>(null);
  const notaRef = useRef<HTMLDivElement>(null);

  const dataAtual = new Date();
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
  const horaFormatada = dataAtual.toLocaleTimeString('pt-BR');
  const numeroNF = '0068';
  const serie = '001';
  const chaveAcesso = `3524${dataAtual.getMonth() + 1}${dadosEmitente.cnpj.replace(/\D/g, '')}55${serie}${numeroNF}100000001`;

  const handleGerarBoleto = async () => {
    setGerando(true);
    try {
      const boletoService = new BoletoService();
      
      // Vencimento fixo: 06/01/2026
      const vencimento = new Date(2026, 0, 6); // Janeiro é mês 0

      const boleto = await boletoService.emitir({
        faturaId: `NF-${numeroNF}`,
        valorCobrado: valorTotalNota,
        dataVencimento: vencimento.toISOString().split('T')[0],
        pagadorNome: dadosDestinatario.razaoSocial,
        pagadorCpfCnpj: dadosDestinatario.cnpj.replace(/\D/g, ''),
        pagadorEndereco: {
          logradouro: 'Rua Xavantes',
          numero: '715',
          complemento: 'Andar 4',
          bairro: dadosDestinatario.bairro,
          cidade: dadosDestinatario.cidade,
          uf: dadosDestinatario.uf,
          cep: dadosDestinatario.cep.replace(/\D/g, '')
        },
        mensagem: `Ref. NF ${numeroNF} - Equipamentos de Rede`,
        multa: { tipo: 'PERCENTUAL', valor: 10 },
        juros: { tipo: 'PERCENTUAL_DIA', valor: 0.033 }
      });

      setBoletoGerado(boleto);
      toast.success('Boleto gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar boleto:', error);
      toast.error(error.message || 'Erro ao gerar boleto');
    } finally {
      setGerando(false);
    }
  };

  const handleCancelar = async () => {
    let nossoNumeroParaCancelar = boletoGerado?.nossoNumero;
    
    // Se não tem boleto em memória, perguntar o nossoNumero
    if (!nossoNumeroParaCancelar) {
      nossoNumeroParaCancelar = window.prompt('Digite o Nosso Número do boleto para cancelar:');
      if (!nossoNumeroParaCancelar || nossoNumeroParaCancelar.trim() === '') {
        toast.error('Nosso Número é obrigatório para cancelar');
        return;
      }
    }

    // Confirmar cancelamento
    const confirmar = window.confirm(`Tem certeza que deseja cancelar o boleto ${nossoNumeroParaCancelar}? Esta ação não pode ser desfeita.`);
    if (!confirmar) {
      return;
    }

    setCancelando(true);
    try {
      const boletoService = new BoletoService();
      await boletoService.cancelar(nossoNumeroParaCancelar.trim(), 'OUTROS');
      setBoletoGerado(null);
      toast.success('Boleto e recibo cancelados com sucesso!');
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      toast.error(error.message || 'Erro ao cancelar boleto');
    } finally {
      setCancelando(false);
    }
  };

  const handleDownloadPDF = () => {
    if (boletoGerado?.pdf) {
      const linkSource = `data:application/pdf;base64,${boletoGerado.pdf}`;
      const downloadLink = document.createElement('a');
      downloadLink.href = linkSource;
      downloadLink.download = `Boleto_NF_${numeroNF}.pdf`;
      downloadLink.click();
      toast.success('Boleto baixado!');
    }
  };

  const handleImprimir = async () => {
    if (!boletoGerado?.pdf) {
      // Se não tem boleto, só imprime a DANFE
      window.print();
      return;
    }

    try {
      toast.info('Gerando PDF completo...');
      
      // 1. Gerar PDF da DANFE usando html2canvas
      const danfeElement = notaRef.current;
      if (!danfeElement) {
        toast.error('Elemento DANFE não encontrado');
        return;
      }

      const canvas = await html2canvas(danfeElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const danfePdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      danfePdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // 2. Converter DANFE para bytes
      const danfeBytes = danfePdf.output('arraybuffer');
      
      // 3. Carregar boleto PDF
      const boletoBytes = Uint8Array.from(atob(boletoGerado.pdf), c => c.charCodeAt(0));
      
      // 4. Merge PDFs usando pdf-lib
      const mergedPdf = await PDFDocument.create();
      
      const danfeDoc = await PDFDocument.load(danfeBytes);
      const boletoDoc = await PDFDocument.load(boletoBytes);
      
      const danfePages = await mergedPdf.copyPages(danfeDoc, danfeDoc.getPageIndices());
      const boletoPages = await mergedPdf.copyPages(boletoDoc, boletoDoc.getPageIndices());
      
      danfePages.forEach(page => mergedPdf.addPage(page));
      boletoPages.forEach(page => mergedPdf.addPage(page));
      
      // 5. Salvar e baixar
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `NF_${numeroNF}_com_Boleto.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('PDF completo baixado!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tentando impressão simples...');
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
      {/* Header com ações */}
      <div className="max-w-[210mm] mx-auto mb-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto justify-end">
            <ButtonComponent onClick={handleImprimir} variant="ghost" border="outline" className="text-xs sm:text-sm">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{boletoGerado ? 'Baixar NF + Boleto' : 'Imprimir'}</span>
              <span className="sm:hidden">{boletoGerado ? 'Baixar' : 'Imprimir'}</span>
            </ButtonComponent>
            <ButtonComponent 
              onClick={handleGerarBoleto} 
              disabled={gerando || boletoGerado}
              variant="primary"
              className="text-xs sm:text-sm"
            >
              <Barcode className="w-4 h-4" />
              <span className="hidden sm:inline">{gerando ? 'Gerando...' : boletoGerado ? 'Boleto Gerado' : 'Gerar Boleto Inter'}</span>
              <span className="sm:hidden">{gerando ? 'Gerando...' : boletoGerado ? 'Gerado' : 'Gerar Boleto'}</span>
            </ButtonComponent>
            {boletoGerado && (
              <ButtonComponent onClick={handleDownloadPDF} variant="secondary" className="text-xs sm:text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar Boleto PDF</span>
                <span className="sm:hidden">Boleto</span>
              </ButtonComponent>
            )}
            <ButtonComponent 
              onClick={handleCancelar} 
              disabled={cancelando}
              variant="ghost"
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
              border="outline"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">{cancelando ? 'Cancelando...' : 'Cancelar Boleto e Recibo'}</span>
              <span className="sm:hidden">{cancelando ? 'Cancelando...' : 'Cancelar'}</span>
            </ButtonComponent>
          </div>
        </div>
      </div>

      {/* DANFE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none"
        ref={notaRef}
      >
        {/* Canhoto */}
        <div className="border border-black p-2 text-xs">
          <div className="flex justify-between">
            <div className="flex-1">
              <p className="font-bold text-[10px]">Recebemos de {dadosEmitente.razaoSocial}</p>
              <p className="text-[9px]">os produtos e/ou serviços constantes do Recibo indicado ao lado.</p>
            </div>
            <div className="border-l border-black pl-2 text-right">
              <p className="font-bold">RECIBO</p>
              <p>Nº {numeroNF}</p>
              <p>Série {serie}</p>
            </div>
          </div>
          <div className="flex mt-2 border-t border-black pt-1">
            <div className="flex-1 border-r border-black pr-2">
              <p className="text-[8px]">DATA DO RECEBIMENTO</p>
            </div>
            <div className="flex-1 pl-2">
              <p className="text-[8px]">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</p>
            </div>
          </div>
        </div>

        {/* Linha pontilhada de corte */}
        <div className="border-b-2 border-dashed border-gray-400 my-1"></div>

        {/* Cabeçalho DANFE */}
        <div className="border border-black">
          <div className="flex">
            {/* Logo e dados emitente */}
            <div className="flex-1 border-r border-black p-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-500 rounded flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">{dadosEmitente.razaoSocial}</p>
                  <p className="text-xs">{dadosEmitente.endereco}</p>
                  <p className="text-xs">{dadosEmitente.bairro} - {dadosEmitente.cidade}/{dadosEmitente.uf}</p>
                  <p className="text-xs">CEP: {dadosEmitente.cep} - Tel: {dadosEmitente.telefone}</p>
                </div>
              </div>
            </div>

            {/* DANFE */}
            <div className="w-32 border-r border-black p-2 text-center">
              <p className="font-bold text-xl">RECIBO</p>
              <p className="text-[8px]">Documento de</p>
              <p className="text-[8px]">Comprovação</p>
              <div className="mt-2 flex justify-center gap-2 text-xs">
                <span>0 - ENTRADA</span>
              </div>
              <div className="flex justify-center gap-2 text-xs">
                <span className="font-bold border border-black px-2">1</span>
                <span>1 - SAÍDA</span>
              </div>
              <p className="mt-2 text-xs font-bold">Nº {numeroNF}</p>
              <p className="text-xs">Série {serie}</p>
              <p className="text-xs">Folha 1/1</p>
            </div>

            {/* Código de barras e chave */}
            <div className="flex-1 p-2">
              <div className="border border-black p-2 h-12 flex items-center justify-center bg-gray-100">
                <div className="flex gap-[2px]">
                  {[...Array(44)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-8 ${i % 3 === 0 ? 'w-[3px]' : 'w-[1px]'} bg-black`}
                    ></div>
                  ))}
                </div>
              </div>
              <p className="text-[8px] mt-1 text-center font-mono break-all">
                CÓDIGO DE VERIFICAÇÃO
              </p>
              <p className="text-[7px] text-center font-mono break-all">
                {chaveAcesso.replace(/(.{4})/g, '$1 ')}
              </p>
              <p className="text-[7px] mt-1 text-center">
                Documento sem valor fiscal
              </p>
            </div>
          </div>

          {/* Natureza da operação */}
          <div className="border-t border-black flex text-xs">
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">NATUREZA DA OPERAÇÃO</p>
              <p className="font-bold">VENDA DE MERCADORIA</p>
            </div>
            <div className="flex-1 p-1">
              <p className="text-[8px] text-gray-600">PROTOCOLO DE AUTORIZAÇÃO DE USO</p>
              <p className="font-mono text-[10px]">1352403570{numeroNF} {dataFormatada} {horaFormatada}</p>
            </div>
          </div>

          {/* IE */}
          <div className="border-t border-black flex text-xs">
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">INSCRIÇÃO ESTADUAL</p>
              <p>{dadosEmitente.inscricaoEstadual}</p>
            </div>
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO</p>
              <p>-</p>
            </div>
            <div className="flex-1 p-1">
              <p className="text-[8px] text-gray-600">CNPJ</p>
              <p>{dadosEmitente.cnpj}</p>
            </div>
          </div>
        </div>

        {/* Destinatário */}
        <div className="border border-black border-t-0 text-xs">
          <div className="bg-gray-200 p-1 font-bold text-[10px]">DESTINATÁRIO / REMETENTE</div>
          <div className="flex">
            <div className="flex-[2] border-r border-black p-1">
              <p className="text-[8px] text-gray-600">NOME / RAZÃO SOCIAL</p>
              <p className="font-bold">{dadosDestinatario.razaoSocial}</p>
            </div>
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">CNPJ / CPF</p>
              <p>{dadosDestinatario.cnpj}</p>
            </div>
            <div className="w-28 p-1">
              <p className="text-[8px] text-gray-600">DATA DA EMISSÃO</p>
              <p>{dataFormatada}</p>
            </div>
          </div>
          <div className="flex border-t border-black">
            <div className="flex-[2] border-r border-black p-1">
              <p className="text-[8px] text-gray-600">ENDEREÇO</p>
              <p>{dadosDestinatario.endereco}</p>
            </div>
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">BAIRRO / DISTRITO</p>
              <p>{dadosDestinatario.bairro}</p>
            </div>
            <div className="w-28 p-1">
              <p className="text-[8px] text-gray-600">CEP</p>
              <p>{dadosDestinatario.cep}</p>
            </div>
          </div>
          <div className="flex border-t border-black">
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">MUNICÍPIO</p>
              <p>{dadosDestinatario.cidade}</p>
            </div>
            <div className="w-16 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">UF</p>
              <p>{dadosDestinatario.uf}</p>
            </div>
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">TELEFONE / FAX</p>
              <p>{dadosDestinatario.telefone}</p>
            </div>
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">INSCRIÇÃO ESTADUAL</p>
              <p>{dadosDestinatario.inscricaoEstadual}</p>
            </div>
            <div className="w-28 p-1">
              <p className="text-[8px] text-gray-600">DATA DA SAÍDA</p>
              <p>{dataFormatada}</p>
            </div>
          </div>
        </div>

        {/* Cálculo do imposto */}
        <div className="border border-black border-t-0 text-xs">
          <div className="bg-gray-200 p-1 font-bold text-[10px]">CÁLCULO DO IMPOSTO</div>
          <div className="flex">
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">BASE DE CÁLCULO DO ICMS</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">VALOR DO ICMS</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">BASE DE CÁLCULO DO ICMS SUBST.</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">VALOR DO ICMS SUBST.</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 p-1 text-center">
              <p className="text-[8px] text-gray-600">VALOR TOTAL DOS PRODUTOS</p>
              <p className="font-bold">{valorTotalNota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
          <div className="flex border-t border-black">
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">VALOR DO FRETE</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">VALOR DO SEGURO</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">DESCONTO</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">OUTRAS DESPESAS</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">VALOR DO IPI</p>
              <p>0,00</p>
            </div>
            <div className="flex-1 p-1 text-center">
              <p className="text-[8px] text-gray-600">VALOR TOTAL DO RECIBO</p>
              <p className="font-bold">{valorTotalNota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
        </div>

        {/* Transportador */}
        <div className="border border-black border-t-0 text-xs">
          <div className="bg-gray-200 p-1 font-bold text-[10px]">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
          <div className="flex">
            <div className="flex-[2] border-r border-black p-1">
              <p className="text-[8px] text-gray-600">NOME / RAZÃO SOCIAL</p>
              <p>A COMBINAR</p>
            </div>
            <div className="w-32 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">FRETE POR CONTA</p>
              <p>0 - EMITENTE</p>
            </div>
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">CÓDIGO ANTT</p>
              <p>-</p>
            </div>
            <div className="flex-1 border-r border-black p-1">
              <p className="text-[8px] text-gray-600">PLACA DO VEÍCULO</p>
              <p>-</p>
            </div>
            <div className="w-12 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">UF</p>
              <p>-</p>
            </div>
            <div className="flex-1 p-1">
              <p className="text-[8px] text-gray-600">CNPJ / CPF</p>
              <p>-</p>
            </div>
          </div>
          <div className="flex border-t border-black">
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">QUANTIDADE</p>
              <p>{itensNota.reduce((acc, item) => acc + item.quantidade, 0)}</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">ESPÉCIE</p>
              <p>VOLUMES</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">MARCA</p>
              <p>-</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">NUMERAÇÃO</p>
              <p>-</p>
            </div>
            <div className="flex-1 border-r border-black p-1 text-center">
              <p className="text-[8px] text-gray-600">PESO BRUTO</p>
              <p>15,00 kg</p>
            </div>
            <div className="flex-1 p-1 text-center">
              <p className="text-[8px] text-gray-600">PESO LÍQUIDO</p>
              <p>14,50 kg</p>
            </div>
          </div>
        </div>

        {/* Dados dos produtos */}
        <div className="border border-black border-t-0 text-xs">
          <div className="bg-gray-200 p-1 font-bold text-[10px]">DADOS DOS PRODUTOS / SERVIÇOS</div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-black bg-gray-50">
                <th className="p-1 text-[8px] border-r border-black">CÓDIGO</th>
                <th className="p-1 text-[8px] border-r border-black text-left">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                <th className="p-1 text-[8px] border-r border-black">NCM/SH</th>
                <th className="p-1 text-[8px] border-r border-black">CFOP</th>
                <th className="p-1 text-[8px] border-r border-black">UNID.</th>
                <th className="p-1 text-[8px] border-r border-black">QTDE.</th>
                <th className="p-1 text-[8px] border-r border-black">VALOR UNIT.</th>
                <th className="p-1 text-[8px]">VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {itensNota.map((item, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="p-1 text-center border-r border-black">{item.codigo}</td>
                  <td className="p-1 border-r border-black">{item.descricao}</td>
                  <td className="p-1 text-center border-r border-black">{item.ncm}</td>
                  <td className="p-1 text-center border-r border-black">{item.cfop}</td>
                  <td className="p-1 text-center border-r border-black">{item.unidade}</td>
                  <td className="p-1 text-center border-r border-black">{item.quantidade.toFixed(3)}</td>
                  <td className="p-1 text-right border-r border-black">{item.valorUnitario.toFixed(2)}</td>
                  <td className="p-1 text-right font-bold">{item.valorTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dados adicionais */}
        <div className="border border-black border-t-0 text-xs">
          <div className="bg-gray-200 p-1 font-bold text-[10px]">DADOS ADICIONAIS</div>
          <div className="flex">
            <div className="flex-1 border-r border-black p-2 min-h-[60px]">
              <p className="text-[8px] text-gray-600">INFORMAÇÕES COMPLEMENTARES</p>
              <p className="text-[9px]">
                Documento sem valor fiscal - apenas para fins de comprovação de pagamento.<br />
                RECIBO: #{numeroNF} | EMITENTE: BRHUB ENVIOS
              </p>
            </div>
            <div className="w-48 p-2">
              <p className="text-[8px] text-gray-600">RESERVADO AO FISCO</p>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-[8px] text-gray-500 mt-2 flex justify-between px-2 pb-2">
          <span>DATA E HORA DA IMPRESSÃO: {dataFormatada} {horaFormatada}</span>
          <span>BRHUB Envios - Sistema de Gestão</span>
        </div>
      </motion.div>

      {/* Boleto gerado - Info (não imprime) */}
      {boletoGerado && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[210mm] mx-auto mt-6 print:hidden"
        >
          <CardComponent>
            <div className="w-full">
              <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-4">
                <Barcode className="w-5 h-5" />
                Boleto Banco Inter Gerado
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Nosso Número:</p>
                  <p className="font-mono font-bold">{boletoGerado.nossoNumero}</p>
                </div>
                <div>
                  <p className="text-gray-600">Vencimento:</p>
                  <p className="font-bold">{new Date(boletoGerado.dataVencimento).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Valor:</p>
                  <p className="font-bold text-green-700">
                    {valorTotalNota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Status:</p>
                  <p className="font-bold text-green-700">{boletoGerado.status}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-gray-600 text-sm mb-1">Linha Digitável:</p>
                <p className="font-mono text-xs bg-gray-100 p-2 rounded border break-all">
                  {boletoGerado.linhaDigitavel}
                </p>
              </div>
            </div>
          </CardComponent>
        </motion.div>
      )}

      {/* Boleto PDF para impressão - quebra de página antes */}
      {boletoGerado?.pdf && (
        <div className="print:block hidden page-break-before">
          <iframe
            src={`data:application/pdf;base64,${boletoGerado.pdf}`}
            className="w-full h-[297mm] max-w-[210mm] mx-auto"
            title="Boleto Banco Inter"
          />
        </div>
      )}
    </div>
  );
};

export default GerarNotaFiscal;
