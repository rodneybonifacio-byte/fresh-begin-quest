import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, RefreshCw, CheckSquare, Square, Search } from 'lucide-react';
import { EmissaoService } from '../../../../services/EmissaoService';
import { RemetenteService } from '../../../../services/RemetenteService';
import { LoadSpinner } from '../../../../components/loading';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IEmissao } from '../../../../types/IEmissao';
import { IRemetente } from '../../../../types/IRemetente';

export const GerenciarEtiquetas = () => {
    const [etiquetas, setEtiquetas] = useState<IEmissao[]>([]);
    const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
    const [remetentes, setRemetentes] = useState<IRemetente[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [excluindo, setExcluindo] = useState(false);
    const [filtroStatus, setFiltroStatus] = useState<string>('');
    const [filtroTransportadora, setFiltroTransportadora] = useState<string>('');
    const [filtroRemetente, setFiltroRemetente] = useState<string>('');
    const [filtroBusca, setFiltroBusca] = useState<string>('');
    const [dataInicio, setDataInicio] = useState<string>('');
    const [dataFim, setDataFim] = useState<string>('');
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    const emissaoService = new EmissaoService();
    const remetenteService = new RemetenteService();

    useEffect(() => {
        buscarRemetentes();
    }, []);

    const buscarRemetentes = async () => {
        try {
            const response = await remetenteService.getAll();
            if (response?.data) {
                setRemetentes(response.data);
            }
        } catch (error) {
            console.error('Erro ao buscar remetentes:', error);
        }
    };

    const buscarEtiquetas = async () => {
        setCarregando(true);
        try {
            const params: any = {
                page: String(pagina),
                limit: '50',
                allClients: 'true' // Admin pode ver etiquetas de todos os clientes
            };

            if (filtroStatus) params.status = filtroStatus;
            if (filtroTransportadora) params.transportadora = filtroTransportadora;
            if (filtroRemetente) params.remetenteId = filtroRemetente;
            if (dataInicio) params.dataIni = dataInicio;
            if (dataFim) params.dataFim = dataFim;

            const response = await emissaoService.getAll(params);
            
            if (response?.data) {
                let dados = response.data;
                
                // Filtro de busca local por código ou destinatário
                if (filtroBusca) {
                    const buscaLower = filtroBusca.toLowerCase();
                    dados = dados.filter((e: IEmissao) => 
                        e.codigoObjeto?.toLowerCase().includes(buscaLower) ||
                        e.destinatario?.nome?.toLowerCase().includes(buscaLower) ||
                        e.remetenteNome?.toLowerCase().includes(buscaLower)
                    );
                }
                
                setEtiquetas(dados);
                
                // Calcular total de páginas se disponível
                if (response.data.length === 50) {
                    setTotalPaginas(pagina + 1);
                }
            }
        } catch (error: any) {
            toast.error(`Erro ao buscar etiquetas: ${error.message}`);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        buscarEtiquetas();
    }, [pagina, filtroStatus, filtroTransportadora, filtroRemetente, dataInicio, dataFim]);

    const toggleSelecionada = (id: string) => {
        const novoSet = new Set(selecionadas);
        if (novoSet.has(id)) {
            novoSet.delete(id);
        } else {
            novoSet.add(id);
        }
        setSelecionadas(novoSet);
    };

    const selecionarTodas = () => {
        if (selecionadas.size === etiquetas.length) {
            setSelecionadas(new Set());
        } else {
            setSelecionadas(new Set(etiquetas.map(e => e.id).filter((id): id is string => id !== undefined)));
        }
    };

    const excluirSelecionadas = async () => {
        if (selecionadas.size === 0) {
            toast.warning('Selecione ao menos uma etiqueta');
            return;
        }

        const confirmacao = window.confirm(
            `Tem certeza que deseja excluir ${selecionadas.size} etiqueta(s)?\n\nEsta ação não pode ser desfeita.`
        );

        if (!confirmacao) return;

        setExcluindo(true);
        const ids = Array.from(selecionadas);
        let sucessos = 0;
        let erros = 0;

        try {
            toast.info(`Excluindo ${ids.length} etiquetas...`);

            for (let i = 0; i < ids.length; i++) {
                try {
                    await emissaoService.delete(ids[i]);
                    sucessos++;

                    if ((i + 1) % 10 === 0 || (i + 1) === ids.length) {
                        toast.info(`Progresso: ${i + 1}/${ids.length} (✅${sucessos} ❌${erros})`);
                    }

                    // Delay para não sobrecarregar
                    if (i < ids.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 400));
                    }
                } catch (error) {
                    console.error(`Erro ao excluir ${ids[i]}:`, error);
                    erros++;
                }
            }

            toast.success(`✅ ${sucessos} excluídas | ❌ ${erros} erros`);
            setSelecionadas(new Set());
            buscarEtiquetas();
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`);
        } finally {
            setExcluindo(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            'PRE_POSTADO': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Pré-Postado' },
            'POSTADO': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', label: 'Postado' },
            'COLETADO': { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300', label: 'Coletado' },
            'EM_TRANSITO': { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', label: 'Em Trânsito' },
            'ENTREGUE': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Entregue' },
            'CANCELADO': { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', label: 'Cancelado' },
        };

        const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-background p-6">
            {excluindo && <LoadSpinner mensagem="Excluindo etiquetas..." />}
            
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
                    <h1 className="text-3xl font-bold mb-2">Gerenciar Etiquetas</h1>
                    <p className="text-orange-100">Selecione e exclua etiquetas de forma fácil e organizada</p>
                </div>

                {/* Filtros */}
                <div className="bg-card border border-border rounded-lg p-6 shadow-md">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">Filtros</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Código ou destinatário"
                                    value={filtroBusca}
                                    onChange={(e) => setFiltroBusca(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-foreground"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Remetente</label>
                            <select
                                value={filtroRemetente}
                                onChange={(e) => setFiltroRemetente(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-foreground"
                            >
                                <option value="">Todos</option>
                                {remetentes.map((rem) => (
                                    <option key={rem.id} value={rem.id}>
                                        {rem.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Status</label>
                            <select
                                value={filtroStatus}
                                onChange={(e) => setFiltroStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-foreground"
                            >
                                <option value="">Todos</option>
                                <option value="PRE_POSTADO">Pré-Postado</option>
                                <option value="POSTADO">Postado</option>
                                <option value="COLETADO">Coletado</option>
                                <option value="EM_TRANSITO">Em Trânsito</option>
                                <option value="ENTREGUE">Entregue</option>
                                <option value="CANCELADO">Cancelado</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Transportadora</label>
                            <select
                                value={filtroTransportadora}
                                onChange={(e) => setFiltroTransportadora(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-foreground"
                            >
                                <option value="">Todas</option>
                                <option value="CORREIOS">Correios</option>
                                <option value="RODONAVES">Rodonaves</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Período</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-foreground text-sm"
                                />
                                <input
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-foreground text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={buscarEtiquetas}
                            disabled={carregando}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                            Atualizar
                        </button>

                        <button
                            onClick={() => {
                                setFiltroBusca('');
                                setFiltroStatus('');
                                setFiltroTransportadora('');
                                setFiltroRemetente('');
                                setDataInicio('');
                                setDataFim('');
                                setPagina(1);
                            }}
                            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                        >
                            Limpar Filtros
                        </button>
                    </div>
                </div>

                {/* Ações em Lote */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={selecionarTodas}
                                className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                            >
                                {selecionadas.size === etiquetas.length ? (
                                    <CheckSquare className="w-5 h-5" />
                                ) : (
                                    <Square className="w-5 h-5" />
                                )}
                                {selecionadas.size === etiquetas.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                            </button>

                            <span className="text-sm text-muted-foreground">
                                {selecionadas.size} de {etiquetas.length} selecionada(s)
                            </span>
                        </div>

                        <button
                            onClick={excluirSelecionadas}
                            disabled={selecionadas.size === 0 || excluindo}
                            className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                        >
                            <Trash2 className="w-5 h-5" />
                            Excluir Selecionadas ({selecionadas.size})
                        </button>
                    </div>
                </div>

                {/* Tabela de Etiquetas */}
                <div className="bg-card border border-border rounded-lg shadow-md overflow-hidden">
                    {carregando ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
                            <p className="text-muted-foreground">Carregando etiquetas...</p>
                        </div>
                    ) : etiquetas.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-muted-foreground mb-2">Nenhuma etiqueta encontrada</p>
                            <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-4 py-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selecionadas.size === etiquetas.length && etiquetas.length > 0}
                                                    onChange={selecionarTodas}
                                                    className="w-4 h-4 text-orange-500 border-border rounded focus:ring-orange-500"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Código</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Remetente</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Transportadora</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Destinatário</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cidade/UF</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {etiquetas.map((etiqueta) => {
                                            if (!etiqueta.id) return null;
                                            return (
                                            <tr
                                                key={etiqueta.id}
                                                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                                                    selecionadas.has(etiqueta.id) ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                                                }`}
                                                onClick={() => toggleSelecionada(etiqueta.id!)}
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selecionadas.has(etiqueta.id)}
                                                        onChange={() => toggleSelecionada(etiqueta.id!)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-4 h-4 text-orange-500 border-border rounded focus:ring-orange-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-sm font-medium text-foreground">
                                                        {etiqueta.codigoObjeto || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-foreground">
                                                        {etiqueta.cliente?.nome || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-foreground">
                                                        {etiqueta.remetenteNome || etiqueta.remetente?.nome || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-foreground font-medium">
                                                        {etiqueta.transportadora || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-foreground">
                                                        {etiqueta.destinatario?.nome || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-muted-foreground">
                                                        {etiqueta.destinatario?.endereco?.localidade && etiqueta.destinatario?.endereco?.uf 
                                                            ? `${etiqueta.destinatario.endereco.localidade}/${etiqueta.destinatario.endereco.uf}` 
                                                            : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getStatusBadge(etiqueta.status || 'PRE_POSTADO')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                        {etiqueta.valor 
                                                            ? `R$ ${etiqueta.valor.toFixed(2)}` 
                                                            : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-muted-foreground">
                                                        {etiqueta.criadoEm 
                                                            ? format(new Date(etiqueta.criadoEm), 'dd/MM/yyyy', { locale: ptBR })
                                                            : '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginação */}
                            {totalPaginas > 1 && (
                                <div className="bg-muted px-4 py-3 flex items-center justify-between border-t border-border">
                                    <button
                                        onClick={() => setPagina(p => Math.max(1, p - 1))}
                                        disabled={pagina === 1}
                                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
                                    >
                                        Anterior
                                    </button>
                                    
                                    <span className="text-sm text-muted-foreground">
                                        Página {pagina} de {totalPaginas}
                                    </span>
                                    
                                    <button
                                        onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                        disabled={pagina === totalPaginas}
                                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
                                    >
                                        Próxima
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GerenciarEtiquetas;
