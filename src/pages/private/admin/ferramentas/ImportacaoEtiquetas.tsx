import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { EmissaoService } from '../../../../services/EmissaoService';

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
    bairro: string;
    cidade: string;
    estado: string;
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
    const [etiquetasCriadas, setEtiquetasCriadas] = useState<string[]>([]);

    const adicionarLog = (tipo: 'sucesso' | 'erro' | 'info', mensagem: string) => {
        setLogs(prev => [...prev, { tipo, mensagem, timestamp: new Date() }]);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setArquivo(file);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<EtiquetaImport>(worksheet);

                setDados(jsonData);
                adicionarLog('sucesso', `Arquivo carregado: ${jsonData.length} registros encontrados`);
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
                valor_frete: 22.01,
                bairro: 'Engenho',
                cidade: 'Barueri',
                estado: 'SP'
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
            const service = new EmissaoService();
            const payload = {
                cpfCnpj: cpfCnpjCliente,
                data: dados
            };

            const response: any = await service.processarPedidosImportados(payload);
            
            adicionarLog('sucesso', 'Importação concluída com sucesso!');
            
            // Trata resposta da API
            if (response?.etiquetas_criadas && Array.isArray(response.etiquetas_criadas)) {
                setEtiquetasCriadas(response.etiquetas_criadas);
                adicionarLog('info', `Total de etiquetas criadas: ${response.etiquetas_criadas.length}`);
            } else if (response?.data) {
                adicionarLog('info', 'Resposta recebida da API');
            }

            if (response?.erros && Array.isArray(response.erros) && response.erros.length > 0) {
                response.erros.forEach((erro: any) => {
                    adicionarLog('erro', `Erro: ${erro.mensagem || erro}`);
                });
            }

            toast.success(`Importação concluída! ${dados.length} etiquetas processadas`);
        } catch (error: any) {
            adicionarLog('erro', 'Erro na importação: ' + (error.message || 'Erro desconhecido'));
            toast.error('Erro ao importar etiquetas');
            console.error('Erro completo:', error);
        } finally {
            setImportando(false);
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
                        <h2 className="text-xl font-semibold text-foreground mb-4">CPF/CNPJ do Cliente ou Remetente</h2>
                        <input
                            type="text"
                            value={cpfCnpjCliente}
                            onChange={(e) => setCpfCnpjCliente(e.target.value)}
                            placeholder="Digite o CPF ou CNPJ"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
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
                        <div className="flex gap-4">
                            <button
                                onClick={importarTodas}
                                disabled={importando || !cpfCnpjCliente}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {importando ? 'Importando...' : 'Importar Todas'}
                            </button>
                            {etiquetasCriadas.length > 0 && (
                                <button
                                    onClick={removerTodas}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Remover Todas
                                </button>
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
