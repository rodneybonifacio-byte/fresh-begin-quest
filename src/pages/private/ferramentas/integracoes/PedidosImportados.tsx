import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Content } from '../../Content';
import { LoadSpinner } from '../../../../components/loading';
import { TableCustom } from '../../../../components/table';
import { NotFoundData } from '../../../../components/NotFoundData';
import CustomCheckbox from '../../../../components/CheckboxCustom';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { PaginacaoCustom } from '../../../../components/PaginacaoCustom';

import { toastError, toastSuccess } from '../../../../utils/toastNotify';
import { formatDateTime } from '../../../../utils/date-utils';
import { RefreshCcw, Package, CheckCircle, Clock, AlertCircle, Truck, Zap } from 'lucide-react';
import { IntegracaoService } from '../../../../services/IntegracaoService';

interface PedidoImportado {
    id: string;
    externo_id: string;
    numero_pedido: string;
    plataforma: string;
    status: string;
    destinatario_nome: string;
    destinatario_logradouro: string;
    destinatario_numero: string;
    destinatario_complemento: string;
    destinatario_bairro: string;
    destinatario_cidade: string;
    destinatario_estado: string;
    destinatario_cep: string;
    valor_total: number;
    peso_total: number;
    codigo_rastreio: string | null;
    servico_frete: string | null;
    criado_em: string;
    remetentes?: {
        nome: string;
    };
}

const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
        pendente: {
            icon: <Clock className="w-3 h-3" />,
            className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            label: 'Pendente',
        },
        processado: {
            icon: <CheckCircle className="w-3 h-3" />,
            className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            label: 'Processado',
        },
        erro: {
            icon: <AlertCircle className="w-3 h-3" />,
            className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            label: 'Erro',
        },
    };

    const config = statusConfig[status] || statusConfig.pendente;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

const ITEMS_PER_PAGE = 10;

const PedidosImportados = () => {
    const { setIsLoading } = useLoadingSpinner();
    const queryClient = useQueryClient();
    const service = new IntegracaoService();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    // Buscar pedidos importados via backend function
    const { data: pedidos, isLoading, isError } = useQuery({
        queryKey: ['pedidos-importados'],
        queryFn: async () => {
            const response = await service.getPedidosImportados();
            return response.data as PedidoImportado[];
        },
    });

    // Paginação
    const totalRecords = pedidos?.length || 0;
    const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedPedidos = pedidos?.slice(startIndex, endIndex) || [];
    const recordsOnPage = paginatedPedidos.length;

    const paginationMeta = {
        currentPage,
        totalPages,
        totalRecords,
        recordsOnPage,
        prevPage: currentPage > 1 ? currentPage - 1 : null,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
    };

    // Mutation para processar pedidos selecionados (gerar etiquetas)
    const processarMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            setIsLoading(true);
            const results = [];
            for (const id of ids) {
                try {
                    const result = await service.processarPedidoShopify(id);
                    results.push({ id, success: true, data: result });
                } catch (error) {
                    results.push({ id, success: false, error });
                }
            }
            return results;
        },
        onSuccess: (results) => {
            setIsLoading(false);
            const successCount = results.filter((r) => r.success).length;
            const errorCount = results.filter((r) => !r.success).length;

            if (successCount > 0) {
                toastSuccess(`${successCount} etiqueta(s) gerada(s) com sucesso!`);
            }
            if (errorCount > 0) {
                toastError(`${errorCount} pedido(s) com erro`);
            }

            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['pedidos-importados'] });
        },
        onError: () => {
            setIsLoading(false);
            toastError('Erro ao processar pedidos');
        },
    });

    // Mutation para importar novos pedidos
    const importarMutation = useMutation({
        mutationFn: async () => {
            setIsLoading(true);
            const integracoesResponse = await service.getAll();
            const shopifyIntegracao = integracoesResponse.data.find((i) => i.plataforma === 'shopify');

            if (!shopifyIntegracao) {
                throw new Error('Configure a integração Shopify primeiro');
            }

            if (!shopifyIntegracao.remetenteId || !shopifyIntegracao.id) {
                throw new Error('Selecione um remetente na integração Shopify');
            }

            return service.importarPedidosShopify(shopifyIntegracao.id, shopifyIntegracao.remetenteId);
        },
        onSuccess: (response) => {
            setIsLoading(false);
            setCurrentPage(1);
            toastSuccess(response?.message || 'Pedidos importados!');
            queryClient.invalidateQueries({ queryKey: ['pedidos-importados'] });
        },
        onError: (error: Error) => {
            setIsLoading(false);
            toastError(error.message || 'Erro ao importar pedidos');
        },
    });

    const handleCheckboxChange = (id: string, selected: boolean) => {
        setSelectedIds((prev) => (selected ? [...prev, id] : prev.filter((item) => item !== id)));
    };

    const handleProcessarSelecionados = () => {
        if (selectedIds.length === 0) {
            toastError('Selecione pelo menos um pedido');
            return;
        }
        processarMutation.mutate(selectedIds);
    };

    const handleGerarEmMassa = () => {
        const pendentesIds = pedidos?.filter((p) => p.status === 'pendente').map((p) => p.id) || [];
        if (pendentesIds.length === 0) {
            toastError('Nenhum pedido pendente para gerar etiqueta');
            return;
        }
        processarMutation.mutate(pendentesIds);
    };

    const pendentes = pedidos?.filter((p) => p.status === 'pendente') || [];
    const processados = pedidos?.filter((p) => p.status === 'processado') || [];

    return (
        <Content
            titulo="Envios - Pedidos Importados"
            subTitulo={`${pendentes.length} pendente(s) · ${processados.length} processado(s)`}
            isButton
            button={[
                ...(pendentes.length > 0
                    ? [
                          {
                              label: `Gerar Todos (${pendentes.length})`,
                              onClick: handleGerarEmMassa,
                              bgColor: 'bg-amber-600 hover:bg-amber-700',
                              icon: <Zap className="w-4 h-4" />,
                          },
                      ]
                    : []),
                ...(selectedIds.length > 0
                    ? [
                          {
                              label: `Gerar Etiquetas (${selectedIds.length})`,
                              onClick: handleProcessarSelecionados,
                              bgColor: 'bg-green-600 hover:bg-green-700',
                              icon: <Truck className="w-4 h-4" />,
                          },
                      ]
                    : []),
                {
                    label: importarMutation.isPending ? 'Importando...' : 'Importar Pedidos',
                    onClick: () => importarMutation.mutate(),
                    bgColor: 'bg-primary',
                    icon: <RefreshCcw className={`w-4 h-4 ${importarMutation.isPending ? 'animate-spin' : ''}`} />,
                },
            ]}
        >
            {isLoading && <LoadSpinner mensagem="Carregando pedidos..." />}

            {!isLoading && !isError && pedidos && pedidos.length > 0 && (
                <div className="rounded-lg">
                    <TableCustom thead={['', 'Pedido', 'Plataforma', 'Destinatário', 'Cidade/UF', 'Valor', 'Status', 'Rastreio', 'Data']}>
                        {paginatedPedidos.map((pedido) => (
                            <tr
                                key={pedido.id}
                                className={`hover:bg-accent/50 cursor-pointer transition-colors ${
                                    selectedIds.includes(pedido.id) ? 'bg-primary/5' : ''
                                }`}
                            >
                                <td className="px-4 py-3">
                                    {pedido.status === 'pendente' && (
                                        <CustomCheckbox
                                            checked={selectedIds.includes(pedido.id)}
                                            item={{ value: pedido.id, label: '' }}
                                            onSelected={(item, selected) => handleCheckboxChange(item.value, selected)}
                                        />
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{pedido.numero_pedido}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm capitalize">{pedido.plataforma}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{pedido.destinatario_nome}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {pedido.destinatario_logradouro}
                                            {pedido.destinatario_numero ? `, ${pedido.destinatario_numero}` : ''}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-muted-foreground">
                                        {pedido.destinatario_cidade}/{pedido.destinatario_estado}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-medium">R$ {Number(pedido.valor_total || 0).toFixed(2)}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={pedido.status} />
                                </td>
                                <td className="px-4 py-3">
                                    {pedido.codigo_rastreio ? (
                                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{pedido.codigo_rastreio}</span>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-muted-foreground">{formatDateTime(pedido.criado_em)}</span>
                                </td>
                            </tr>
                        ))}
                    </TableCustom>

                    <PaginacaoCustom meta={paginationMeta} onPageChange={setCurrentPage} />
                </div>
            )}

            {!isLoading && !isError && (!pedidos || pedidos.length === 0) && (
                <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pedido importado</h3>
                    <p className="text-muted-foreground mb-4">
                        Clique em "Importar Pedidos" para buscar pedidos da sua loja
                    </p>
                    <button
                        onClick={() => importarMutation.mutate()}
                        disabled={importarMutation.isPending}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                    >
                        <RefreshCcw className={`w-4 h-4 ${importarMutation.isPending ? 'animate-spin' : ''}`} />
                        Importar Pedidos
                    </button>
                </div>
            )}

            {isError && <NotFoundData />}
        </Content>
    );
};

export default PedidosImportados;
