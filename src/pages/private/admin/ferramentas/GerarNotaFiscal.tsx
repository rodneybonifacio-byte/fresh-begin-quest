import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, ArrowLeft, Barcode, X, FileText, Wrench, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BoletoService } from '../../../../services/BoletoService';
import { ButtonComponent } from '../../../../components/button';
import { CardComponent } from '../../../../components/card';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

// Dados fixos do emitente - BRHUB
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

// Tipos
interface DadosDestinatario {
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
}

interface ItemNota {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

// Chaves de localStorage
const STORAGE_KEYS = {
  SERVICO_NUMERO: 'recibo_servico_numero',
  VENDA_NUMERO: 'recibo_venda_numero'
};

// Componente do Formulário de Destinatário
const FormularioDestinatario = ({ 
  dados, 
  onChange 
}: { 
  dados: DadosDestinatario; 
  onChange: (dados: DadosDestinatario) => void;
}) => {
  const handleChange = (field: keyof DadosDestinatario, value: string) => {
    onChange({ ...dados, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
      <div className="lg:col-span-2">
        <label className="text-xs text-gray-600 block mb-1">Razão Social / Nome</label>
        <input
          type="text"
          value={dados.razaoSocial}
          onChange={(e) => handleChange('razaoSocial', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Nome do cliente"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">CNPJ / CPF</label>
        <input
          type="text"
          value={dados.cnpj}
          onChange={(e) => handleChange('cnpj', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="00.000.000/0000-00"
        />
      </div>
      <div className="lg:col-span-2">
        <label className="text-xs text-gray-600 block mb-1">Endereço</label>
        <input
          type="text"
          value={dados.endereco}
          onChange={(e) => handleChange('endereco', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Rua, Avenida..."
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Número</label>
          <input
            type="text"
            value={dados.numero}
            onChange={(e) => handleChange('numero', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="123"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">Complemento</label>
          <input
            type="text"
            value={dados.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Sala, Apto..."
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Bairro</label>
        <input
          type="text"
          value={dados.bairro}
          onChange={(e) => handleChange('bairro', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Bairro"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Cidade</label>
        <input
          type="text"
          value={dados.cidade}
          onChange={(e) => handleChange('cidade', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Cidade"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 block mb-1">UF</label>
          <input
            type="text"
            value={dados.uf}
            onChange={(e) => handleChange('uf', e.target.value.toUpperCase())}
            maxLength={2}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="SP"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">CEP</label>
          <input
            type="text"
            value={dados.cep}
            onChange={(e) => handleChange('cep', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="00000-000"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Telefone</label>
        <input
          type="text"
          value={dados.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="(00) 00000-0000"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Email</label>
        <input
          type="email"
          value={dados.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="email@exemplo.com"
        />
      </div>
    </div>
  );
};

// Componente para Item da Nota
const FormularioItem = ({ 
  item, 
  onChange,
  tipo 
}: { 
  item: ItemNota; 
  onChange: (item: ItemNota) => void;
  tipo: 'servico' | 'venda';
}) => {
  const handleChange = (field: keyof ItemNota, value: string | number) => {
    const newItem = { ...item, [field]: value };
    if (field === 'quantidade' || field === 'valorUnitario') {
      newItem.valorTotal = Number(newItem.quantidade) * Number(newItem.valorUnitario);
    }
    onChange(newItem);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-blue-50 rounded-lg">
      <div className="lg:col-span-4">
        <label className="text-xs text-gray-600 block mb-1">
          {tipo === 'servico' ? 'Descrição do Serviço' : 'Descrição do Produto'}
        </label>
        <textarea
          value={item.descricao}
          onChange={(e) => handleChange('descricao', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          rows={2}
          placeholder={tipo === 'servico' ? 'Descrição detalhada do serviço...' : 'Descrição do produto...'}
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Quantidade</label>
        <input
          type="number"
          value={item.quantidade}
          onChange={(e) => handleChange('quantidade', parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          min="1"
          step="1"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Valor Unitário (R$)</label>
        <input
          type="number"
          value={item.valorUnitario}
          onChange={(e) => handleChange('valorUnitario', parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border rounded-md text-sm"
          min="0"
          step="0.01"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Valor Total (R$)</label>
        <input
          type="text"
          value={item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          className="w-full px-3 py-2 border rounded-md text-sm bg-gray-100"
          readOnly
        />
      </div>
      <div>
        <label className="text-xs text-gray-600 block mb-1">Unidade</label>
        <select
          value={item.unidade}
          onChange={(e) => handleChange('unidade', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="SV">SV - Serviço</option>
          <option value="UN">UN - Unidade</option>
          <option value="CX">CX - Caixa</option>
          <option value="PCT">PCT - Pacote</option>
          <option value="M">M - Metro</option>
          <option value="KG">KG - Quilograma</option>
        </select>
      </div>
    </div>
  );
};

// Componente para Data de Vencimento
const FormularioVencimento = ({ 
  dataVencimento, 
  onChange 
}: { 
  dataVencimento: string; 
  onChange: (data: string) => void;
}) => {
  return (
    <div className="p-4 bg-green-50 rounded-lg">
      <label className="text-xs text-gray-600 block mb-1">Data de Vencimento do Boleto</label>
      <input
        type="date"
        value={dataVencimento}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-md text-sm max-w-xs"
      />
    </div>
  );
};

export const GerarNotaFiscal = () => {
  const navigate = useNavigate();
  const [tipoRecibo, setTipoRecibo] = useState<'servico' | 'venda'>('servico');
  const [gerando, setGerando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [boletoGerado, setBoletoGerado] = useState<any>(null);
  const notaRef = useRef<HTMLDivElement>(null);

  // Numeração dos recibos
  const [numeroServico, setNumeroServico] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SERVICO_NUMERO);
    return saved ? parseInt(saved) : 231;
  });
  const [numeroVenda, setNumeroVenda] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VENDA_NUMERO);
    return saved ? parseInt(saved) : 1;
  });

  // Dados do formulário - Serviço
  const [destinatarioServico, setDestinatarioServico] = useState<DadosDestinatario>({
    razaoSocial: 'ASSOCIACAO DOS LOJISTAS DO SHOPPING TIJUCA',
    cnpj: '39.893.339/0001-08',
    inscricaoEstadual: 'ISENTO',
    endereco: 'Rua Xavantes, 715',
    numero: '715',
    complemento: 'Andar 4',
    bairro: 'Brás',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '03027-000',
    telefone: '(11) 2886-5858',
    email: ''
  });

  const [itemServico, setItemServico] = useState<ItemNota>({
    codigo: '001',
    descricao: 'Serviços técnicos - Crimpagem, conexões, identificar cabos, instalação de Switches',
    ncm: '99990000',
    cfop: '5933',
    unidade: 'SV',
    quantidade: 1,
    valorUnitario: 1250.00,
    valorTotal: 1250.00
  });

  const [vencimentoServico, setVencimentoServico] = useState('2026-01-21');

  // Dados do formulário - Venda
  const [destinatarioVenda, setDestinatarioVenda] = useState<DadosDestinatario>({
    razaoSocial: '',
    cnpj: '',
    inscricaoEstadual: 'ISENTO',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    telefone: '',
    email: ''
  });

  const [itemVenda, setItemVenda] = useState<ItemNota>({
    codigo: '001',
    descricao: '',
    ncm: '85444900',
    cfop: '5102',
    unidade: 'UN',
    quantidade: 1,
    valorUnitario: 0,
    valorTotal: 0
  });

  const [vencimentoVenda, setVencimentoVenda] = useState(() => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    return amanha.toISOString().split('T')[0];
  });

  // Dados atuais baseados no tipo selecionado
  const numeroRecibo = tipoRecibo === 'servico' ? numeroServico : numeroVenda;
  const numeroReciboFormatado = String(numeroRecibo).padStart(4, '0');
  const destinatario = tipoRecibo === 'servico' ? destinatarioServico : destinatarioVenda;
  const item = tipoRecibo === 'servico' ? itemServico : itemVenda;
  const vencimento = tipoRecibo === 'servico' ? vencimentoServico : vencimentoVenda;
  
  const dataAtual = new Date();
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
  const horaFormatada = dataAtual.toLocaleTimeString('pt-BR');
  const serie = tipoRecibo === 'servico' ? 'SV1' : 'VD1';

  const handleGerarBoleto = async () => {
    if (!destinatario.razaoSocial || !destinatario.cnpj) {
      toast.error('Preencha o nome e CPF/CNPJ do cliente');
      return;
    }
    if (!item.descricao || item.valorTotal <= 0) {
      toast.error('Preencha a descrição e valor do item');
      return;
    }

    setGerando(true);
    try {
      const boletoService = new BoletoService();
      
      const vencimentoDate = new Date(vencimento + 'T12:00:00');

      const boleto = await boletoService.emitir({
        faturaId: `REC-${tipoRecibo.toUpperCase()}-${numeroReciboFormatado}`,
        valorCobrado: item.valorTotal,
        dataVencimento: vencimentoDate.toISOString().split('T')[0],
        pagadorNome: destinatario.razaoSocial,
        pagadorCpfCnpj: destinatario.cnpj.replace(/\D/g, ''),
        pagadorEndereco: {
          logradouro: destinatario.endereco,
          numero: destinatario.numero || 'S/N',
          complemento: destinatario.complemento,
          bairro: destinatario.bairro,
          cidade: destinatario.cidade,
          uf: destinatario.uf,
          cep: destinatario.cep.replace(/\D/g, '')
        },
        mensagem: `Ref. RECIBO ${tipoRecibo.toUpperCase()} ${numeroReciboFormatado} - ${item.descricao.substring(0, 50)}`,
        multa: { tipo: 'PERCENTUAL', valor: 10 },
        juros: { tipo: 'PERCENTUAL_DIA', valor: 0.033 }
      });

      setBoletoGerado(boleto);
      
      // Incrementar numeração e salvar
      if (tipoRecibo === 'servico') {
        const novoNumero = numeroServico + 1;
        setNumeroServico(novoNumero);
        localStorage.setItem(STORAGE_KEYS.SERVICO_NUMERO, String(novoNumero));
      } else {
        const novoNumero = numeroVenda + 1;
        setNumeroVenda(novoNumero);
        localStorage.setItem(STORAGE_KEYS.VENDA_NUMERO, String(novoNumero));
      }
      
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
    
    if (!nossoNumeroParaCancelar) {
      nossoNumeroParaCancelar = window.prompt('Digite o Nosso Número do boleto para cancelar:');
      if (!nossoNumeroParaCancelar || nossoNumeroParaCancelar.trim() === '') {
        toast.error('Nosso Número é obrigatório para cancelar');
        return;
      }
    }

    const confirmar = window.confirm(`Tem certeza que deseja cancelar o boleto ${nossoNumeroParaCancelar}? Esta ação não pode ser desfeita.`);
    if (!confirmar) return;

    setCancelando(true);
    try {
      const boletoService = new BoletoService();
      await boletoService.cancelar(nossoNumeroParaCancelar.trim(), 'OUTROS');
      setBoletoGerado(null);
      toast.success('Boleto cancelado com sucesso!');
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
      downloadLink.download = `Boleto_RECIBO_${tipoRecibo.toUpperCase()}_${numeroReciboFormatado}.pdf`;
      downloadLink.click();
      toast.success('Boleto baixado!');
    }
  };

  const handleImprimir = async () => {
    if (!boletoGerado?.pdf) {
      window.print();
      return;
    }

    try {
      toast.info('Gerando PDF completo...');
      
      const danfeElement = notaRef.current;
      if (!danfeElement) {
        toast.error('Elemento Recibo não encontrado');
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
      
      const danfeBytes = danfePdf.output('arraybuffer');
      const boletoBytes = Uint8Array.from(atob(boletoGerado.pdf), c => c.charCodeAt(0));
      
      const mergedPdf = await PDFDocument.create();
      
      const danfeDoc = await PDFDocument.load(danfeBytes);
      const boletoDoc = await PDFDocument.load(boletoBytes);
      
      const danfePages = await mergedPdf.copyPages(danfeDoc, danfeDoc.getPageIndices());
      const boletoPages = await mergedPdf.copyPages(boletoDoc, boletoDoc.getPageIndices());
      
      danfePages.forEach(page => mergedPdf.addPage(page));
      boletoPages.forEach(page => mergedPdf.addPage(page));
      
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `RECIBO_${tipoRecibo.toUpperCase()}_${numeroReciboFormatado}_com_Boleto.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('PDF completo baixado!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tentando impressão simples...');
      window.print();
    }
  };

  const handleNovoRecibo = () => {
    setBoletoGerado(null);
    if (tipoRecibo === 'venda') {
      setDestinatarioVenda({
        razaoSocial: '',
        cnpj: '',
        inscricaoEstadual: 'ISENTO',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
        telefone: '',
        email: ''
      });
      setItemVenda({
        codigo: '001',
        descricao: '',
        ncm: '85444900',
        cfop: '5102',
        unidade: 'UN',
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0
      });
    }
    toast.info('Pronto para novo recibo');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 print:p-0 print:bg-white">
      {/* Header com ações */}
      <div className="max-w-6xl mx-auto mb-4 print:hidden">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h1 className="text-xl font-bold text-gray-800">Gerador de Recibos</h1>
          </div>

          {/* Tabs de tipo */}
          <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm">
            <button
              onClick={() => { setTipoRecibo('servico'); setBoletoGerado(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                tipoRecibo === 'servico' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Wrench className="w-5 h-5" />
              Recibo de Serviço
            </button>
            <button
              onClick={() => { setTipoRecibo('venda'); setBoletoGerado(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                tipoRecibo === 'venda' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              Recibo de Venda
            </button>
          </div>

          {/* Formulário */}
          <CardComponent>
            <div className="w-full space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                <FileText className="w-5 h-5" />
                {tipoRecibo === 'servico' ? 'Recibo de Serviço' : 'Recibo de Venda'} #{numeroReciboFormatado}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Dados do Cliente</h3>
                <FormularioDestinatario
                  dados={tipoRecibo === 'servico' ? destinatarioServico : destinatarioVenda}
                  onChange={tipoRecibo === 'servico' ? setDestinatarioServico : setDestinatarioVenda}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  {tipoRecibo === 'servico' ? 'Dados do Serviço' : 'Dados do Produto'}
                </h3>
                <FormularioItem
                  item={tipoRecibo === 'servico' ? itemServico : itemVenda}
                  onChange={tipoRecibo === 'servico' ? setItemServico : setItemVenda}
                  tipo={tipoRecibo}
                />
              </div>

              <FormularioVencimento
                dataVencimento={tipoRecibo === 'servico' ? vencimentoServico : vencimentoVenda}
                onChange={tipoRecibo === 'servico' ? setVencimentoServico : setVencimentoVenda}
              />

              {/* Botões de ação */}
              <div className="flex gap-2 flex-wrap pt-4 border-t">
                <ButtonComponent onClick={handleImprimir} variant="ghost" border="outline" className="text-xs sm:text-sm">
                  <Printer className="w-4 h-4" />
                  {boletoGerado ? 'Baixar Recibo + Boleto' : 'Imprimir Recibo'}
                </ButtonComponent>
                <ButtonComponent 
                  onClick={handleGerarBoleto} 
                  disabled={gerando || boletoGerado}
                  variant="primary"
                  className="text-xs sm:text-sm"
                >
                  <Barcode className="w-4 h-4" />
                  {gerando ? 'Gerando...' : boletoGerado ? 'Boleto Gerado' : 'Gerar Recibo + Boleto'}
                </ButtonComponent>
                {boletoGerado && (
                  <>
                    <ButtonComponent onClick={handleDownloadPDF} variant="secondary" className="text-xs sm:text-sm">
                      <Download className="w-4 h-4" />
                      Baixar Boleto PDF
                    </ButtonComponent>
                    <ButtonComponent onClick={handleNovoRecibo} variant="ghost" className="text-xs sm:text-sm">
                      <FileText className="w-4 h-4" />
                      Novo Recibo
                    </ButtonComponent>
                  </>
                )}
                <ButtonComponent 
                  onClick={handleCancelar} 
                  disabled={cancelando}
                  variant="ghost"
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                  border="outline"
                >
                  <X className="w-4 h-4" />
                  {cancelando ? 'Cancelando...' : 'Cancelar Boleto'}
                </ButtonComponent>
              </div>
            </div>
          </CardComponent>
        </div>
      </div>

      {/* Preview do Recibo */}
      <div className="overflow-x-auto print:overflow-visible">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-[210mm] min-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none"
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
                <p className="font-bold">{tipoRecibo === 'servico' ? 'SERVIÇO' : 'VENDA'}</p>
                <p>Nº {numeroReciboFormatado}</p>
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

          {/* Cabeçalho */}
          <div className="border border-black">
            <div className="flex">
              {/* Logo e dados emitente */}
              <div className="flex-1 border-r border-black p-2">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 ${tipoRecibo === 'servico' ? 'bg-blue-600' : 'bg-green-600'} rounded flex items-center justify-center`}>
                    {tipoRecibo === 'servico' ? (
                      <Wrench className="w-8 h-8 text-white" />
                    ) : (
                      <ShoppingCart className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{dadosEmitente.razaoSocial}</p>
                    <p className="text-xs">{dadosEmitente.endereco}</p>
                    <p className="text-xs">{dadosEmitente.bairro} - {dadosEmitente.cidade}/{dadosEmitente.uf}</p>
                    <p className="text-xs">CEP: {dadosEmitente.cep} - Tel: {dadosEmitente.telefone}</p>
                  </div>
                </div>
              </div>

              {/* Tipo de Recibo */}
              <div className="w-40 border-r border-black p-2 text-center">
                <p className={`font-bold text-xl ${tipoRecibo === 'servico' ? 'text-blue-700' : 'text-green-700'}`}>
                  RECIBO
                </p>
                <p className={`font-bold text-sm ${tipoRecibo === 'servico' ? 'text-blue-600' : 'text-green-600'}`}>
                  {tipoRecibo === 'servico' ? 'DE SERVIÇO' : 'DE VENDA'}
                </p>
                <div className="mt-2 text-xs">
                  <p className="font-bold">Nº {numeroReciboFormatado}</p>
                  <p>Série {serie}</p>
                </div>
              </div>

              {/* Código de verificação */}
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
                <p className="text-[8px] mt-1 text-center font-mono">
                  CÓDIGO DE VERIFICAÇÃO
                </p>
                <p className="text-[7px] text-center">
                  Documento sem valor fiscal - Comprovante de pagamento
                </p>
              </div>
            </div>

            {/* Natureza */}
            <div className="border-t border-black flex text-xs">
              <div className="flex-1 border-r border-black p-1">
                <p className="text-[8px] text-gray-600">NATUREZA DA OPERAÇÃO</p>
                <p className="font-bold">{tipoRecibo === 'servico' ? 'PRESTAÇÃO DE SERVIÇO' : 'VENDA DE MERCADORIA'}</p>
              </div>
              <div className="flex-1 p-1">
                <p className="text-[8px] text-gray-600">DATA DE EMISSÃO</p>
                <p className="font-mono text-[10px]">{dataFormatada} {horaFormatada}</p>
              </div>
            </div>

            {/* CNPJ */}
            <div className="border-t border-black flex text-xs">
              <div className="flex-1 border-r border-black p-1">
                <p className="text-[8px] text-gray-600">CNPJ DO PRESTADOR</p>
                <p>{dadosEmitente.cnpj}</p>
              </div>
              <div className="flex-1 border-r border-black p-1">
                <p className="text-[8px] text-gray-600">INSCRIÇÃO MUNICIPAL</p>
                <p>-</p>
              </div>
              <div className="flex-1 p-1">
                <p className="text-[8px] text-gray-600">EMAIL</p>
                <p>{dadosEmitente.email}</p>
              </div>
            </div>
          </div>

          {/* Tomador do Serviço / Destinatário */}
          <div className="border border-black border-t-0 text-xs">
            <div className={`${tipoRecibo === 'servico' ? 'bg-blue-100' : 'bg-green-100'} p-1 font-bold text-[10px]`}>
              {tipoRecibo === 'servico' ? 'TOMADOR DE SERVIÇOS' : 'DESTINATÁRIO / COMPRADOR'}
            </div>
            <div className="flex">
              <div className="flex-[2] border-r border-black p-1">
                <p className="text-[8px] text-gray-600">NOME / RAZÃO SOCIAL</p>
                <p className="font-bold">{destinatario.razaoSocial || '-'}</p>
              </div>
              <div className="flex-1 border-r border-black p-1">
                <p className="text-[8px] text-gray-600">CNPJ / CPF</p>
                <p>{destinatario.cnpj || '-'}</p>
              </div>
              <div className="w-28 p-1">
                <p className="text-[8px] text-gray-600">DATA</p>
                <p>{dataFormatada}</p>
              </div>
            </div>
            <div className="flex border-t border-black">
              <div className="flex-[2] border-r border-black p-1">
                <p className="text-[8px] text-gray-600">ENDEREÇO</p>
                <p>{destinatario.endereco ? `${destinatario.endereco}, ${destinatario.numero} ${destinatario.complemento}`.trim() : '-'}</p>
              </div>
              <div className="flex-1 border-r border-black p-1">
                <p className="text-[8px] text-gray-600">BAIRRO</p>
                <p>{destinatario.bairro || '-'}</p>
              </div>
              <div className="w-28 p-1">
                <p className="text-[8px] text-gray-600">CEP</p>
                <p>{destinatario.cep || '-'}</p>
              </div>
            </div>
            <div className="flex border-t border-black">
              <div className="flex-1 border-r border-black p-1">
                <p className="text-[8px] text-gray-600">MUNICÍPIO</p>
                <p>{destinatario.cidade || '-'}</p>
              </div>
              <div className="w-16 border-r border-black p-1 text-center">
                <p className="text-[8px] text-gray-600">UF</p>
                <p>{destinatario.uf || '-'}</p>
              </div>
              <div className="flex-1 border-r border-black p-1">
                <p className="text-[8px] text-gray-600">TELEFONE</p>
                <p>{destinatario.telefone || '-'}</p>
              </div>
              <div className="flex-1 p-1">
                <p className="text-[8px] text-gray-600">EMAIL</p>
                <p>{destinatario.email || '-'}</p>
              </div>
            </div>
          </div>

          {/* Discriminação dos Serviços / Produtos */}
          <div className="border border-black border-t-0 text-xs">
            <div className={`${tipoRecibo === 'servico' ? 'bg-blue-100' : 'bg-green-100'} p-1 font-bold text-[10px]`}>
              {tipoRecibo === 'servico' ? 'DISCRIMINAÇÃO DOS SERVIÇOS' : 'DADOS DOS PRODUTOS'}
            </div>
            <div className="p-3 min-h-[120px]">
              <p className="whitespace-pre-wrap">{item.descricao || '-'}</p>
              <div className="mt-4 flex justify-between items-center border-t pt-2">
                <span className="text-gray-600">Quantidade: {item.quantidade} {item.unidade}</span>
                <span className="text-gray-600">Valor Unitário: {item.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
          </div>

          {/* Valor Total */}
          <div className={`border border-black border-t-0 ${tipoRecibo === 'servico' ? 'bg-blue-50' : 'bg-green-50'} p-3`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">VALOR TOTAL DO RECIBO</span>
              <span className={`font-bold text-2xl ${tipoRecibo === 'servico' ? 'text-blue-700' : 'text-green-700'}`}>
                {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          {/* Informações de Pagamento */}
          <div className="border border-black border-t-0 text-xs">
            <div className="bg-gray-200 p-1 font-bold text-[10px]">INFORMAÇÕES DE PAGAMENTO</div>
            <div className="p-2">
              <p><strong>Vencimento:</strong> {new Date(vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              <p><strong>Forma de Pagamento:</strong> Boleto Bancário</p>
              <p className="text-gray-600 mt-1">Após o vencimento será cobrado multa de 10% + juros de 0,033% ao dia.</p>
            </div>
          </div>

          {/* Dados adicionais */}
          <div className="border border-black border-t-0 text-xs">
            <div className="bg-gray-200 p-1 font-bold text-[10px]">OUTRAS INFORMAÇÕES</div>
            <div className="p-2 min-h-[40px]">
              <p className="text-[9px]">
                Documento sem valor fiscal - apenas para fins de comprovação de pagamento.<br />
                RECIBO: #{numeroReciboFormatado} | SÉRIE: {serie} | EMITENTE: {dadosEmitente.nomeFantasia}
              </p>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-[8px] text-gray-500 mt-2 flex justify-between px-2 pb-2">
            <span>DATA E HORA DA IMPRESSÃO: {dataFormatada} {horaFormatada}</span>
            <span>BRHUB Envios - Sistema de Gestão</span>
          </div>
        </motion.div>
      </div>

      {/* Boleto gerado - Info */}
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
                    {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

      {/* Boleto PDF para impressão */}
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
