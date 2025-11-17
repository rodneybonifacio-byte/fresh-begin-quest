import * as XLSX from 'xlsx';
import { formatDateTime } from './date-utils';
import { formatCpfCnpj } from './lib.formats';
import type { IEmissao } from '../types/IEmissao';

export const exportEmissoesToExcel = (emissoes: IEmissao[], fileName: string = 'emissoes') => {
  // Preparar os dados para exportação com campos separados
  const data = emissoes.map((emissao) => ({
    'Código Objeto': emissao.codigoObjeto || '',
    'Transportadora': emissao.transportadora || '',
    'Serviço': emissao.servico || '',
    'Status': emissao.status || '',
    'Status Faturamento': emissao.statusFaturamento || '',
    
    // Remetente
    'Remetente Nome': emissao.remetenteNome || emissao.remetente?.nome || '',
    'Remetente CPF/CNPJ': formatCpfCnpj(emissao.remetenteCpfCnpj || emissao.remetente?.cpfCnpj || ''),
    'Remetente CEP': emissao.remetente?.endereco?.cep || '',
    'Remetente Endereço': emissao.remetente?.endereco?.logradouro || '',
    'Remetente Número': emissao.remetente?.endereco?.numero || '',
    'Remetente Bairro': emissao.remetente?.endereco?.bairro || '',
    'Remetente Cidade': emissao.remetente?.endereco?.localidade || '',
    'Remetente UF': emissao.remetente?.endereco?.uf || '',
    'Remetente Telefone': emissao.remetente?.telefone || '',
    'Remetente Email': emissao.remetente?.email || '',
    
    // Cliente
    'Cliente Nome': emissao.cliente?.nome || '',
    'Cliente CPF/CNPJ': formatCpfCnpj(emissao.cliente?.cpfCnpj || ''),
    'Cliente Telefone': emissao.cliente?.telefone || '',
    'Cliente Email': emissao.cliente?.email || '',
    
    // Destinatário
    'Destinatário Nome': emissao.destinatario?.nome || '',
    'Destinatário CPF/CNPJ': formatCpfCnpj(emissao.destinatario?.cpfCnpj || ''),
    'Destinatário CEP': emissao.destinatario?.endereco?.cep || '',
    'Destinatário Endereço': emissao.destinatario?.endereco?.logradouro || '',
    'Destinatário Número': emissao.destinatario?.endereco?.numero || '',
    'Destinatário Bairro': emissao.destinatario?.endereco?.bairro || '',
    'Destinatário Cidade': emissao.destinatario?.endereco?.localidade || '',
    'Destinatário UF': emissao.destinatario?.endereco?.uf || '',
    'Destinatário Telefone': emissao.destinatario?.telefone || emissao.destinatario?.celular || '',
    'Destinatário Email': '',
    
    // Valores
    'Valor Frete (R$)': emissao.valor || emissao.valorPostagem || '',
    'Valor Declarado (R$)': emissao.valorDeclarado || '',
    'Valor Nota Fiscal (R$)': emissao.valorNotaFiscal || '',
    
    // Outros dados
    'Número NF': emissao.numeroNotaFiscal || '',
    'Chave NF-e': emissao.chaveNFe || '',
    'Externo ID': emissao.externoId || '',
    'Origem': emissao.origem || '',
    'Observação': emissao.observacao || '',
    'RFID': emissao.rfidObjeto || '',
    'Logística Reversa': emissao.logisticaReversa || '',
    
    // Datas
    'Criado Em': formatDateTime(emissao.criadoEm),
    
    // Erros
    'Mensagem Erro': emissao.mensagensErrorPostagem || '',
  }));

  // Criar workbook e worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Emissões');

  // Ajustar largura das colunas
  const columnWidths = [
    { wch: 20 }, // Código Objeto
    { wch: 15 }, // Transportadora
    { wch: 20 }, // Serviço
    { wch: 15 }, // Status
    { wch: 18 }, // Status Faturamento
    { wch: 30 }, // Remetente Nome
    { wch: 18 }, // Remetente CPF/CNPJ
    { wch: 12 }, // Remetente CEP
    { wch: 30 }, // Remetente Endereço
    { wch: 10 }, // Remetente Número
    { wch: 20 }, // Remetente Bairro
    { wch: 20 }, // Remetente Cidade
    { wch: 5 },  // Remetente UF
    { wch: 15 }, // Remetente Telefone
    { wch: 25 }, // Remetente Email
    { wch: 30 }, // Cliente Nome
    { wch: 18 }, // Cliente CPF/CNPJ
    { wch: 15 }, // Cliente Telefone
    { wch: 25 }, // Cliente Email
    { wch: 30 }, // Destinatário Nome
    { wch: 18 }, // Destinatário CPF/CNPJ
    { wch: 12 }, // Destinatário CEP
    { wch: 30 }, // Destinatário Endereço
    { wch: 10 }, // Destinatário Número
    { wch: 20 }, // Destinatário Bairro
    { wch: 20 }, // Destinatário Cidade
    { wch: 5 },  // Destinatário UF
    { wch: 15 }, // Destinatário Telefone
    { wch: 25 }, // Destinatário Email
    { wch: 15 }, // Valor Frete
    { wch: 15 }, // Valor Declarado
    { wch: 18 }, // Valor Nota Fiscal
    { wch: 15 }, // Número NF
    { wch: 44 }, // Chave NF-e
    { wch: 20 }, // Externo ID
    { wch: 15 }, // Origem
    { wch: 40 }, // Observação
    { wch: 20 }, // RFID
    { wch: 15 }, // Logística Reversa
    { wch: 18 }, // Criado Em
    { wch: 50 }, // Mensagem Erro
  ];
  worksheet['!cols'] = columnWidths;

  // Gerar arquivo e fazer download
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
};
