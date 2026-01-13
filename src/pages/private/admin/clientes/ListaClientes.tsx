import { CheckCircle2, Filter, LogIn, Plus, PlusCircle, Power, ReceiptText, Trash2, Truck, Users } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import authStore from '../../../../authentica/authentication.store';
import { DataTable } from '../../../../components/DataTable';
import { InputLabel } from '../../../../components/input-label';
import { LoadSpinner } from '../../../../components/loading';
import MetricCard from '../../../../components/MetricCard';
import { PaginacaoCustom } from '../../../../components/PaginacaoCustom';
import SelectCustom from '../../../../components/SelectCustom';
import { StatusBadge } from '../../../../components/StatusBadge';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useGlobalConfig } from '../../../../providers/GlobalConfigContext';
import { useLayout } from '../../../../providers/LayoutContext';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { ClienteService } from '../../../../services/ClienteService';
import type { IClienteDashboard } from '../../../../types/cliente/IClienteDashboard';
import type { ICliente } from '../../../../types/ICliente';
import type { IResponse } from '../../../../types/IResponse';
import { formatDate } from '../../../../utils/date-utils';
import { formatarNumero, formatCpfCnpj } from '../../../../utils/lib.formats';
import { Content } from '../../Content';
import { ModalAdicionarCredito } from './ModalAdicionarCredito';

export const ListaClientes = () => {
    const { layout } = useLayout();
    const { setIsLoading } = useLoadingSpinner();
    const config = useGlobalConfig();
    const service = new ClienteService();
    const perPage = config.pagination.perPage;
    const [data, setData] = useState<ICliente[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const [isModalAddCreditos, setIsModalAddCreditos] = useState<{ isOpen: boolean; cliente: ICliente }>({ isOpen: false, cliente: {} as ICliente });
    const [deletingClienteId, setDeletingClienteId] = useState<string | null>(null);
    const [reactivatingClienteId, setReactivatingClienteId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const handleRemoverCliente = useCallback(async (cliente: ICliente) => {
        const confirmar = window.confirm(
            `Tem certeza que deseja EXCLUIR PERMANENTEMENTE o cliente "${cliente.nomeEmpresa}"?\n\n⚠️ Esta ação não pode ser desfeita!`
        );
        
        if (!confirmar) return;

        setDeletingClienteId(cliente.id);
        try {
            console.log('Deletando cliente:', cliente.id);
            await service.deletarCliente(cliente.id);
            console.log('Cliente deletado com sucesso');
            toast.success('Cliente excluído com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-totais'] });
        } catch (error: any) {
            console.error('Erro ao deletar cliente:', error);
            console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
            const mensagemErro = error?.response?.data?.message 
                || error?.response?.data?.error 
                || error?.message 
                || 'Erro ao excluir cliente.';
            toast.error(mensagemErro);
        } finally {
            setDeletingClienteId(null);
        }
    }, [service, queryClient]);

    // Função para sanitizar dados do cliente antes de enviar para API
    const sanitizeClienteData = (data: any) => {
        const sanitized = { ...data };
        
        // Fix configuracoes types
        if (sanitized.configuracoes) {
            if (typeof sanitized.configuracoes.incluir_valor_declarado_na_nota === 'string') {
                sanitized.configuracoes.incluir_valor_declarado_na_nota = 
                    sanitized.configuracoes.incluir_valor_declarado_na_nota === 'true';
            }
            if (typeof sanitized.configuracoes.valor_disparo_evento_rastreio_whatsapp === 'number') {
                sanitized.configuracoes.valor_disparo_evento_rastreio_whatsapp = 
                    String(sanitized.configuracoes.valor_disparo_evento_rastreio_whatsapp);
            }
        }
        
        // Fix transportadoraConfiguracoes types
        if (Array.isArray(sanitized.transportadoraConfiguracoes)) {
            sanitized.transportadoraConfiguracoes = sanitized.transportadoraConfiguracoes.map((config: any) => ({
                ...config,
                valorAcrescimo: typeof config.valorAcrescimo === 'string' 
                    ? parseFloat(config.valorAcrescimo) || 0 
                    : config.valorAcrescimo,
            }));
        }
        
        return sanitized;
    };

    const patchClienteStatusLocal = (clienteId: string, status: string) => {
        // Atualiza imediatamente a tabela (estado local)
        setData((prev) => prev.map((c) => (c.id === clienteId ? { ...c, status } : c)));

        // Atualiza caches já carregados (todas as páginas/filtros)
        queryClient.setQueriesData({ queryKey: ['clientes'] }, (old: any) => {
            if (!old || typeof old !== 'object') return old;
            const list = (old as any).data;
            if (!Array.isArray(list)) return old;
            return {
                ...(old as any),
                data: list.map((c: any) => (c?.id === clienteId ? { ...c, status } : c)),
            };
        });
    };

    const handleReativarCliente = useCallback(async (cliente: ICliente) => {
        const confirmar = window.confirm(
            `Tem certeza que deseja REATIVAR o cliente "${cliente.nomeEmpresa}"?\n\nO cliente poderá acessar o sistema novamente.`
        );
        
        if (!confirmar) return;

        setReactivatingClienteId(cliente.id);
        try {
            console.log('Reativando cliente:', cliente.id);
            // Buscar dados completos do cliente antes de atualizar
            const { data: clienteCompleto } = await service.getById(cliente.id);
            const sanitizedData = sanitizeClienteData({ ...clienteCompleto, status: 'ATIVO' });
            await service.update(cliente.id, sanitizedData as any);

            // Confirma o status salvo no backend (evita UI ficar desatualizada)
            const { data: clienteAtualizado } = await service.getById(cliente.id);
            patchClienteStatusLocal(cliente.id, (clienteAtualizado as any)?.status || 'ATIVO');

            console.log('Cliente reativado com sucesso');
            toast.success('Cliente reativado com sucesso!');
            await queryClient.refetchQueries({ predicate: (q: any) => q.queryKey?.[0] === 'clientes' });
            queryClient.invalidateQueries({ queryKey: ['dashboard-totais'] });
        } catch (error: any) {
            console.error('Erro ao reativar cliente:', error);
            const mensagemErro = error?.response?.data?.message 
                || error?.response?.data?.error 
                || error?.message 
                || 'Erro ao reativar cliente.';
            toast.error(mensagemErro);
        } finally {
            setReactivatingClienteId(null);
        }
    }, [service, queryClient]);

    const { data: dashboard } = useFetchQuery<IClienteDashboard>(['dashboard-totais'], async () => {
        const response = await service.dashboard();
        return response ?? {}; // <- evita retorno undefined
    });

    const {
        data: clientes,
        isLoading,
        isError,
    } = useFetchQuery<IResponse<ICliente[]>>(['clientes', searchParams.toString()], async () => {
        const currentPage = Number(searchParams.get('page')) || 1;
        const queryParams = {
            limit: perPage,
            offset: (currentPage - 1) * perPage,
            cliente: searchParams.get('cliente') || '',
            status: searchParams.get('status') || '',
        };

        return await service.getAll(queryParams);
    });

    useEffect(() => {
        localStorage.removeItem('clienteEdicao');
    }, []);

    // Atualiza a página e os dados conforme o número da página
    const handlePageChange = (pageNumber: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', String(pageNumber));
        setSearchParams(newParams);
    };

    useEffect(() => {
        if (clientes?.data) {
            setData(clientes.data);
        }
    }, [clientes]);

    const LoginAsClient = async (cliente: ICliente) => {
        setIsLoading(true);
        try {
            const response = await service.loginAsClient({ email: cliente.email });
            // Limpa token antigo antes de setar o novo
            localStorage.removeItem('token');
            localStorage.setItem('token', response.token);
            authStore.login({ email: cliente.email, token: response.token });

            window.location.href = `/app`;
        } finally {
            setIsLoading(false);
        }
    };

    const handlerToggleFilter = () => {
        setIsFilterOpen((prev) => !prev);
    };

    const handleFiltrar = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const newParams = new URLSearchParams();
        newParams.set('page', '1');

        const clienteValue = formData.get('cliente');
        if (clienteValue) {
            newParams.set('cliente', clienteValue as string);
        }

        const statusValue = formData.get('status');
        if (statusValue) {
            newParams.set('status', statusValue as string);
        }

        setSearchParams(newParams);
        setIsFilterOpen(false);
    };

    return (
        <Content
            titulo="Clientes"
            subTitulo="Lista de clientes cadastrados no sistema"
            button={[
                {
                    label: 'Adicionar',
                    icon: <Plus size={22} className="text-white" />,
                    link: `/${layout}/clientes/adicionar`,
                },
                {
                    label: 'Filtrar',
                    onClick: () => handlerToggleFilter(),
                    icon: <Filter size={22} />,
                },
            ]}
            isButton
            isToBack
            data={clientes?.data && clientes.data.length > 0 ? clientes.data : []}
        >
            <>
                {isLoading && <LoadSpinner mensagem="Carregando..." />}
                {isFilterOpen && (
                    <form
                        onSubmit={handleFiltrar}
                        className="bg-white p-4 dark:bg-slate-800 w-full flex flex-col rounded-xl gap-6 text-gray-900 dark:text-gray-100"
                    >
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex w-full">
                                    <InputLabel
                                        labelTitulo="Nome do Cliente"
                                        name="cliente"
                                        type="text"
                                        defaultValue={searchParams.get('cliente') || ''}
                                        placeholder="Digite o nome do cliente para buscar"
                                    />
                                </div>
                                <div className="flex w-full">
                                    <SelectCustom
                                        label="Status"
                                        valueSelected={searchParams.get('status') || ''}
                                        onChange={(value: string | string[]) => {
                                            const newParams = new URLSearchParams(searchParams);
                                            newParams.set('page', '1');
                                            newParams.set('status', Array.isArray(value) ? value[0] : value);
                                            setSearchParams(newParams);
                                        }}
                                        data={[
                                            { value: '', label: 'Todos' },
                                            { value: 'ATIVO', label: 'Ativo' },
                                            { value: 'INATIVO', label: 'Inativo' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-start">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition duration-300 shadow-sm hover:shadow-md"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </form>
                )}
                <div className="grid sm:grid-cols-3 gap-5">
                    <MetricCard
                        title={{ text: 'Total de Clientes', size: 'text-sm' }}
                        value={{ text: formatarNumero(dashboard?.totalClientes || 0), size: 'text-3xl' }}
                        iconColor="blue"
                        valueColorByIcon
                        icon={Users}
                    />

                    <MetricCard
                        title={{ text: 'Clientes Ativos', size: 'text-sm' }}
                        value={{ text: formatarNumero(dashboard?.clientesAtivos || 0), size: 'text-3xl' }}
                        iconColor="green"
                        valueColorByIcon
                        icon={CheckCircle2}
                    />

                    <MetricCard
                        title={{ text: 'Transportadoras', size: 'text-sm' }}
                        value={{ text: formatarNumero(dashboard?.totalTransportadoras || 0), size: 'text-3xl' }}
                        iconColor="purple"
                        valueColorByIcon
                        icon={Truck}
                    />
                </div>

                {!isLoading && !isError && clientes?.data && clientes.data.length > 0 && (
                    <div className=" rounded-lg">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
                            <DataTable<ICliente>
                                data={data}
                                rowKey={(row) => row.id.toString() || ''}
                                columns={[
                                    {
                                        header: 'Razão Social',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{row.nomeEmpresa}</span>
                                                <small className="text-slate-500 dark:text-slate-400">{formatCpfCnpj(row.cpfCnpj)}</small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Status',
                                        accessor: (row) => <StatusBadge status={row.status || ''} tipo="ativo" />,
                                    },
                                    {
                                        header: 'Carteira',
                                        accessor: (row) => row.carteira?.saldo.toFixed(2) || '0.00',
                                    },
                                    {
                                        header: 'Criado Em',
                                        accessor: (row) => formatDate(row.criadoEm),
                                    },
                                ]}
                                actionTitle={(row) => row.nomeEmpresa}
                                actions={[
                                    {
                                        label: 'Detalhamento',
                                        icon: <ReceiptText size={16} />,
                                        to: (row) => `/${layout}/clientes/editar/${row.id}`,
                                        show: true,
                                    },
                                    {
                                        label: 'Clientes/Remetentes',
                                        icon: <Users size={16} />,
                                        to: (row) => `/${layout}/clientes/${row.id}/remetentes`,
                                        show: true,
                                    },
                                    {
                                        label: 'Adicionar Créditos',
                                        icon: <PlusCircle size={16} />,
                                        onClick: (cliente) => setIsModalAddCreditos({ isOpen: true, cliente }),
                                        show: true,
                                    },
                                    {
                                        label: 'Logar como cliente',
                                        icon: <LogIn size={16} />,
                                        onClick: (cliente) => LoginAsClient(cliente),
                                        show: true,
                                    },
                                    {
                                        label: 'Desativar Cliente',
                                        icon: <Power size={16} />,
                                        onClick: async (cliente) => {
                                            if (window.confirm(`Deseja DESATIVAR o cliente "${cliente.nomeEmpresa}"?`)) {
                                                try {
                                                    // Buscar dados completos do cliente antes de atualizar
                                                    const { data: clienteCompleto } = await service.getById(cliente.id);
                                                    const sanitizedData = sanitizeClienteData({ ...clienteCompleto, status: 'INATIVO' });
                                                    await service.update(cliente.id, sanitizedData as any);

                                                    // Confirma o status salvo no backend (evita UI ficar desatualizada)
                                                    const { data: clienteAtualizado } = await service.getById(cliente.id);
                                                    patchClienteStatusLocal(cliente.id, (clienteAtualizado as any)?.status || 'INATIVO');

                                                    toast.success('Cliente desativado com sucesso!');
                                                    // Força refetch imediato
                                                    await queryClient.refetchQueries({ predicate: (q: any) => q.queryKey?.[0] === 'clientes' });
                                                    queryClient.invalidateQueries({ queryKey: ['dashboard-totais'] });
                                                } catch (error: any) {
                                                    toast.error(error?.response?.data?.message || error?.message || 'Erro ao desativar cliente.');
                                                }
                                            }
                                        },
                                        show: (cliente: ICliente) => cliente.status !== 'INATIVO',
                                    },
                                    {
                                        label: 'Excluir Cliente',
                                        icon: <Trash2 size={16} />,
                                        onClick: (cliente) => handleRemoverCliente(cliente),
                                        show: true,
                                        loading: deletingClienteId !== null,
                                        disabled: (cliente: ICliente) => deletingClienteId === cliente.id,
                                    },
                                    {
                                        label: 'Reativar Cliente',
                                        icon: <Power size={16} />,
                                        onClick: (cliente) => handleReativarCliente(cliente),
                                        show: (cliente: ICliente) => cliente.status === 'INATIVO',
                                        loading: reactivatingClienteId !== null,
                                        disabled: (cliente: ICliente) => reactivatingClienteId === cliente.id,
                                    },
                                ]}
                            />
                        </div>
                        <div className="py-3">
                            <PaginacaoCustom meta={clientes?.meta} onPageChange={handlePageChange} />
                        </div>
                    </div>
                )}

                <ModalAdicionarCredito
                    data={isModalAddCreditos?.cliente}
                    isOpen={isModalAddCreditos?.isOpen}
                    onClose={() => setIsModalAddCreditos({ isOpen: false, cliente: {} as ICliente })}
                />
            </>
        </Content>
    );
};
