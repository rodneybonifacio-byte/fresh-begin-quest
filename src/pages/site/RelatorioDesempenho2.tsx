import Chart from 'react-apexcharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoadSpinner } from '../../components/loading';
import { useFetchQuery } from '../../hooks/useFetchQuery';
import type { IRelatorioDesempenhoResponse } from '../../types/dashboard/IRelatorioDesempenho';
import { useSearchParams } from 'react-router-dom';
import { DashboardService } from '../../services/DashboardService';
import type { ApexOptions } from 'apexcharts';

export const RelatorioDesempenho2 = () => {

    const [searchParams] = useSearchParams();
    const filtros = Object.fromEntries(searchParams.entries());
    const dashboardService = new DashboardService();

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

    const chartSerieData: number[] = [
        response?.relatorio.data.entregues_antes.total || 0,
        response?.relatorio.data.entregues_no_prazo.total || 0,
        response?.relatorio.data.entregues_atraso.total || 0,
        response?.relatorio.data.em_transito_no_prazo.total || 0,
        response?.relatorio.data.em_transito_com_atraso.total || 0
    ];

    const deliveryChartData: ApexOptions = {
        chart: {
            type: 'donut',
        },
        labels: [
            'Antes do Prazo',
            'No Prazo',
            'Com Atraso',
            'Em Trânsito no Prazo',
            'Em Trânsito com Atraso',
        ],
        colors: ['#10B981', '#3B82F6', '#EA580C', '#EAB308', '#8B5CF6'],
        legend: {
            position: 'bottom',
        },
        tooltip: {
            y: {
                formatter: (value: number, { series }: { series: number[]; seriesIndex: number; w: any }) => {
                    const total = series.reduce((a: number, b: number) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${value} (${percentage}%)`;
                },
            },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200,
                    },
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        ],
    }

    const deliveryChartDataSeries = [
        {
            name: 'Antes do Prazo',
            data: response?.relatorio.groupedStateData.map((d) => d.antes) || [],
            color: '#10B981'
        },
        {
            name: 'No Prazo',
            data: response?.relatorio.groupedStateData.map((d) => d.noPrazo) || [],
            color: '#3B82F6'
        },
        {
            name: 'Com Atraso',
            data: response?.relatorio.groupedStateData.map((d) => d.atraso) || [],
            color: '#EF4444'
        },
    ]
    // Gráfico por estado
    const stateChartData: ApexOptions = {
        chart: {
            type: 'bar',
            stacked: true,
        },
        plotOptions: {
            bar: {
                horizontal: false,
            },
        },
        colors: ['#10B981', '#3B82F6', '#EF4444'],
        xaxis: {
            categories: response?.relatorio.groupedStateData.map((d) => d.uf),
        },
        legend: {
            position: 'bottom',
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        ],
    };

    // Gráfico por serviço
    const serviceChartData: ApexOptions = {
        chart: {
            type: 'pie',
        },
        labels: response?.relatorio.groupedByServico.map((s) => s.servico),
        colors: ['#8B5CF6', '#EC4899'],
        legend: {
            position: 'bottom',
        },
        tooltip: {
            y: {
                formatter: function (value: number, { seriesIndex }: { series: number[]; seriesIndex: number; w: any }) {
                    const servico = response?.relatorio.groupedByServico[seriesIndex];
                    const percentage = Math.round(
                        (value / servico!.total) * 100
                    );
                    return `${value} (${percentage}%)`;
                },
            },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200,
                    },
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        ],
    };

    // Formatação de data e hora
    const currentDate = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    const currentTime = format(new Date(), 'HH:mm', { locale: ptBR });

    return (
        <div className="bg-gray-50 min-h-screen p-4">
            <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Cabeçalho */}
                <div className="bg-gradient-to-r from-purple-900 to-orange-500 py-6 px-8 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold">Relatório de Desempenho de Envios</h1>
                            <p className="text-white/90 mt-2">Análise de entregas por prazo e região</p>
                        </div>
                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                            <div className="text-right">
                                <p className="text-sm text-white/80">Período</p>
                                <p className="font-medium">{response?.relatorio.data.periodo}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Informações do Cliente */}
                <div className="p-6 border-b border-gray-200">
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                        Informações do Cliente
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-700 mb-2">Nome</h3>
                            <p className="text-lg font-medium">{response?.relatorio.data.cliente}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-700 mb-2">CNPJ</h3>
                            <p className="text-lg font-medium">{response?.relatorio.data.clienteCpfCnpj}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-700 mb-2">Total de Envios</h3>
                            <p className="text-2xl font-bold text-purple-800">{response?.relatorio.data.total}</p>
                        </div>
                    </div>
                </div>

                {/* KPIs Principais */}
                <div className="p-6 border-b border-gray-200">
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
                        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <div className="text-2xl font-bold text-emerald-600">
                                {response?.relatorio.data.entregues_antes.percentual}%
                            </div>
                            <div className="text-gray-600">{response?.relatorio.data.entregues_antes.tituloKpi}</div>
                            <div className="h-2 bg-gray-200 rounded-full mt-2">
                                <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${response?.relatorio.data.entregues_antes.percentual}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                                {response?.relatorio.data.entregues_antes.total} envios
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {response?.relatorio.data.entregues_no_prazo.percentual}%
                            </div>
                            <div className="text-gray-600">{response?.relatorio.data.entregues_no_prazo.tituloKpi}</div>
                            <div className="h-2 bg-gray-200 rounded-full mt-2">
                                <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${response?.relatorio.data.entregues_no_prazo.percentual}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                                {response?.relatorio.data.entregues_no_prazo.total} envios
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {response?.relatorio.data.entregues_atraso.percentual}%
                            </div>
                            <div className="text-gray-600">{response?.relatorio.data.entregues_atraso.tituloKpi}</div>
                            <div className="h-2 bg-gray-200 rounded-full mt-2">
                                <div
                                    className="h-full rounded-full bg-orange-500"
                                    style={{ width: `${response?.relatorio.data.entregues_atraso.percentual}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                                {response?.relatorio.data.entregues_atraso.total} envios
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                                {response?.relatorio.data.em_transito_no_prazo.percentual}%
                            </div>
                            <div className="text-gray-600">{response?.relatorio.data.em_transito_no_prazo.tituloKpi}</div>
                            <div className="h-2 bg-gray-200 rounded-full mt-2">
                                <div
                                    className="h-full rounded-full bg-yellow-500"
                                    style={{ width: `${response?.relatorio.data.em_transito_no_prazo.percentual}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                                {response?.relatorio.data.em_transito_no_prazo.total} envios
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {response?.relatorio.data.em_transito_com_atraso.percentual}%
                            </div>
                            <div className="text-gray-600">{response?.relatorio.data.em_transito_com_atraso.tituloKpi}</div>
                            <div className="h-2 bg-gray-200 rounded-full mt-2">
                                <div
                                    className="h-full rounded-full bg-purple-500"
                                    style={{ width: `${response?.relatorio.data.em_transito_com_atraso.percentual}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                                {response?.relatorio.data.em_transito_com_atraso.total} envios
                            </div>
                        </div>
                    </div>

                    <div className="h-80">
                        <Chart
                            options={deliveryChartData}
                            series={chartSerieData}
                            type="donut"
                            height="100%"
                        />
                    </div>
                </div>

                {/* Análise por Estado */}
                <div className="p-6 border-b border-gray-200">
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
                                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Desempenho por Estado
                    </h2>

                    <div className="h-80 mb-8">
                        <Chart
                            options={stateChartData}
                            series={deliveryChartDataSeries}
                            type="bar"
                            height="100%"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-purple-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Serviço
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Entregue Antes do Prazo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Entregue no Prazo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Entregue com Atraso
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Em Trânsito no Prazo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Em Trânsito com Atraso
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                                        Média Dias
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {response?.relatorio.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.destinatarioUf}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.servico}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.total}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.entregues_antes}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.entregues_no_prazo}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.entregues_atraso}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.em_transito_no_prazo}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.em_transito_com_atraso}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.media_dias_atraso_ou_adiantamento}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Análise por Serviço */}
                <div className="p-6">
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="h-80">
                            <Chart
                                options={serviceChartData}
                                series={response?.relatorio.groupedByServico.map((s) => s.total) || []}
                                type="pie"
                                height="100%"
                            />
                        </div>
                        <div>
                            <div className="grid grid-cols-1 gap-4">
                                {response?.relatorio.groupedByServico.map((servico, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                                        <h3 className="font-semibold text-gray-700 mb-2">{servico.servico}</h3>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="text-xs text-gray-500">Antes do Prazo</div>
                                                <div className="font-bold">{servico.antes.percentual}%</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500">No Prazo</div>
                                                <div className="font-bold">{servico.noPrazo.percentual}%</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500">Atraso</div>
                                                <div className="font-bold">{servico.atraso.percentual}%</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rodapé */}
                <div className="bg-gray-50 p-6 text-center text-sm text-gray-500">
                    <div className="font-bold text-purple-800 mb-2">
                        RELATÓRIO DE DESEMPENHO DE ENVIOS
                    </div>
                    <p>Relatório gerado automaticamente em {currentDate} às {currentTime}</p>
                    <p>&copy; {new Date().getFullYear()} Análise de Logística. Todos os direitos reservados.</p>
                </div>
            </div>
        </div>
    );
};