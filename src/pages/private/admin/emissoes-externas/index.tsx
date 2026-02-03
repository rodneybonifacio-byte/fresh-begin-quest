import { useState } from 'react';
import { Package, Plus, Search, Trash2, Edit, ExternalLink, TrendingUp, DollarSign, Truck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmissoesExternasService, type IEmissaoExterna } from '../../../../services/EmissoesExternasService';
import { formatDateTime } from '../../../../utils/date-utils';
import { ModalAdicionarEmissaoExterna } from './ModalAdicionarEmissaoExterna';

const service = new EmissoesExternasService();

const ListaEmissoesExternas = () => {
    const queryClient = useQueryClient();
    const [filtroCodigoObjeto, setFiltroCodigoObjeto] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [emissaoParaEditar, setEmissaoParaEditar] = useState<IEmissaoExterna | null>(null);

    // Query para listar emissões externas
    const { data: resultado, isLoading } = useQuery({
        queryKey: ['emissoes-externas', filtroCodigoObjeto, filtroStatus],
        queryFn: () => service.listar({
            codigo_objeto: filtroCodigoObjeto || undefined,
            status: filtroStatus || undefined,
            limit: 100,
        }),
    });

    // Query para totais
    const { data: totais } = useQuery({
        queryKey: ['emissoes-externas-totais'],
        queryFn: () => service.buscarTotais(),
    });

    // Mutation para remover
    const removerMutation = useMutation({
        mutationFn: (id: string) => service.remover(id),
        onSuccess: () => {
            toast.success('Emissão removida com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['emissoes-externas'] });
            queryClient.invalidateQueries({ queryKey: ['emissoes-externas-totais'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao remover emissão');
        },
    });

    const handleRemover = (emissao: IEmissaoExterna) => {
        if (confirm(`Deseja realmente remover a emissão ${emissao.codigo_objeto}?`)) {
            removerMutation.mutate(emissao.id);
        }
    };

    const handleEditar = (emissao: IEmissaoExterna) => {
        setEmissaoParaEditar(emissao);
        setIsModalOpen(true);
    };

    const handleAdicionar = () => {
        setEmissaoParaEditar(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEmissaoParaEditar(null);
    };

    const handleSalvar = () => {
        queryClient.invalidateQueries({ queryKey: ['emissoes-externas'] });
        queryClient.invalidateQueries({ queryKey: ['emissoes-externas-totais'] });
        handleModalClose();
    };

    const emissoes = resultado?.data || [];

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                                <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground tracking-tight">Emissões Externas</h1>
                                <p className="text-sm text-muted-foreground">Gerencie etiquetas emitidas fora do sistema</p>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleAdicionar}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                        >
                            <Plus className="h-4 w-4" />
                            Nova Emissão Externa
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Dashboard Cards */}
                {totais && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Package className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total de Emissões</p>
                                    <p className="text-2xl font-bold text-foreground">{totais.total}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                                    <p className="text-2xl font-bold text-emerald-600">R$ {totais.totalVenda.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <Truck className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Custos</p>
                                    <p className="text-2xl font-bold text-red-600">R$ {totais.totalCusto.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Lucro Total</p>
                                    <p className="text-2xl font-bold text-purple-600">R$ {totais.lucro.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtros */}
                <div className="bg-card border border-border/50 rounded-xl p-4 mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar por código de rastreio..."
                                    value={filtroCodigoObjeto}
                                    onChange={(e) => setFiltroCodigoObjeto(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                        <select
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            className="px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Todos os status</option>
                            <option value="postado">Postado</option>
                            <option value="em_transito">Em Trânsito</option>
                            <option value="entregue">Entregue</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>

                {/* Tabela */}
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : emissoes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p className="font-medium">Nenhuma emissão externa encontrada</p>
                            <p className="text-sm">Adicione sua primeira emissão clicando em "Nova Emissão Externa"</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30">
                                    <tr>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remetente</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Destinatário</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Venda</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Custo</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Lucro</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Data</th>
                                        <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {emissoes.map((emissao, idx) => {
                                        const lucro = Number(emissao.valor_venda) - Number(emissao.valor_custo);
                                        return (
                                            <tr key={emissao.id} className={`hover:bg-muted/40 transition-all ${idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}`}>
                                                <td className="px-5 py-4">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                        <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">{emissao.codigo_objeto}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-medium text-sm text-foreground">{emissao.remetente?.nome || '-'}</span>
                                                </td>
                                                <td className="px-5 py-4 hidden md:table-cell">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-sm text-foreground truncate max-w-[180px]">{emissao.destinatario_nome}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {emissao.destinatario_cidade} - {emissao.destinatario_uf}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm text-foreground">{emissao.servico || '-'}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-bold">
                                                        R$ {Number(emissao.valor_venda).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 hidden lg:table-cell">
                                                    <span className="text-sm text-red-600 font-medium">R$ {Number(emissao.valor_custo).toFixed(2)}</span>
                                                </td>
                                                <td className="px-5 py-4 hidden lg:table-cell">
                                                    <span className={`text-sm font-bold ${lucro >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                                        R$ {lucro.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        emissao.status === 'entregue' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        emissao.status === 'em_transito' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        emissao.status === 'cancelado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                        {emissao.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 hidden lg:table-cell">
                                                    <span className="text-sm text-muted-foreground">{formatDateTime(emissao.created_at)}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleEditar(emissao)}
                                                            className="p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all group"
                                                            title="Editar"
                                                        >
                                                            <Edit className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemover(emissao)}
                                                            className="p-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all group"
                                                            title="Remover"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ModalAdicionarEmissaoExterna
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onSalvar={handleSalvar}
                    emissaoParaEditar={emissaoParaEditar}
                />
            )}
        </div>
    );
};

export default ListaEmissoesExternas;
