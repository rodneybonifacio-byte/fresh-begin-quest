import { DollarSign, Filter, Download, PackageCheck, ShoppingCart, Users, TrendingUp, Package, Truck, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
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
import { FiltroEmissao } from '../../emissao/FiltroEmissao';
import { ModalViewErroPostagem } from '../../emissao/ModalViewErroPostagem';
import { DataTable } from '../../../../components/DataTable';
import { StatusBadgeEmissao } from '../../../../components/StatusBadgeEmissao';
import { useImprimirEtiquetaPDF } from '../../../../hooks/useImprimirEtiquetaPDF';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { formatDateTime } from '../../../../utils/date-utils';
import { calcularLucro, formatMoedaDecimal } from '../../../../utils/formatCurrency';
import { formatCpfCnpj } from '../../../../utils/lib.formats';
import { ModalViewPDF } from '../../emissao/ModalViewPDF';
import { ModalAtualizarPrecos } from './ModalAtualizarPrecos';
import { exportEmissoesToExcel } from '../../../../utils/exportToExcel';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

const ModernRltEnvios = () => {
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
    const [etiqueta, setEtiqueta] = useState<{ nome: string; dados: string } | undefined>();
    const [isModalUpdatePrecos, setIsModalUpdatePrecos] = useState<{ isOpen: boolean; emissao: IEmissao }>({ isOpen: false, emissao: {} as IEmissao });

    const [searchParams] = useSearchParams();
    const filtros = Object.fromEntries(searchParams.entries());

    const { data: dashboard } = useFetchQuery<IDashboard>(['dashboard-totais', 'admin', filtros], async () => {
        const response = await service.dashboard(filtros, 'dashboard/admin');
        return response ?? {};
    });

    // Buscar dados agregados para gráficos (todos os dados, sem paginação)
    const { data: dadosAgregados } = useFetchQuery<IResponse<IEmissao[]>>(['emissoes-agregadas', filtros, tab], async () => {
        const params: any = { status: tab };
        
        const dataIni = searchParams.get('dataIni') || undefined;
        const dataFim = searchParams.get('dataFim') || undefined;
        const clienteId = searchParams.get('clienteId') || undefined;
        const remetenteId = searchParams.get('remetenteId') || undefined;
        const transportadora = searchParams.get('transportadora') || undefined;

        if (dataIni) params.dataIni = dataIni;
        if (dataFim) params.dataFim = dataFim;
        if (clienteId) params.clienteId = clienteId;
        if (remetenteId) params.remetenteId = remetenteId;
        if (transportadora) params.transportadora = transportadora;

        // Buscar todos os dados para agregação
        const allData: IEmissao[] = [];
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const batchParams = { ...params, limit: batchSize, offset };
            const batch = await service.getAll(batchParams);
            if (batch?.data && batch.data.length > 0) {
                allData.push(...batch.data);
                offset += batchSize;
                hasMore = batch.data.length === batchSize;
            } else {
                hasMore = false;
            }
        }

        return { data: allData } as IResponse<IEmissao[]>;
    });

    const {
        data: emissoes,
        isLoading,
    } = useFetchQuery<IResponse<IEmissao[]>>(['emissoes', filtros, 'admin', page, tab], async () => {
        const params: any = {
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

        const response = await service.getAll(params);
        return response;
    });

    useEffect(() => {
        if (emissoes?.data) {
            setData(emissoes.data);
        }
    }, [emissoes]);

    const { onEmissaoImprimir } = useImprimirEtiquetaPDF();

    const handleOnViewErroPostagem = (erro: string) => {
        setErroPostagem(erro);
        setIsModalViewErroPostagem(true);
    };

    const handlerToggleFilter = () => setIsFilterOpen(!isFilterOpen);

    const handleExportToExcel = async () => {
        try {
            setIsLoading(true);
            const params: any = { status: tab };
            if (filtros.dataIni) params.dataIni = filtros.dataIni;
            if (filtros.dataFim) params.dataFim = filtros.dataFim;
            if (filtros.clienteId) params.clienteId = filtros.clienteId;
            if (filtros.remetenteId) params.remetenteId = filtros.remetenteId;
            if (filtros.transportadora) params.transportadora = filtros.transportadora;

            const totalRecords = emissoes?.meta?.totalRecords || 0;
            const batchSize = 100;
            let allData: IEmissao[] = [];

            for (let offset = 0; offset < totalRecords; offset += batchSize) {
                const batchParams = { ...params, limit: batchSize, offset };
                const batch = await service.getAll(batchParams);
                if (batch?.data) {
                    allData = [...allData, ...batch.data];
                }
            }

            const dateRange = filtros.dataIni && filtros.dataFim ? `_${filtros.dataIni}_a_${filtros.dataFim}` : '';
            await exportEmissoesToExcel(allData, `relatorio_envios${dateRange}.xlsx`);
        } catch (error) {
            console.error('Erro ao exportar:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => setPage(newPage);

    const handleOnPDF = async (emissao: IEmissao) => {
        if (!emissao.id) return;
        try {
            const response = await onEmissaoImprimir(emissao, 'merge', setIsLoading);
            if (response?.data) {
                setEtiqueta(response.data);
                setIsModalViewPDF(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const tabItems = [
        { label: 'Pré-Postados', value: 'PRE_POSTADO', icon: <Clock className="w-4 h-4" /> },
        { label: 'Postados', value: 'POSTADO', icon: <Package className="w-4 h-4" /> },
        { label: 'Coletados', value: 'COLETADO', icon: <Truck className="w-4 h-4" /> },
        { label: 'Em Trânsito', value: 'EM_TRANSITO', icon: <TrendingUp className="w-4 h-4" /> },
        { label: 'Entregues', value: 'ENTREGUE', icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'Cancelados', value: 'CANCELADO', icon: <XCircle className="w-4 h-4" /> },
    ];

    // Processar dados reais para gráficos
    const processarDadosGraficos = () => {
        if (!dadosAgregados?.data) {
            return {
                enviosPorMes: Array(12).fill(0),
                transportadoras: { labels: [], valores: [] }
            };
        }

        const dados = dadosAgregados.data;

        // Envios por mês
        const enviosPorMes = Array(12).fill(0);
        dados.forEach(emissao => {
            if (emissao.criadoEm) {
                const mes = new Date(emissao.criadoEm).getMonth();
                enviosPorMes[mes]++;
            }
        });

        // Distribuição por transportadora
        const transportadorasMap: { [key: string]: number } = {};
        dados.forEach(emissao => {
            const transp = emissao.transportadora || 'Outros';
            transportadorasMap[transp] = (transportadorasMap[transp] || 0) + 1;
        });

        const transportadoras = {
            labels: Object.keys(transportadorasMap),
            valores: Object.values(transportadorasMap)
        };

        return { enviosPorMes, transportadoras };
    };

    const dadosGraficos = processarDadosGraficos();

    // Gráfico de barras - Envios por mês
    const barChartOptions: ApexOptions = {
        chart: {
            type: 'bar',
            height: 300,
            toolbar: { show: false },
            background: 'transparent',
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                columnWidth: '60%',
            }
        },
        colors: ['#F2541B'],
        dataLabels: { enabled: false },
        xaxis: {
            categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '12px',
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '12px',
                }
            }
        },
        grid: {
            borderColor: '#e2e8f0',
            strokeDashArray: 4,
        },
        tooltip: {
            theme: 'light',
            y: {
                formatter: (val) => `${val} envios`
            }
        }
    };

    const barChartSeries = [{
        name: 'Envios',
        data: dadosGraficos.enviosPorMes
    }];

    // Gráfico de pizza - Transportadoras
    const pieChartOptions: ApexOptions = {
        chart: {
            type: 'donut',
            height: 300,
        },
        labels: dadosGraficos.transportadoras.labels.length > 0 ? dadosGraficos.transportadoras.labels : ['Sem dados'],
        colors: ['#F2541B', '#000000', '#94a3b8', '#3b82f6', '#a855f7'],
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '14px',
                fontWeight: 'bold',
            }
        },
        legend: {
            position: 'bottom',
            fontSize: '12px',
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#1e293b',
                        }
                    }
                }
            }
        },
        tooltip: {
            y: {
                formatter: (val) => `${val} envios`
            }
        }
    };

    const pieChartSeries = dadosGraficos.transportadoras.valores.length > 0 ? dadosGraficos.transportadoras.valores : [0];

    const columns = [
        {
            header: 'Código',
            accessor: (row: IEmissao) => (
                <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {row.codigoObjeto || '-'}
                </div>
            ),
        },
        {
            header: 'Transportadora',
            accessor: (row: IEmissao) => (
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                        {row.transportadora || '-'}
                    </span>
                </div>
            ),
        },
        {
            header: 'Serviço',
            accessor: (row: IEmissao) => (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {row.servico || '-'}
                </span>
            ),
        },
        {
            header: 'Cliente',
            accessor: (row: IEmissao) => (
                <div className="text-xs">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{row.cliente?.nome || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">{formatCpfCnpj(row.cliente?.cpfCnpj || '')}</div>
                </div>
            ),
        },
        {
            header: 'Destinatário',
            accessor: (row: IEmissao) => (
                <div className="text-xs">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{row.destinatario?.nome || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">
                        {row.destinatario?.endereco?.localidade}/{row.destinatario?.endereco?.uf}
                    </div>
                </div>
            ),
        },
        {
            header: 'Valor',
            accessor: (row: IEmissao) => (
                <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatMoedaDecimal(Number(row.cotacao?.preco) || 0)}
                </span>
            ),
        },
        {
            header: 'Custo',
            accessor: (row: IEmissao) => {
                const custo = typeof row.valorPostagem === 'string' ? parseFloat(row.valorPostagem) : row.valorPostagem;
                return (
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {formatMoedaDecimal(custo || 0)}
                    </span>
                );
            },
        },
        {
            header: 'Lucro',
            accessor: (row: IEmissao) => {
                const preco = Number(row.cotacao?.preco) || 0;
                const custo = Number(row.valorPostagem) || 0;
                return (
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {calcularLucro(preco, custo)}
                    </span>
                );
            },
        },
        {
            header: 'Status',
            accessor: (row: IEmissao) => (
                <StatusBadgeEmissao
                    status={row.status || ''}
                    mensagensErrorPostagem={row.mensagensErrorPostagem}
                    handleOnViewErroPostagem={handleOnViewErroPostagem}
                />
            ),
        },
        {
            header: 'Data',
            accessor: (row: IEmissao) => (
                <span className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDateTime(row.criadoEm || '')}
                </span>
            ),
        },
    ];

    const actions = [
        {
            label: 'Ver Erro',
            icon: <AlertCircle className="w-4 h-4" />,
            onClick: (row: IEmissao) => handleOnViewErroPostagem(row.mensagensErrorPostagem || ''),
            visible: (row: IEmissao) => !!row.mensagensErrorPostagem,
        },
        {
            label: 'Imprimir Etiqueta',
            icon: <Download className="w-4 h-4" />,
            onClick: handleOnPDF,
            visible: (row: IEmissao) => row.status === 'POSTADO' || row.status === 'ENTREGUE',
        },
        {
            label: 'Atualizar Preços',
            icon: <DollarSign className="w-4 h-4" />,
            onClick: (row: IEmissao) => setIsModalUpdatePrecos({ isOpen: true, emissao: row }),
        },
    ];

    if (isLoading) return <LoadSpinner />;

    return (
        <div className="min-h-screen bg-[#F5F6FA] dark:bg-slate-900">
            {/* Header Premium */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                Acompanhamento de Envios
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400">
                                Analise seus envios, acompanhe cada status e visualize seus resultados.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlerToggleFilter}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#F2541B] hover:bg-[#d94817] text-white rounded-lg font-medium shadow-lg shadow-orange-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/30"
                            >
                                <Filter className="w-4 h-4" />
                                Filtrar
                            </button>
                            <button
                                onClick={handleExportToExcel}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30"
                            >
                                <Download className="w-4 h-4" />
                                Exportar XLSX
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Total de Envios */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <PackageCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                                ▲ +18,4%
                            </span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total de Envios</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {dashboard?.totalEnvios?.toLocaleString('pt-BR') || '0'}
                        </p>
                        <div className="h-12 mt-4">
                            <ReactApexChart
                                options={{
                                    chart: { type: 'area', sparkline: { enabled: true }, background: 'transparent' },
                                    stroke: { curve: 'smooth', width: 2 },
                                    fill: { opacity: 0.3 },
                                    colors: ['#3b82f6'],
                                    tooltip: { enabled: false },
                                }}
                                series={[{ data: [30, 45, 35, 55, 45, 60, 50, 65] }]}
                                type="area"
                                height={50}
                            />
                        </div>
                    </div>

                    {/* Vendas */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                                ▲ +12,3%
                            </span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Vendas Aproximadas</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {formatMoedaDecimal(dashboard?.totalVendas || 0)}
                        </p>
                        <div className="h-12 mt-4">
                            <ReactApexChart
                                options={{
                                    chart: { type: 'area', sparkline: { enabled: true }, background: 'transparent' },
                                    stroke: { curve: 'smooth', width: 2 },
                                    fill: { opacity: 0.3 },
                                    colors: ['#a855f7'],
                                    tooltip: { enabled: false },
                                }}
                                series={[{ data: [25, 40, 30, 50, 40, 55, 45, 60] }]}
                                type="area"
                                height={50}
                            />
                        </div>
                    </div>

                    {/* Custo */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Custo Aproximado</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {formatMoedaDecimal(dashboard?.totalCusto || 0)}
                        </p>
                        <div className="h-12 mt-4">
                            <ReactApexChart
                                options={{
                                    chart: { type: 'area', sparkline: { enabled: true }, background: 'transparent' },
                                    stroke: { curve: 'smooth', width: 2 },
                                    fill: { opacity: 0.3 },
                                    colors: ['#f97316'],
                                    tooltip: { enabled: false },
                                }}
                                series={[{ data: [20, 35, 25, 45, 35, 50, 40, 55] }]}
                                type="area"
                                height={50}
                            />
                        </div>
                    </div>

                    {/* Lucro */}
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-white/20 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-white bg-white/20 px-2 py-1 rounded-full">
                                ▲ +24,1%
                            </span>
                        </div>
                        <h3 className="text-sm font-medium text-emerald-50 mb-1">Lucro Aproximado</h3>
                        <p className="text-3xl font-bold text-white mb-2">
                            {formatMoedaDecimal((dashboard?.totalVendas || 0) - (dashboard?.totalCusto || 0))}
                        </p>
                        <div className="h-12 mt-4">
                            <ReactApexChart
                                options={{
                                    chart: { type: 'area', sparkline: { enabled: true }, background: 'transparent' },
                                    stroke: { curve: 'smooth', width: 2 },
                                    fill: { opacity: 0.3 },
                                    colors: ['#ffffff'],
                                    tooltip: { enabled: false },
                                }}
                                series={[{ data: [10, 20, 15, 30, 25, 35, 30, 40] }]}
                                type="area"
                                height={50}
                            />
                        </div>
                    </div>

                    {/* Clientes */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total de Clientes</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {dashboard?.totalClientes?.toLocaleString('pt-BR') || '0'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Clientes ativos</p>
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Envios por Mês</h3>
                        <ReactApexChart options={barChartOptions} series={barChartSeries} type="bar" height={300} />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribuição por Transportadora</h3>
                        <ReactApexChart options={pieChartOptions} series={pieChartSeries} type="donut" height={300} />
                    </div>
                </div>

                {/* Abas Modernas */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="border-b border-slate-200 dark:border-slate-700">
                        <div className="flex overflow-x-auto">
                            {tabItems.map((item) => {
                                const isActive = tab === item.value;
                                const count = emissoes?.meta?.totalRecords || 0;
                                return (
                                    <button
                                        key={item.value}
                                        onClick={() => setTab(item.value)}
                                        className={`
                                            flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200
                                            ${isActive 
                                                ? 'text-[#F2541B] border-b-2 border-[#F2541B] bg-orange-50/50 dark:bg-orange-900/10' 
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }
                                        `}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                        {isActive && (
                                            <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-[#F2541B] text-white rounded-full">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tabela */}
                    <div className="p-6">
                        <DataTable
                            data={data}
                            columns={columns}
                            actions={actions}
                        />
                        <div className="mt-6">
                            <PaginacaoCustom meta={emissoes?.meta} onPageChange={handlePageChange} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isFilterOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Filtros</h2>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    ✕
                                </button>
                            </div>
                            <FiltroEmissao />
                        </div>
                    </div>
                </div>
            )}

            <ModalViewErroPostagem
                isOpen={isModalViewErroPostagem}
                jsonContent={erroPostagem || '{}'}
                onCancel={() => setIsModalViewErroPostagem(false)}
            />

            {etiqueta && (
                <ModalViewPDF
                    isOpen={isModalViewPDF}
                    base64={etiqueta.dados}
                    fileName={etiqueta.nome}
                    onCancel={() => setIsModalViewPDF(false)}
                />
            )}

            <ModalAtualizarPrecos
                isOpen={isModalUpdatePrecos.isOpen}
                data={isModalUpdatePrecos.emissao}
                onClose={() => setIsModalUpdatePrecos({ isOpen: false, emissao: {} as IEmissao })}
            />
        </div>
    );
};

export default ModernRltEnvios;
