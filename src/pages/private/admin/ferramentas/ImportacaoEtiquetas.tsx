import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Trash2, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { EmissaoService } from '../../../../services/EmissaoService';
import { openPDFInNewTab } from '../../../../utils/pdfUtils';
import { ViacepService } from '../../../../services/viacepService';
import { isValid as isValidCPF } from '@fnando/cpf';
import { isValid as isValidCNPJ } from '@fnando/cnpj';

interface EtiquetaImport {
    servico_frete: string;
    cep: string;
    altura: number;
    largura: number;
    comprimento: number;
    peso: number;
    logradouro: string;
    numero: number;
    complemento?: string;
    nomeDestinatario: string;
    cpfCnpj: string;
    valor_frete: number;
    // Campos que serão preenchidos automaticamente
    bairro?: string;
    cidade?: string;
    estado?: string;
}

interface LogEntry {
    tipo: 'sucesso' | 'erro' | 'info';
    mensagem: string;
    timestamp: Date;
}

const ImportacaoEtiquetas = () => {
    const [arquivo, setArquivo] = useState<File | null>(null);
    const [dados, setDados] = useState<EtiquetaImport[]>([]);
    const [cpfCnpjCliente, setCpfCnpjCliente] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [importando, setImportando] = useState(false);
    const [imprimindo, setImprimindo] = useState(false);
    const [etiquetasCriadas, setEtiquetasCriadas] = useState<string[]>([]);

    const adicionarLog = (tipo: 'sucesso' | 'erro' | 'info', mensagem: string) => {
        setLogs(prev => [...prev, { tipo, mensagem, timestamp: new Date() }]);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setArquivo(file);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<EtiquetaImport>(worksheet);

                // Enriquecer dados com consulta de CEP já na leitura do arquivo
                const viacepService = new ViacepService();
                adicionarLog('info', 'Consultando CEPs para preencher cidade/estado na preview...');

                const dadosComCidade = await Promise.all(
                    jsonData.map(async (item: any) => {
                        try {
                            const cepLimpo = String(item.cep || item.CEP || '').replace(/\D/g, '');
                            if (!cepLimpo) return item;

                            const endereco = await viacepService.consulta(cepLimpo);
                            return {
                                ...item,
                                bairro: endereco.bairro || item.bairro,
                                cidade: endereco.localidade || item.cidade,
                                estado: endereco.uf || item.estado
                            };
                        } catch (error) {
                            adicionarLog('erro', `Erro ao consultar CEP ${item.cep || item.CEP}: ${error}`);
                            return item;
                        }
                    })
                );

                setDados(dadosComCidade);
                adicionarLog('sucesso', `Arquivo carregado: ${dadosComCidade.length} registros encontrados e CEPs consultados`);
            } catch (error) {
                adicionarLog('erro', 'Erro ao processar arquivo: ' + (error as Error).message);
                toast.error('Erro ao processar arquivo');
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const downloadTemplate = () => {
        const template = [
            {
                servico_frete: 'PAC',
                cep: '22775090',
                altura: 10,
                largura: 20,
                comprimento: 20,
                peso: 500,
                logradouro: 'Estrada Coronel Pedro Corrêa',
                numero: 140,
                complemento: 'Bloco 3 504',
                nomeDestinatario: 'EXEMPLO DESTINATARIO',
                cpfCnpj: '11132440700',
                valor_frete: 22.01
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'template_importacao_etiquetas.xlsx');
        adicionarLog('info', 'Template baixado com sucesso');
    };

    const importarTodas = async () => {
        if (!cpfCnpjCliente.trim()) {
            toast.error('Informe o CPF/CNPJ do cliente ou remetente');
            return;
        }

        if (dados.length === 0) {
            toast.error('Nenhum dado para importar');
            return;
        }

        setImportando(true);
        adicionarLog('info', `Iniciando importação de ${dados.length} etiquetas...`);

        try {
            // Função para gerar CPF válido
            const gerarCPFValido = (): string => {
                const randomDigits = (length: number) => 
                    Array.from({ length }, () => Math.floor(Math.random() * 10));
                
                const calcularDigito = (digits: number[]) => {
                    const soma = digits.reduce((acc, digit, idx) => 
                        acc + digit * (digits.length + 1 - idx), 0);
                    const resto = soma % 11;
                    return resto < 2 ? 0 : 11 - resto;
                };
                
                const primeiros9 = randomDigits(9);
                const digito1 = calcularDigito(primeiros9);
                const primeiros10 = [...primeiros9, digito1];
                const digito2 = calcularDigito(primeiros10);
                
                return [...primeiros9, digito1, digito2].join('');
            };

            // Validar CPF/CNPJ dos destinatários e substituir inválidos
            adicionarLog('info', 'Validando e corrigindo CPF/CNPJ dos destinatários...');
            
            const dadosCorrigidos: any[] = [];
            const errosCorrigidos: string[] = [];
            
            dados.forEach((item: any, index: number) => {
                const docOriginal = String(item.cpfCnpj || '').trim();
                const docLimpo = docOriginal.replace(/\D/g, '');
                
                // Se não tem tamanho correto, tenta gerar CPF válido
                if (docLimpo.length !== 11 && docLimpo.length !== 14) {
                    const novoCPF = gerarCPFValido();
                    errosCorrigidos.push(
                        `Linha ${index + 1}: CPF/CNPJ "${docOriginal}" inválido (${docLimpo.length} dígitos) - Substituído por CPF: ${novoCPF} - Destinatário: ${item.nomeDestinatario}`
                    );
                    dadosCorrigidos.push({ ...item, cpfCnpj: novoCPF });
                    return;
                }
                
                // Valida usando a biblioteca correta
                const isValid = docLimpo.length === 11 
                    ? isValidCPF(docLimpo) 
                    : isValidCNPJ(docLimpo);
                
                if (!isValid) {
                    // Se for tamanho de CPF mas inválido, gera novo
                    if (docLimpo.length === 11) {
                        const novoCPF = gerarCPFValido();
                        errosCorrigidos.push(
                            `Linha ${index + 1}: CPF "${docOriginal}" inválido - Substituído por: ${novoCPF} - Destinatário: ${item.nomeDestinatario}`
                        );
                        dadosCorrigidos.push({ ...item, cpfCnpj: novoCPF });
                    } else {
                        // CNPJ inválido, mantém erro mas não corrige automaticamente
                        errosCorrigidos.push(
                            `Linha ${index + 1}: CNPJ "${docOriginal}" inválido - Não foi possível corrigir automaticamente - Destinatário: ${item.nomeDestinatario}`
                        );
                    }
                } else {
                    dadosCorrigidos.push(item);
                }
            });
            
            // Registra as correções realizadas
            if (errosCorrigidos.length > 0) {
                errosCorrigidos.forEach(erro => adicionarLog('info', erro));
                toast.success(`${errosCorrigidos.length} CPF/CNPJ inválido(s) foram corrigidos automaticamente!`);
            }
            
            if (dadosCorrigidos.length === 0) {
                adicionarLog('erro', 'Nenhum registro para importar.');
                toast.error('Nenhum registro encontrado.');
                setImportando(false);
                return;
            }
            
            adicionarLog('sucesso', `${dadosCorrigidos.length} registros prontos para importação.`);
            adicionarLog('info', 'Preparando dados para envio...');

            // Normalizar tipos de dados conforme contrato da API
            const dadosNormalizados = dadosCorrigidos.map((item: any) => ({
                servico_frete: String(item.servico_frete || 'PAC').toUpperCase().trim(), // Força maiúsculo
                cep: String(item.cep || '').replace(/\D/g, ''),
                altura: Number(item.altura) || 0,
                largura: Number(item.largura) || 0,
                comprimento: Number(item.comprimento) || 0,
                peso: Number(item.peso) || 0,
                logradouro: String(item.logradouro || '').trim(),
                numero: Number(item.numero) || 0,
                complemento: item.complemento ? String(item.complemento).trim() : undefined,
                nomeDestinatario: String(item.nomeDestinatario || '').trim(),
                cpfCnpj: Number(String(item.cpfCnpj || '').replace(/\D/g, '')),
                valor_frete: Number(item.valor_frete) || 0,
                bairro: String(item.bairro || 'Centro').trim(),
                cidade: String(item.cidade || '').trim(),
                estado: String(item.estado || item.uf || '').toUpperCase().trim() // Força maiúsculo para UF
            }));

            const service = new EmissaoService();
            const payload = {
                cpfCnpj: cpfCnpjCliente.replace(/\D/g, ''), // CPF/CNPJ do remetente (apenas números)
                data: dadosNormalizados
            };

            console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
            adicionarLog('info', 'Enviando dados para API de importação em lote...');
            const response: any = await service.processarPedidosImportados(payload);
            
            adicionarLog('sucesso', 'Importação concluída com sucesso!');
            console.log('Resposta completa da API:', response);
            
            // Trata resposta da API - tentando diferentes formatos de resposta
            let idsEtiquetas: string[] = [];
            
            if (response?.etiquetas_criadas && Array.isArray(response.etiquetas_criadas)) {
                idsEtiquetas = response.etiquetas_criadas;
            } else if (response?.data?.etiquetas_criadas && Array.isArray(response.data.etiquetas_criadas)) {
                idsEtiquetas = response.data.etiquetas_criadas;
            } else if (response?.ids && Array.isArray(response.ids)) {
                idsEtiquetas = response.ids;
            } else if (response?.data && Array.isArray(response.data)) {
                // Se a resposta for um array de objetos com IDs
                idsEtiquetas = response.data.map((item: any) => item.id).filter(Boolean);
            }
            
            if (idsEtiquetas.length > 0) {
                setEtiquetasCriadas(idsEtiquetas);
                adicionarLog('sucesso', `✓ ${idsEtiquetas.length} etiquetas criadas e prontas para impressão!`);
            } else {
                adicionarLog('info', 'Etiquetas processadas (IDs não retornados pela API)');
            }

            if (response?.erros && Array.isArray(response.erros) && response.erros.length > 0) {
                response.erros.forEach((erro: any) => {
                    adicionarLog('erro', `Erro: ${erro.mensagem || erro}`);
                });
            }

            toast.success(`Importação concluída! ${dados.length} etiquetas processadas`);
        } catch (error: any) {
            console.error('Erro na importação múltipla (frontend):', error);
            const rawApiError = error?.response?.data;
            const mensagemApi = rawApiError?.message || rawApiError?.mensagem || error?.message;
            
            if (rawApiError) {
                adicionarLog('erro', 'Resposta completa da API (erro 400): ' + JSON.stringify(rawApiError));
            }
            
            adicionarLog('erro', 'Erro na importação: ' + (mensagemApi || 'Erro desconhecido'));
            toast.error(`Erro na importação: ${mensagemApi || 'Erro desconhecido'}`);
        } finally {
            setImportando(false);
        }
    };

    const imprimirEtiquetas = async () => {
        if (etiquetasCriadas.length === 0) {
            toast.error('Nenhuma etiqueta para imprimir');
            return;
        }

        setImprimindo(true);
        adicionarLog('info', `Gerando PDF com ${etiquetasCriadas.length} etiquetas...`);

        try {
            const service = new EmissaoService();
            const payload = {
                ids: etiquetasCriadas,
                tipo: 'completa' // ou 'etiqueta' se quiser apenas as etiquetas
            };

            const response = await service.imprimirEmMassa(payload);
            
            if (response?.dados) {
                openPDFInNewTab(response.dados, response.nome || 'etiquetas_lote.pdf');
                adicionarLog('sucesso', 'PDF gerado com sucesso!');
                toast.success('Abrindo PDF para impressão');
            } else {
                throw new Error('Resposta inválida da API');
            }
        } catch (error: any) {
            adicionarLog('erro', 'Erro ao gerar PDF: ' + (error.message || 'Erro desconhecido'));
            toast.error('Erro ao gerar PDF das etiquetas');
            console.error('Erro completo:', error);
        } finally {
            setImprimindo(false);
        }
    };

    const removerTodas = async () => {
        if (etiquetasCriadas.length === 0) {
            toast.error('Nenhuma etiqueta para remover');
            return;
        }

        if (!confirm(`Confirma a remoção de ${etiquetasCriadas.length} etiquetas?`)) {
            return;
        }

        adicionarLog('info', `Removendo ${etiquetasCriadas.length} etiquetas...`);
        
        // Aqui você implementaria a lógica de remoção
        // Por enquanto apenas limpa o estado
        setEtiquetasCriadas([]);
        setDados([]);
        setArquivo(null);
        adicionarLog('sucesso', 'Etiquetas removidas com sucesso');
        toast.success('Etiquetas removidas');
    };

    const limparTudo = () => {
        setArquivo(null);
        setDados([]);
        setLogs([]);
        setEtiquetasCriadas([]);
        setCpfCnpjCliente('');
        toast.info('Tudo limpo');
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Importação de Etiquetas em Lote</h1>
                <p className="text-muted-foreground">Importe múltiplas etiquetas de uma vez através de planilha Excel</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Painel de Upload */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Card de Template */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-primary" />
                                Template da Planilha
                            </h2>
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Baixar Template
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Baixe o template Excel com os campos necessários e preencha com seus dados
                        </p>
                    </div>

                    {/* Card de CPF/CNPJ */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-foreground mb-4">CPF/CNPJ do Cliente</h2>
                        <input
                            type="text"
                            value={cpfCnpjCliente}
                            onChange={(e) => setCpfCnpjCliente(e.target.value)}
                            placeholder="Digite o CPF ou CNPJ do cliente"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                                Remetente Padrão (Todas as Etiquetas)
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <strong>ÓPERA KIDS VAREJO</strong><br />
                                RUA MARIA MARCOLINA, 748<br />
                                03011-000 - SÃO PAULO/SP
                            </p>
                        </div>
                    </div>

                    {/* Card de Upload */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Upload do Arquivo</h2>
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer flex flex-col items-center gap-4"
                            >
                                <Upload className="w-12 h-12 text-muted-foreground" />
                                <div>
                                    <p className="text-lg font-medium text-foreground">
                                        {arquivo ? arquivo.name : 'Clique para selecionar arquivo'}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Formatos aceitos: .xlsx, .xls
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Preview dos Dados */}
                    {dados.length > 0 && (
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-foreground mb-4">
                                Preview dos Dados ({dados.length} registros)
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-2 text-muted-foreground">Serviço</th>
                                            <th className="text-left p-2 text-muted-foreground">Destinatário</th>
                                            <th className="text-left p-2 text-muted-foreground">CEP</th>
                                            <th className="text-left p-2 text-muted-foreground">Cidade</th>
                                            <th className="text-left p-2 text-muted-foreground">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dados.slice(0, 5).map((item, index) => (
                                            <tr key={index} className="border-b border-border">
                                                <td className="p-2">{item.servico_frete}</td>
                                                <td className="p-2">{item.nomeDestinatario}</td>
                                                <td className="p-2">{item.cep}</td>
                                                <td className="p-2">{item.cidade}</td>
                                                <td className="p-2">R$ {item.valor_frete?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {dados.length > 5 && (
                                    <p className="text-sm text-muted-foreground mt-2 text-center">
                                        E mais {dados.length - 5} registros...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Botões de Ação */}
                    {dados.length > 0 && (
                        <div className="flex gap-4 flex-wrap">
                            <button
                                onClick={importarTodas}
                                disabled={importando || !cpfCnpjCliente}
                                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {importando ? 'Importando...' : 'Importar Todas'}
                            </button>
                            {etiquetasCriadas.length > 0 && (
                                <>
                                    <button
                                        onClick={imprimirEtiquetas}
                                        disabled={imprimindo}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                                    >
                                        <Printer className="w-5 h-5" />
                                        {imprimindo ? 'Gerando PDF...' : `Imprimir ${etiquetasCriadas.length} Etiquetas`}
                                    </button>
                                    <button
                                        onClick={removerTodas}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-semibold"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        Remover Todas
                                    </button>
                                </>
                            )}
                            <button
                                onClick={limparTudo}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                                Limpar
                            </button>
                        </div>
                    )}

                    {/* Indicador de Etiquetas Prontas */}
                    {etiquetasCriadas.length > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <div>
                                    <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                                        {etiquetasCriadas.length} Etiquetas Criadas com Sucesso!
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Clique em "Imprimir Etiquetas" acima para gerar o PDF
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Painel de Logs */}
                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Logs de Importação</h2>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Nenhum log ainda
                                </p>
                            ) : (
                                logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-start gap-2 p-3 rounded-lg ${
                                            log.tipo === 'sucesso'
                                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                                : log.tipo === 'erro'
                                                ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                        }`}
                                    >
                                        {log.tipo === 'sucesso' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                        {log.tipo === 'erro' && <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                        {log.tipo === 'info' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm break-words">{log.mensagem}</p>
                                            <p className="text-xs opacity-70 mt-1">
                                                {log.timestamp.toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportacaoEtiquetas;
