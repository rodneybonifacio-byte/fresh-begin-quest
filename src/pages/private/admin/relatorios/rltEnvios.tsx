import { DollarSign, Filter, PackageCheck, Printer, ReceiptText, ShoppingCart, Users, Wallet, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadSpinner } from '../../../../components/loading';
import { PaginacaoCustom } from '../../../../components/PaginacaoCustom';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useGlobalConfig } from '../../../../providers/GlobalConfigContext';
import { EmissaoService } from '../../../../services/EmissaoService';
import type { IDashboard } from '../../../../types/IDashboard';
import type { IEmissao } from '../../../../types/IEmissao';
import type { IResponse } from '../../../../types/IResponse';
import { Content } from '../../Content';
import { FiltroEmissao } from '../../emissao/FiltroEmissao';
import { ModalViewErroPostagem } from '../../emissao/ModalViewErroPostagem';

import { DataTable } from '../../../../components/DataTable';
import { ResponsiveTabMenu } from '../../../../components/ResponsiveTabMenu';
import { StatusBadgeEmissao } from '../../../../components/StatusBadgeEmissao';
import { useImprimirEtiquetaPDF } from '../../../../hooks/useImprimirEtiquetaPDF';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { formatDateTime } from '../../../../utils/date-utils';
import { calcularLucro, formatMoedaDecimal } from '../../../../utils/formatCurrency';
import { formatCpfCnpj } from '../../../../utils/lib.formats';
import { ModalViewPDF } from '../../emissao/ModalViewPDF';
import { ModalAtualizarPrecos } from './ModalAtualizarPrecos';
import { exportEmissoesToExcel } from '../../../../utils/exportToExcel';

const RltEnvios = () => {
    const config = useGlobalConfig();
    const { setIsLoading } = useLoadingSpinner();
    const perPage = config.pagination.perPage;
    const [page, setPage] = useState<number>(1);
    const [tab, setTab] = useState<string>('PRE_POSTADO');

    const service = new EmissaoService();
    const [isModalViewErroPostagem, setIsModalViewErroPostagem] = useState(false);
    const [erroPostagem, setErroPostagem] = useState<string | undefined>('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [data, setData] = useState<IEmissao[]>([]);
    const [isModalViewPDF, setIsModalViewPDF] = useState(false);
    const [etiqueta, setEtiqueta] = useState<{ nome: string; dados: string }>();
    const [isModalUpdatePrecos, setIsModalUpdatePrecos] = useState<{ isOpen: boolean; emissao: IEmissao }>({ isOpen: false, emissao: {} as IEmissao });

    const [searchParams] = useSearchParams();
    const filtros = Object.fromEntries(searchParams.entries());

    //Dashboard estatisticas
    const { data: dashboard } = useFetchQuery<IDashboard>(['dashboard-totais', 'admin', filtros], async () => {
        const response = await service.dashboard(filtros, 'dashboard/admin');
        return response ?? {}; // <- evita retorno undefined
    });

    const {
        data: emissoes,
        isLoading,
        isError,
    } = useFetchQuery<IResponse<IEmissao[]>>(['emissoes', filtros, 'admin', page, tab], async () => {
        const params: {
            limit: number;
            offset: number;
            dataIni?: string;
            dataFim?: string;
            destinatario?: string;
            status?: string;
            codigoObjeto?: string;
            clienteId?: string;
            remetenteId?: string;
            transportadora?: string;
        } = {
            limit: perPage,
            offset: (page - 1) * perPage,
            status: tab,
        };

        const dataIni = searchParams.get('dataIni') || undefined;
        const dataFim = searchParams.get('dataFim') || undefined;
        const status = searchParams.get('status') || undefined;
        const clienteId = searchParams.get('clienteId') || undefined;
        const remetenteId = searchParams.get('remetenteId') || undefined;
        const transportadora = searchParams.get('transportadora') || undefined;

        if (dataIni) params.dataIni = dataIni;
        if (dataFim) params.dataFim = dataFim;
        if (status) params.status = status;
        if (clienteId) params.clienteId = clienteId;
        if (remetenteId) params.remetenteId = remetenteId;
        if (transportadora) params.transportadora = transportadora;

        return await service.getAll(params, 'admin');
    });

    const handleOnViewErroPostagem = async (jsonContent?: string) => {
        setErroPostagem(jsonContent);
        setIsModalViewErroPostagem(true);
    };

    const handlerToggleFilter = () => {
        setIsFilterOpen((prev) => !prev);
    };

    const handleExportToExcel = async () => {
        try {
            setIsLoading(true);
            
            // Buscar filtros
            const dataIni = searchParams.get('dataIni') || undefined;
            const dataFim = searchParams.get('dataFim') || undefined;
            const status = searchParams.get('status') || tab;
            const clienteId = searchParams.get('clienteId') || undefined;
            const remetenteId = searchParams.get('remetenteId') || undefined;
            const transportadora = searchParams.get('transportadora') || undefined;

            // Buscar TODOS os registros em lotes
            const batchSize = 100;
            let offset = 0;
            let allData: IEmissao[] = [];
            let hasMore = true;

            while (hasMore) {
                const params: {
                    limit: number;
                    offset: number;
                    dataIni?: string;
                    dataFim?: string;
                    status?: string;
                    clienteId?: string;
                    remetenteId?: string;
                    transportadora?: string;
                } = {
                    limit: batchSize,
                    offset: offset,
                };

                if (dataIni) params.dataIni = dataIni;
                if (dataFim) params.dataFim = dataFim;
                if (status) params.status = status;
                if (clienteId) params.clienteId = clienteId;
                if (remetenteId) params.remetenteId = remetenteId;
                if (transportadora) params.transportadora = transportadora;

                const response = await service.getAll(params, 'admin');
                
                if (response?.data && response.data.length > 0) {
                    allData = [...allData, ...response.data];
                    offset += batchSize;
                    
                    // Se retornou menos que o batchSize, significa que não há mais dados
                    if (response.data.length < batchSize) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            if (allData.length > 0) {
                exportEmissoesToExcel(allData, `relatorio-envios-${dataIni || 'todos'}-${dataFim || 'todos'}`);
            }
        } catch (error) {
            console.error('Erro ao exportar:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (emissoes?.data) {
            setData(emissoes.data);
        }
    }, [emissoes]);

    const handlePageChange = async (pageNumber: number) => {
        setPage(pageNumber);
    };

    const { onEmissaoImprimir } = useImprimirEtiquetaPDF();
    const handleOnPDF = async (emissao: IEmissao, mergePdf: boolean = false) => {
        let novaEtiqueta: IResponse<{ nome: string; dados: string }>;
        if (mergePdf) {
            novaEtiqueta = await onEmissaoImprimir(emissao, 'merge', setIsLoading, setIsModalViewPDF);
        } else {
            novaEtiqueta = await onEmissaoImprimir(emissao, 'etiqueta', setIsLoading, setIsModalViewPDF);
        }
        setEtiqueta(novaEtiqueta.data);
    };

    return (
        <Content
            titulo="Acompanhamento de envios"
            subTitulo="Acompanhe os envios realizados, visualize detalhes e estatísticas em geral."
            isButton
            button={[
                {
                    label: 'Exportar XLSX',
                    onClick: handleExportToExcel,
                    icon: <Download size={22} />,
                    bgColor: 'bg-green-600',
                },
                {
                    label: 'Filtrar',
                    onClick: () => handlerToggleFilter(),
                    icon: <Filter size={22} />,
                },
            ]}
            data={emissoes?.data && emissoes.data.length > 0 ? emissoes.data : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            
            {/* Indicador de Filtros Ativos */}
            {(searchParams.get('dataIni') || searchParams.get('dataFim') || searchParams.get('status') || 
              searchParams.get('clienteId') || searchParams.get('remetenteId') || searchParams.get('transportadora')) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                        <Filter className="text-blue-600 dark:text-blue-400 mt-0.5" size={18} />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                Filtros Aplicados (serão considerados na exportação):
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {searchParams.get('dataIni') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                        Período: {searchParams.get('dataIni')} até {searchParams.get('dataFim')}
                                    </span>
                                )}
                                {searchParams.get('status') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                                        Status: {searchParams.get('status')}
                                    </span>
                                )}
                                {searchParams.get('transportadora') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                                        Transportadora: {searchParams.get('transportadora')}
                                    </span>
                                )}
                                {searchParams.get('clienteId') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200">
                                        Cliente filtrado
                                    </span>
                                )}
                                {searchParams.get('remetenteId') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 dark:bg-pink-800 text-pink-800 dark:text-pink-200">
                                        Remetente filtrado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <>
                {isFilterOpen && <FiltroEmissao onCancel={handlerToggleFilter} isDestinatario />}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-4">
                    {/* Total de Envios */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Total de Envios</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{dashboard?.totalEnvios}</p>
                            </div>
                            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                                <PackageCheck className="text-purple-600 dark:text-purple-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Total de Vendas */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Vendas Aproximado</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{formatMoedaDecimal(dashboard?.totalVendas || 0)}</p>
                            </div>
                            <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                                <ShoppingCart className="text-orange-600 dark:text-orange-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Custo Total */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Custo Aproximado</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{formatMoedaDecimal(dashboard?.totalCusto || 0)}</p>
                            </div>
                            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg">
                                <Wallet className="text-red-600 dark:text-red-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Lucro Total */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Lucro Aproximado</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">
                                    {calcularLucro(Number(dashboard?.totalVendas), Number(dashboard?.totalCusto))}
                                </p>
                            </div>
                            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                                <DollarSign className="text-green-600 dark:text-green-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Total de Clientes */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Total de Clientes</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{dashboard?.totalClientes}</p>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                                <Users className="text-blue-600 dark:text-blue-400 text-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </>
            <ResponsiveTabMenu tab={tab} setTab={setTab}>
                {!isLoading && !isError && emissoes && emissoes.data.length > 0 && (
                    <>
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
                            <DataTable<IEmissao>
                                data={data}
                                rowKey={(row) => row.id?.toString() || ''}
                                columns={[
                                    {
                                        header: 'Código Objeto',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-primary">{row.codigoObjeto}</span>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Transportadora',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.transportadora}</span>
                                                {row.transportadora?.toLocaleUpperCase() === 'CORREIOS' && (
                                                    <small className="text-slate-500 dark:text-slate-400">{row.servico}</small>
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Remetente',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.remetenteNome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {row.remetente?.endereco?.localidade || ''} - {row.remetente?.endereco?.uf || ''}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Cliente',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm">{row.cliente?.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {formatCpfCnpj(row.cliente?.cpfCnpj || '')}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Destinatário',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.destinatario?.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {row.destinatario?.endereco?.localidade || ''} - {row.destinatario?.endereco?.uf || ''}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Valores',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-green-600 dark:text-green-400">
                                                    R$ {row.valor || 0}
                                                </span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    Custo: R$ {row.valorPostagem || 0}
                                                </small>
                                                <small className="font-medium text-blue-600 dark:text-blue-400">
                                                    Lucro: {calcularLucro(row.valor || 0, row.valorPostagem || 0)}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'NF',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                {row.numeroNotaFiscal && (
                                                    <span className="text-sm">{row.numeroNotaFiscal}</span>
                                                )}
                                                {row.valorNotaFiscal > 0 && (
                                                    <small className="text-slate-500 dark:text-slate-400">
                                                        R$ {row.valorNotaFiscal}
                                                    </small>
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Status',
                                        accessor: (row) => (
                                            <StatusBadgeEmissao
                                                status={row.status}
                                                mensagensErrorPostagem={row.mensagensErrorPostagem}
                                                handleOnViewErroPostagem={handleOnViewErroPostagem}
                                            />
                                        ),
                                    },
                                    {
                                        header: 'Status',
                                        accessor: (row) => (
                                            <StatusBadgeEmissao
                                                status={row.statusFaturamento}
                                                mensagensErrorPostagem={row.mensagensErrorPostagem}
                                                handleOnViewErroPostagem={handleOnViewErroPostagem}
                                            />
                                        ),
                                    },
                                    {
                                        header: 'Criado em',
                                        accessor: (row) => {
                                            return formatDateTime(row.criadoEm);
                                        },
                                    },
                                ]}
                                actionTitle={(row) => row.codigoObjeto || '---'}
                                actions={[
                                    {
                                        label: 'Detalhamento',
                                        icon: <ReceiptText size={16} />,
                                        to: (row) => `./detail/${row.id}`,
                                        show: true,
                                    },
                                    {
                                        label: 'Imprimir Etiqueta',
                                        icon: <Printer size={16} />,
                                        onClick: (row) => handleOnPDF(row, true),
                                        show: (row) => !row.mensagensErrorPostagem && !['ENTREGUE', 'EM_TRANSITO', 'POSTADO'].includes(row.status as string),
                                    },
                                    {
                                        label: 'Atualizar Preços',
                                        icon: <DollarSign size={16} />,
                                        onClick: (emissao) => setIsModalUpdatePrecos({ isOpen: true, emissao }),
                                        show: true,
                                    },
                                ]}
                            />
                        </div>
                        <div className="py-3">
                            <PaginacaoCustom meta={emissoes?.meta} onPageChange={handlePageChange} />
                        </div>
                    </>
                )}
            </ResponsiveTabMenu>

            <ModalViewErroPostagem isOpen={isModalViewErroPostagem} jsonContent={erroPostagem || ''} onCancel={() => setIsModalViewErroPostagem(false)} />

            <ModalViewPDF isOpen={isModalViewPDF} base64={etiqueta?.dados || ''} onCancel={() => setIsModalViewPDF(false)} />
            <ModalAtualizarPrecos
                data={isModalUpdatePrecos?.emissao}
                isOpen={isModalUpdatePrecos?.isOpen}
                onClose={() => setIsModalUpdatePrecos({ isOpen: false, emissao: {} as IEmissao })}
            />
        </Content>
    );
};

export default RltEnvios;
