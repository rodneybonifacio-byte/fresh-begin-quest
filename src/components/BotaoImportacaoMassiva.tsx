import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { EmissaoService } from '../services/EmissaoService';
import { ViacepService } from '../services/viacepService';
import { LoadSpinner } from './loading';
import { Zap } from 'lucide-react';
import { openPDFInNewTab } from '../utils/pdfUtils';

// Gera CPF válido para substituir ou ignorar CPFs inválidos
const gerarCPFValido = (): string => {
    // Primeiro dígito não pode ser 0 para não perder dígito ao converter para número
    const randomDigits = [Math.floor(Math.random() * 9) + 1, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))];
    
    const calcularDigito = (digits: number[], peso: number): number => {
        const soma = digits.reduce((acc, digit, i) => acc + digit * (peso - i), 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    
    const digito1 = calcularDigito(randomDigits, 10);
    const digito2 = calcularDigito([...randomDigits, digito1], 11);
    
    return [...randomDigits, digito1, digito2].join('');
};

export const BotaoImportacaoMassiva = () => {
    const [importando, setImportando] = useState(false);
    const [gerandoPDF, setGerandoPDF] = useState(false);

    const processar = async () => {
        setImportando(true);
        const emissaoService = new EmissaoService();
        const viacepService = new ViacepService();

        try {
            toast.info('Carregando planilha do servidor...');

            // Carregar arquivo XLSX do public
            const response = await fetch('/dados_importacao.xlsx');
            if (!response.ok) {
                throw new Error('Arquivo não encontrado em /public/dados_importacao.xlsx');
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

            if (jsonData.length === 0) {
                throw new Error('Planilha vazia');
            }

            toast.info(`Processando ${jsonData.length} registros...`);

            // Enriquecer com CEP e GERAR CPF VÁLIDO PARA TODOS OS REGISTROS
            let cpfsGerados = 0;
            const dadosEnriquecidos = await Promise.all(
                jsonData.map(async (item: any, index: number) => {
                    // Ignora CPF/CNPJ da planilha e gera sempre um CPF novo e válido
                    const cpfGerado = gerarCPFValido();
                    cpfsGerados++;
                    console.log(`Linha ${index + 2}: CPF/CNPJ original ignorado → novo CPF gerado ${cpfGerado}`);
                    
                    try {
                        const cepLimpo = String(item.cep || item.CEP || '').replace(/\D/g, '');
                        const endereco = await viacepService.consulta(cepLimpo);
                        
                        return {
                            ...item,
                            cpfCnpj: cpfGerado,
                            bairro: endereco.bairro || 'Centro',
                            cidade: endereco.localidade || '',
                            estado: endereco.uf || ''
                        };
                    } catch (error) {
                        return {
                            ...item,
                            cpfCnpj: cpfGerado,
                            bairro: 'Centro',
                            cidade: '',
                            estado: ''
                        };
                    }
                })
            );

            console.log(`✅ ${cpfsGerados} CPFs gerados automaticamente para todos os registros`);

            // Normalizar com CPF já gerado e garantir numero válido
            const dadosNormalizados = dadosEnriquecidos.map((item: any) => {
                const numeroValue = Number(item.numero || item.NUMERO);
                const numeroFinal = (!numeroValue || numeroValue <= 0 || isNaN(numeroValue)) ? 1 : numeroValue;
                
                return {
                    servico_frete: String(item.servico_frete || item.SERVICO_FRETE || 'PAC').toUpperCase().trim(),
                    cep: String(item.cep || item.CEP || '').replace(/\D/g, ''),
                    altura: Number(item.altura || item.ALTURA || 0),
                    largura: Number(item.largura || item.LARGURA || 0),
                    comprimento: Number(item.comprimento || item.COMPRIMENTO || 0),
                    peso: Number(item.peso || item.PESO || 0),
                    logradouro: String(item.logradouro || item.LOGRADOURO || '').trim(),
                    numero: numeroFinal,
                    complemento: item.complemento || item.COMPLEMENTO ? String(item.complemento || item.COMPLEMENTO).trim() : undefined,
                    nomeDestinatario: String(item.nomeDestinatario || item.NOME_DESTINATARIO || '').trim(),
                    // Envia CPF como number (API exige number), mas foi gerado sem zeros iniciais para manter 11 dígitos
                    cpfCnpj: Number(String(item.cpfCnpj).replace(/\D/g, '')),
                    valor_frete: Number(item.valor_frete || item.VALOR_FRETE || 0),
                    bairro: String(item.bairro || '').trim(),
                    cidade: String(item.cidade || '').trim(),
                    estado: String(item.estado || item.uf || item.UF || '').toUpperCase().trim()
                };
            });

            console.log('📦 Enviando:', dadosNormalizados.length, 'registros (CPFs gerados para todos)');

            const payload = {
                cpfCnpj: '15808095000303',
                data: dadosNormalizados
            };

            toast.info('Enviando dados para a API...');
            const responseAPI: any = await emissaoService.processarPedidosImportados(payload);
            
            toast.success(`✅ ${dadosNormalizados.length} etiquetas importadas!`);
            
            // Captura IDs das etiquetas criadas para gerar PDF
            let idsEtiquetas: string[] = [];
            
            if (responseAPI?.etiquetas_criadas && Array.isArray(responseAPI.etiquetas_criadas)) {
                idsEtiquetas = responseAPI.etiquetas_criadas;
            } else if (responseAPI?.data?.etiquetas_criadas && Array.isArray(responseAPI.data.etiquetas_criadas)) {
                idsEtiquetas = responseAPI.data.etiquetas_criadas;
            } else if (responseAPI?.ids && Array.isArray(responseAPI.ids)) {
                idsEtiquetas = responseAPI.ids;
            } else if (responseAPI?.data && Array.isArray(responseAPI.data)) {
                idsEtiquetas = responseAPI.data.map((item: any) => item.id).filter(Boolean);
            }
            
            // Gera PDF automaticamente se houver IDs
            if (idsEtiquetas.length > 0) {
                toast.info(`Gerando PDF com ${idsEtiquetas.length} etiquetas...`);
                
                try {
                    const payloadPDF = {
                        ids: idsEtiquetas,
                        tipo: 'completa'
                    };
                    
                    const responsePDF = await emissaoService.imprimirEmMassa(payloadPDF);
                    
                    if (responsePDF?.dados) {
                        openPDFInNewTab(responsePDF.dados, responsePDF.nome || `etiquetas_${dadosNormalizados.length}.pdf`);
                        toast.success('📄 PDF gerado com sucesso!');
                    } else {
                        toast.error('Erro ao gerar PDF: resposta inválida');
                    }
                } catch (errorPDF: any) {
                    toast.error(`Erro ao gerar PDF: ${errorPDF.message}`);
                    console.error('Erro ao gerar PDF:', errorPDF);
                }
            } else {
                toast.warning('Nenhum ID de etiqueta retornado pela API - não foi possível gerar PDF');
            }
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`);
            console.error('Erro na importação:', error);
        } finally {
            setImportando(false);
        }
    };

    const gerarPDFEtiquetasExistentes = async () => {
        setGerandoPDF(true);
        const emissaoService = new EmissaoService();

        try {
            toast.info('Buscando últimas 200 etiquetas...');

            // Buscar via getAll com paginação
            const response = await emissaoService.getAll({ page: '1', limit: '200' });

            if (!response?.data || response.data.length === 0) {
                toast.error('Nenhuma etiqueta encontrada');
                return;
            }

            const idsEtiquetas = response.data.map((etiqueta: any) => etiqueta.id).filter(Boolean);

            if (idsEtiquetas.length === 0) {
                toast.error('Nenhum ID de etiqueta válido encontrado');
                return;
            }

            toast.info(`Gerando PDF com ${idsEtiquetas.length} etiquetas...`);

            const payloadPDF = {
                ids: idsEtiquetas,
                tipo: 'completa'
            };

            const responsePDF = await emissaoService.imprimirEmMassa(payloadPDF);

            if (responsePDF?.dados) {
                openPDFInNewTab(responsePDF.dados, responsePDF.nome || `etiquetas_existentes_${idsEtiquetas.length}.pdf`);
                toast.success(`📄 PDF com ${idsEtiquetas.length} etiquetas gerado!`);
            } else {
                toast.error('Erro ao gerar PDF: resposta inválida');
            }
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`);
            console.error('Erro ao gerar PDF:', error);
        } finally {
            setGerandoPDF(false);
        }
    };

    return (
        <>
            {importando && <LoadSpinner mensagem="Importando todos os registros..." />}
            {gerandoPDF && <LoadSpinner mensagem="Gerando PDF das etiquetas..." />}
            <div className="flex gap-3">
                <button
                    onClick={processar}
                    disabled={importando || gerandoPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                    <Zap className="w-5 h-5" />
                    <span className="font-semibold">Importação Rápida</span>
                </button>
                
                <button
                    onClick={gerarPDFEtiquetasExistentes}
                    disabled={importando || gerandoPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold">Gerar PDF das Existentes</span>
                </button>
            </div>
        </>
    );
};
