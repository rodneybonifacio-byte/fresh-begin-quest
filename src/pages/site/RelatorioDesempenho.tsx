import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useSearchParams } from 'react-router-dom';
import { DashboardService } from '../../services/DashboardService';
import type { IRelatorioDesempenhoResponse } from '../../types/dashboard/IRelatorioDesempenho';
import { useFetchQuery } from '../../hooks/useFetchQuery';
import { LoadSpinner } from '../../components/loading';
import { formatCpfCnpj } from '../../utils/lib.formats';
import { useEffect, useState } from 'react';
import { KpiCard } from '../../components/KpiCard';

export const RelatorioDesempenho = () => {

    const [searchParams] = useSearchParams();
    const filtros = Object.fromEntries(searchParams.entries());
    const dashboardService = new DashboardService();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const [isMobile, setIsMobile] = useState(false);
    const [showAllStates, setShowAllStates] = useState(false);

    useEffect(() => {
        const checkSize = () => setIsMobile(window.innerWidth < 640); // Tailwind 'sm'
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);


    const handleCardSelect = (index: number) => {
        setActiveIndex(prev => (prev === index ? null : index)); // toggle
    };

    const { data: response, isLoading } = useFetchQuery<IRelatorioDesempenhoResponse>(
        ['dashboard-geral', filtros],
        async () => {
            const params: { periodo?: string, remetenteId?: string, dataIni?: string, dataFim?: string, regiaoUf?: string } = {};

            const remetenteId = searchParams.get('remetenteId') || undefined;
            const dataIni = searchParams.get('dataIni') || undefined;
            const dataFim = searchParams.get('dataFim') || undefined;
            const regiaoUf = searchParams.get('regiaoUf') || undefined;


            if (dataIni) params.dataIni = dataIni;
            if (dataFim) params.dataFim = dataFim;
            if (remetenteId) params.remetenteId = remetenteId;
            if (regiaoUf) params.regiaoUf = regiaoUf;

            return await dashboardService.getRelatorioDesempenho(params);
        }
    )

    if (isLoading) {
        return <LoadSpinner mensagem='Carregando relatório de desempenho...' />;
    }

    const groupedStateData = response?.relatorio.groupedStateData || [];
    const groupedByServico = response?.relatorio.groupedByServico || [];
    const deliveryChartOptions: ApexOptions = {
        chart: {
            type: 'donut',
            events: {
                dataPointSelection: (_event, _chartContext, config) => {
                    const index = config.dataPointIndex;
                    setActiveIndex(prev => (prev === index ? null : index)); // toggle
                }
            }
        },
        labels: [
            'Entregas Antecipadas',
            'Entregas no Prazo',
            'Entregas Fora do Prazo',
            'Em Trânsito - Dentro do Prazo',
            'Em Trânsito - Fora do Prazo'
        ],
        legend: { position: 'bottom' },
        tooltip: {
            y: {
                formatter: (value: number, { series }: { series: number[]; seriesIndex: number; w: any }) => {
                    const total = series.reduce((a: number, b: number) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${value} (${percentage}%)`;
                }
            }
        }
    };

    const deliveryChartData: number[] = [
        response?.relatorio.data.entregues_antes.total || 0,
        response?.relatorio.data.entregues_no_prazo.total || 0,
        response?.relatorio.data.entregues_atraso.total || 0,
        response?.relatorio.data.em_transito_no_prazo.total || 0,
        response?.relatorio.data.em_transito_com_atraso.total || 0
    ];

    const top5GroupedStateData = groupedStateData.slice()
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, isMobile && !showAllStates ? 5 : 10);

    const stateChartOptions: ApexOptions = {
        chart: { stacked: false, type: 'line' },
        xaxis: {
            categories: top5GroupedStateData.map((d: any) => d.uf)
        },
        legend: { position: 'bottom' },
        stroke: {
            width: 2, // valor entre 1 e 5 geralmente fica bom
            curve: 'smooth' // opcional, para suavizar a linha
        },
        tooltip: {
            y: {
                formatter: (val: number) => `${val} envios`
            }
        }
    };

    const stateChartData = [
        {
            name: 'Entregas Antecipadas',
            data: top5GroupedStateData.map((d: any) => d.antes),
            color: '#10B981'
        },
        {
            name: 'Entregas no Prazo',
            data: top5GroupedStateData.map((d: any) => d.noPrazo),
            color: '#3B82F6'
        },
        {
            name: 'Entregas Fora do Prazo',
            data: top5GroupedStateData.map((d: any) => d.atraso),
            color: '#EF4444'
        }
    ];

    const serviceChartOptions: ApexOptions = {
        chart: { type: 'pie' },
        labels: groupedByServico.map((s: any) => s.servico),
        legend: { position: 'bottom' },
        tooltip: {
            y: {
                formatter: (value: number, { seriesIndex }: { series: number[]; seriesIndex: number; w: any }) => {
                    const percentual = groupedByServico[seriesIndex].percentual;
                    return `${value} (${percentual}%)`;
                }
            }
        }
    };

    const serviceChartData: number[] = groupedByServico.map((s: any) => s.total);

    const kpis = [
        {
            percentual: response?.relatorio.data.entregues_antes.percentual || 0,
            titulo: response?.relatorio.data.entregues_antes.tituloKpi || 'Entregues Antecipadas',
            total: response?.relatorio.data.entregues_antes.total || 0,
            colorClass: 'text-emerald-600',
            barColor: '#10B981',
        },
        {
            percentual: response?.relatorio.data.entregues_no_prazo.percentual || 0,
            titulo: response?.relatorio.data.entregues_no_prazo.tituloKpi || 'Entregas no Prazo',
            total: response?.relatorio.data.entregues_no_prazo.total || 0,
            colorClass: 'text-blue-600',
            barColor: '#3B82F6',
        },
        {
            percentual: response?.relatorio.data.entregues_atraso.percentual || 0,
            titulo: response?.relatorio.data.entregues_atraso.tituloKpi || 'Entregas Fora do Prazo',
            total: response?.relatorio.data.entregues_atraso.total || 0,
            colorClass: 'text-orange-600',
            barColor: '#F97316',
        },
        {
            percentual: response?.relatorio.data.em_transito_no_prazo.percentual || 0,
            titulo: response?.relatorio.data.em_transito_no_prazo.tituloKpi || 'Em Trânsito - Dentro do Prazo',
            total: response?.relatorio.data.em_transito_no_prazo.total || 0,
            colorClass: 'text-yellow-600',
            barColor: '#EAB308',
        },
        {
            percentual: response?.relatorio.data.em_transito_com_atraso.percentual || 0,
            titulo: response?.relatorio.data.em_transito_com_atraso.tituloKpi || 'Em Trânsito - Fora do Prazo',
            total: response?.relatorio.data.em_transito_com_atraso.total || 0,
            colorClass: 'text-purple-600',
            barColor: '#8B5CF6',
        }
    ];


    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-gradient-to-r from-purple-800 to-orange-500 text-white p-6 rounded-xl mb-6">
                <h1 className="text-3xl font-bold">Relatório de Desempenho de Envios</h1>
                <p className="text-white/90 mt-2">Análise de entregas por prazo e região</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-white rounded-xl shadow">
                    <h3 className="text-sm font-semibold text-gray-700">Nome</h3>
                    <p className="text-lg font-medium">{response?.relatorio.data.cliente || 'N/A'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow">
                    <h3 className="text-sm font-semibold text-gray-700">CNPJ</h3>
                    <p className="text-lg font-medium">{formatCpfCnpj(response?.relatorio.data.clienteCpfCnpj || '') || 'N/A'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow">
                    <h3 className="text-sm font-semibold text-gray-700">Total de Envios</h3>
                    <p className="text-2xl font-bold text-purple-800">{response?.relatorio.data.total || 0}</p>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <h2 className="text-xl font-semibold text-purple-800 mb-4 flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                    </svg>
                    Desempenho de Entregas
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {kpis.map((kpi, index) => (
                        <KpiCard
                            key={index}
                            index={index}
                            activeIndex={activeIndex}
                            onClick={handleCardSelect}
                            {...kpi}
                        />
                    ))}
                </div>
                <div className="h-80">
                    <Chart options={deliveryChartOptions} series={deliveryChartData} type="donut" height={300} />
                </div>
            </div>

            <div className="border-b border-gray-200">
                <h2 className="text-xl font-semibold text-purple-800 mb-4 flex flex-col">
                    <div className='flex items-center gap-2'>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Desempenho por Estado
                    </div>

                    {isMobile && (
                        <div className="">
                            <button
                                onClick={() => setShowAllStates(prev => !prev)}
                                className="text-xs text-purple-600 hover:underline transition"
                            >
                                {showAllStates ? 'Mostrar menos' : 'Mostrar mais'}
                            </button>
                        </div>
                    )}
                </h2>

                <div className="h-80 mb-8">
                    <Chart options={stateChartOptions} series={stateChartData} type="line" height={300} />
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-xl font-semibold text-purple-800 mb-4 flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                    </svg>
                    Desempenho por Serviço
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Chart options={serviceChartOptions} series={serviceChartData} type="pie" height={300} />
                    <div className="grid gap-4">
                        {groupedByServico.map((s: any, i: number) => (
                            <div key={i} className="p-4 flex flex-col">
                                <h3 className="font-semibold text-gray-700 mb-2">{s.servico}</h3>
                                <div className="p-4 bg-white rounded-xl shadow">
                                    <div className="grid grid-cols-3 text-center text-sm">
                                        <div className='flex flex-col items-center gap-2'>
                                            <div className="text-gray-500">{s.antes.tituloKpi}</div>
                                            <div className="font-bold text-2xl text-emerald-600">{s.antes.percentual}%</div>
                                        </div>
                                        <div className='flex flex-col items-center gap-2'>
                                            <div className="text-gray-500">{s.noPrazo.tituloKpi}</div>
                                            <div className="font-bold text-2xl text-blue-600">{s.noPrazo.percentual}%</div>
                                        </div>
                                        <div className='flex flex-col items-center gap-2'>
                                            <div className="text-gray-500">{s.atraso.tituloKpi}</div>
                                            <div className="font-bold text-2xl text-red-600">{s.atraso.percentual}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="text-center text-sm text-gray-500 mt-8">
                <p><strong>RELATÓRIO DE DESEMPENHO DE ENVIOS</strong></p>
                <p>Relatório gerado automaticamente em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                <p>&copy; 2025 Análise de Logística. Todos os direitos reservados.</p>
            </div>
        </div>
    );
};
