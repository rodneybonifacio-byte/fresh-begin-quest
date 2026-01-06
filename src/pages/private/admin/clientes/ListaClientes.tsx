import { CheckCircle2, Filter, LogIn, Plus, PlusCircle, ReceiptText, Trash2, Truck, Users } from 'lucide-react';
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
    const queryClient = useQueryClient();

    const handleRemoverCliente = useCallback(async (cliente: ICliente) => {
        const confirmar = window.confirm(
            `Tem certeza que deseja remover o cliente "${cliente.nomeEmpresa}"?\n\nEsta ação não pode ser desfeita.`
        );
        
        if (!confirmar) return;

        setDeletingClienteId(cliente.id);
        try {
            await service.delete(cliente.id);
            toast.success('Cliente removido com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-totais'] });
        } catch (error: any) {
            console.error('Erro ao remover cliente:', error);
            toast.error(error?.message || 'Erro ao remover cliente. Verifique se não há dados vinculados.');
        } finally {
            setDeletingClienteId(null);
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
                                        label: 'Remover Cliente',
                                        icon: <Trash2 size={16} />,
                                        onClick: (cliente) => handleRemoverCliente(cliente),
                                        show: true,
                                        loading: deletingClienteId !== null,
                                        disabled: (cliente: ICliente) => deletingClienteId === cliente.id,
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
