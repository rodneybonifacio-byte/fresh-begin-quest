import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { EmissaoService } from '../services/EmissaoService';
import { ViacepService } from '../services/viacepService';
import { LoadSpinner } from './loading';
import { Zap } from 'lucide-react';
import { downloadPDF } from '../utils/pdfUtils';
import { PDFDocument } from 'pdf-lib';

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

type RelatorioItem = {
    id: string;
    bloco: number;
    erro: string;
};

export const BotaoImportacaoMassiva = () => {
    const [importando, setImportando] = useState(false);
    const [gerandoPDF, setGerandoPDF] = useState(false);
    const [pdfGeradoBase64, setPdfGeradoBase64] = useState<string | null>(null);
    const [idsSucesso, setIdsSucesso] = useState<string[]>([]);
    const [idsFalha, setIdsFalha] = useState<string[]>([]);
    const [relatorioFalhas, setRelatorioFalhas] = useState<RelatorioItem[]>([]);
    const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
    const [excluindo, setExcluindo] = useState(false);

    const excluirEtiquetas = async (ids: string[], tipo: 'falhas' | 'duplicadas') => {
        setExcluindo(true);
        const emissaoService = new EmissaoService();

        try {
            toast.info(`Excluindo ${ids.length} etiquetas...`);

            let sucessos = 0;
            let erros = 0;

            for (let i = 0; i < ids.length; i++) {
                try {
                    await emissaoService.delete(ids[i]);
                    sucessos++;

                    if ((i + 1) % 10 === 0 || (i + 1) === ids.length) {
                        toast.info(`Excluindo: ${i + 1}/${ids.length} (✅${sucessos} ❌${erros})`);
                    }

                    // Delay para não sobrecarregar a API
                    if (i < ids.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error: any) {
                    console.error(`Erro ao excluir ${ids[i]}:`, error);
                    erros++;
                }
            }

            toast.success(`✅ ${sucessos} etiquetas excluídas | ❌ ${erros} erros`);

            // Limpar os IDs de falha após exclusão bem-sucedida
            if (tipo === 'falhas' && sucessos > 0) {
                setIdsFalha([]);
                setRelatorioFalhas([]);
                setMostrarRelatorio(false);
            }
        } catch (error: any) {
            toast.error(`Erro ao excluir: ${error.message}`);
            console.error('Erro na exclusão:', error);
        } finally {
            setExcluindo(false);
        }
    };

    const excluirDuplicadas = async () => {
        setExcluindo(true);
        const emissaoService = new EmissaoService();

        try {
            toast.info('Buscando etiquetas duplicadas...');

            // Buscar todas as etiquetas recentes
            let todasEtiquetas: any[] = [];
            let pagina = 1;
            const limitePorPagina = 50;
            const totalPaginas = 10; // Buscar até 500 etiquetas

            while (pagina <= totalPaginas) {
                const response = await emissaoService.getAll({
                    page: String(pagina),
                    limit: String(limitePorPagina)
                });

                if (!response?.data || response.data.length === 0) {
                    break;
                }

                todasEtiquetas = [...todasEtiquetas, ...response.data];

                if (response.data.length < limitePorPagina) {
                    break;
                }

                pagina++;
            }

            if (todasEtiquetas.length === 0) {
                toast.warning('Nenhuma etiqueta encontrada para verificar');
                return;
            }

            toast.info(`Analisando ${todasEtiquetas.length} etiquetas...`);

            // Detectar duplicadas baseado em código_objeto
            const mapaCodigosObjeto = new Map<string, string[]>();

            todasEtiquetas.forEach((etiqueta) => {
                const codigo = etiqueta.codigo_objeto;
                if (codigo) {
                    if (!mapaCodigosObjeto.has(codigo)) {
                        mapaCodigosObjeto.set(codigo, []);
                    }
                    mapaCodigosObjeto.get(codigo)!.push(etiqueta.id);
                }
            });

            // Identificar duplicadas (manter a primeira, excluir as demais)
            const idsDuplicadas: string[] = [];

            mapaCodigosObjeto.forEach((ids) => {
                if (ids.length > 1) {
                    // Manter o primeiro ID, marcar os demais como duplicados
                    idsDuplicadas.push(...ids.slice(1));
                }
            });

            if (idsDuplicadas.length === 0) {
                toast.success('✅ Nenhuma etiqueta duplicada encontrada!');
                return;
            }

            toast.warning(`⚠️ ${idsDuplicadas.length} etiquetas duplicadas encontradas`);

            // Excluir as duplicadas
            await excluirEtiquetas(idsDuplicadas, 'duplicadas');
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`);
            console.error('Erro ao excluir duplicadas:', error);
        } finally {
            setExcluindo(false);
        }
    };

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
                        downloadPDF(responsePDF.dados, responsePDF.nome || `etiquetas_${dadosNormalizados.length}.pdf`);
                        toast.success('📄 PDF baixado com sucesso!');
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

    const gerarPDFEtiquetasExistentes = async (idsEspecificos?: string[]) => {
        setGerandoPDF(true);
        setPdfGeradoBase64(null);
        const emissaoService = new EmissaoService();

        const sucessos: string[] = [];
        const falhas: string[] = [];
        const relatorio: RelatorioItem[] = [];

        try {
            let idsEtiquetas: string[] = [];

            if (idsEspecificos && idsEspecificos.length > 0) {
                // Modo retry: usar apenas os IDs que falharam
                idsEtiquetas = idsEspecificos;
                toast.info(`Reprocessando ${idsEtiquetas.length} etiquetas que falharam...`);
            } else {
                // Modo normal: buscar 200 etiquetas
                toast.info('Buscando etiquetas...');
                let todasEtiquetas: any[] = [];
                let pagina = 1;
                const limitePorPagina = 20;
                const totalDesejado = 200;

                while (todasEtiquetas.length < totalDesejado) {
                    const response = await emissaoService.getAll({ 
                        page: String(pagina), 
                        limit: String(limitePorPagina) 
                    });

                    if (!response?.data || response.data.length === 0) {
                        break;
                    }

                    todasEtiquetas = [...todasEtiquetas, ...response.data];
                    
                    if (response.data.length < limitePorPagina) {
                        break;
                    }

                    pagina++;
                }

                todasEtiquetas = todasEtiquetas.slice(0, totalDesejado);

                if (todasEtiquetas.length === 0) {
                    toast.error('Nenhuma etiqueta encontrada');
                    return;
                }

                idsEtiquetas = todasEtiquetas.map((etiqueta: any) => etiqueta.id).filter(Boolean);
                toast.info(`${idsEtiquetas.length} etiquetas encontradas. Iniciando geração...`);
            }

            if (idsEtiquetas.length === 0) {
                toast.error('Nenhum ID de etiqueta válido');
                return;
            }

            // Dividir IDs em blocos de 1 para controle preciso
            const chunks: string[][] = [];
            for (let i = 0; i < idsEtiquetas.length; i++) {
                chunks.push([idsEtiquetas[i]]);
            }

            toast.info(`Processando ${chunks.length} etiquetas...`);

            const pdfBase64Array: string[] = [];
            
            for (let i = 0; i < chunks.length; i++) {
                try {
                    if (i === 0 || (i + 1) === chunks.length || (i + 1) % 20 === 0) {
                        toast.info(`Processando: ${i + 1}/${chunks.length} (✅${sucessos.length} ❌${falhas.length})`);
                    }
                    
                    const payloadPDF = {
                        ids: chunks[i],
                        tipo: 'completa'
                    };

                    const responsePDF = await emissaoService.imprimirEmMassa(payloadPDF);
                    
                    if (responsePDF?.dados) {
                        pdfBase64Array.push(responsePDF.dados);
                        sucessos.push(chunks[i][0]);
                    } else {
                        falhas.push(chunks[i][0]);
                        relatorio.push({
                            id: chunks[i][0],
                            bloco: i + 1,
                            erro: 'Resposta sem dados de PDF'
                        });
                    }
                    
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                } catch (error: any) {
                    console.error(`Erro no bloco ${i + 1}:`, error);
                    falhas.push(chunks[i][0]);
                    relatorio.push({
                        id: chunks[i][0],
                        bloco: i + 1,
                        erro: error.message || 'Erro desconhecido'
                    });
                }
            }

            // Atualizar estados de rastreamento
            setIdsSucesso(sucessos);
            setIdsFalha(falhas);
            setRelatorioFalhas(relatorio);

            if (pdfBase64Array.length === 0) {
                toast.error('Nenhum PDF gerado! Veja o relatório de falhas.');
                setMostrarRelatorio(true);
                return;
            }

            toast.info(`Mesclando ${pdfBase64Array.length} PDFs...`);

            // Criar PDF final concatenado
            const mergedPdf = await PDFDocument.create();

            for (const base64 of pdfBase64Array) {
                const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                const pdf = await PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save();
            
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < mergedPdfBytes.length; i += chunkSize) {
                const chunk = mergedPdfBytes.slice(i, i + chunkSize);
                binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const mergedBase64 = btoa(binary);

            setPdfGeradoBase64(mergedBase64);
            
            const mensagemFinal = `✅ ${sucessos.length} PDFs gerados | ❌ ${falhas.length} falharam`;
            toast.success(mensagemFinal);
            
            if (falhas.length > 0) {
                setMostrarRelatorio(true);
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
            {excluindo && <LoadSpinner mensagem="Excluindo etiquetas..." />}
            
            <div className="space-y-4">
                {/* Linha Principal de Ações */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        onClick={processar}
                        disabled={importando || gerandoPDF || excluindo}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                        <Zap className="w-5 h-5" />
                        <span className="font-semibold">Importação Rápida</span>
                    </button>
                    
                    <button
                        onClick={() => {
                            if (pdfGeradoBase64) {
                                downloadPDF(pdfGeradoBase64, 'etiquetas_completas_geradas.pdf');
                            } else {
                                gerarPDFEtiquetasExistentes();
                            }
                        }}
                        disabled={importando || gerandoPDF || excluindo}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold">Baixar PDF Existentes</span>
                    </button>

                    <button
                        onClick={excluirDuplicadas}
                        disabled={importando || gerandoPDF || excluindo}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="font-semibold">Excluir Duplicadas</span>
                    </button>
                </div>

                {/* Painel de Estatísticas */}
                {(idsSucesso.length > 0 || idsFalha.length > 0) && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Resultado da Geração</h3>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 border border-green-200 dark:border-green-800">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{idsSucesso.length}</div>
                                <div className="text-sm text-green-700 dark:text-green-300">Etiquetas Geradas</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 border border-red-200 dark:border-red-800">
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{idsFalha.length}</div>
                                <div className="text-sm text-red-700 dark:text-red-300">Falhas</div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {idsFalha.length > 0 && (
                                <>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setMostrarRelatorio(!mostrarRelatorio)}
                                            className="flex-1 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors text-sm font-medium"
                                        >
                                            {mostrarRelatorio ? 'Ocultar Relatório' : 'Ver Relatório de Falhas'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPdfGeradoBase64(null);
                                                gerarPDFEtiquetasExistentes(idsFalha);
                                            }}
                                            disabled={gerandoPDF || excluindo}
                                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                        >
                                            Reprocessar Falhas
                                        </button>
                                    </div>
                                    
                                    <button
                                        onClick={() => excluirEtiquetas(idsFalha, 'falhas')}
                                        disabled={gerandoPDF || excluindo}
                                        className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Excluir Etiquetas que Falharam
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Relatório de Falhas */}
                {mostrarRelatorio && relatorioFalhas.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-red-200 dark:border-red-800">
                        <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 border-b border-red-200 dark:border-red-800">
                            <h4 className="font-semibold text-red-800 dark:text-red-300">Relatório de Falhas ({relatorioFalhas.length})</h4>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">Bloco</th>
                                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">ID Etiqueta</th>
                                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">Erro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {relatorioFalhas.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">#{item.bloco}</td>
                                            <td className="px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">{item.id}</td>
                                            <td className="px-4 py-2 text-red-600 dark:text-red-400 text-xs">{item.erro}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
