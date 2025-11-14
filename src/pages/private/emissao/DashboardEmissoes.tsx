import { Package, TrendingUp, Clock, DollarSign, Truck, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { IEmissao } from '../../../types/IEmissao';
import { KpiCard } from '../../../components/KpiCard';
import { StatCard } from '../../../components/StatCard';

interface DashboardEmissoesProps {
    emissoes: IEmissao[];
}

export const DashboardEmissoes = ({ emissoes }: DashboardEmissoesProps) => {
    const isDark = document.documentElement.classList.contains('dark');

    // Análise de dados
    const analytics = useMemo(() => {
        const total = emissoes.length;
        const porStatus = emissoes.reduce((acc, e) => {
            acc[e.status as string] = (acc[e.status as string] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const porTransportadora = emissoes.reduce((acc, e) => {
            const trans = e.transportadora || 'Outros';
            acc[trans] = (acc[trans] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const custoTotal = emissoes.reduce((acc, e) => {
            const valor = parseFloat(e.valor?.toString() || '0');
            return acc + valor;
        }, 0);
        const ticketMedio = total > 0 ? custoTotal / total : 0;

        const prePostados = porStatus['PRE_POSTADO'] || 0;
        const postados = porStatus['POSTADO'] || 0;
        const emTransito = porStatus['EM_TRANSITO'] || 0;
        const entregues = porStatus['ENTREGUE'] || 0;

        return {
            total,
            porStatus,
            porTransportadora,
            custoTotal,
            ticketMedio,
            prePostados,
            postados,
            emTransito,
            entregues,
            percentualEntregues: total > 0 ? ((entregues / total) * 100).toFixed(1) : '0',
            percentualEmTransito: total > 0 ? ((emTransito / total) * 100).toFixed(1) : '0',
            percentualPrePostados: total > 0 ? ((prePostados / total) * 100).toFixed(1) : '0',
        };
    }, [emissoes]);

    // Gráfico de Pizza - Status
    const statusChartOptions = {
        chart: {
            type: 'donut' as const,
            background: 'transparent',
        },
        labels: Object.keys(analytics.porStatus).map(status => {
            const statusLabels: Record<string, string> = {
                'PRE_POSTADO': 'Pré-Postado',
                'POSTADO': 'Postado',
                'COLETADO': 'Coletado',
                'EM_TRANSITO': 'Em Trânsito',
                'ENTREGUE': 'Entregue',
                'CANCELADO': 'Cancelado',
            };
            return statusLabels[status] || status;
        }),
        colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'],
        legend: {
            position: 'bottom' as const,
            labels: {
                colors: isDark ? '#E2E8F0' : '#1E293B',
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val.toFixed(1)}%`,
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
                            color: isDark ? '#E2E8F0' : '#1E293B',
                        },
                    },
                },
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: (val: number) => `${val} envios`,
            },
        },
    };

    const statusChartSeries = Object.values(analytics.porStatus);

    // Gráfico de Barras - Transportadoras
    const transportadoraChartOptions = {
        chart: {
            type: 'bar' as const,
            background: 'transparent',
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                horizontal: true,
                distributed: true,
                dataLabels: {
                    position: 'top',
                },
            },
        },
        colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '12px',
                colors: [isDark ? '#E2E8F0' : '#1E293B'],
            },
        },
        xaxis: {
            categories: Object.keys(analytics.porTransportadora),
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                },
            },
        },
        grid: {
            borderColor: isDark ? '#334155' : '#E2E8F0',
        },
        legend: { show: false },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: (val: number) => `${val} envios`,
            },
        },
    };

    const transportadoraChartSeries = [{
        name: 'Envios',
        data: Object.values(analytics.porTransportadora),
    }];

    // Gráfico de Linha - Evolução (últimos 7 dias simulado)
    const evolucaoChartOptions = {
        chart: {
            type: 'area' as const,
            background: 'transparent',
            toolbar: { show: false },
            sparkline: { enabled: false },
        },
        stroke: {
            curve: 'smooth' as const,
            width: 3,
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.2,
            },
        },
        colors: ['#8B5CF6', '#3B82F6'],
        xaxis: {
            categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                },
            },
        },
        grid: {
            borderColor: isDark ? '#334155' : '#E2E8F0',
        },
        legend: {
            position: 'top' as const,
            labels: {
                colors: isDark ? '#E2E8F0' : '#1E293B',
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
        },
    };

    const evolucaoChartSeries = [
        {
            name: 'Enviados',
            data: [12, 19, 15, 25, 22, 18, analytics.total],
        },
        {
            name: 'Entregues',
            data: [8, 15, 12, 20, 18, 14, analytics.entregues],
        },
    ];

    return (
        <div className="space-y-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total de Envios"
                    value={analytics.total}
                    icon={<Package className="h-6 w-6 text-purple-600" />}
                    bgIcon="bg-purple-100 dark:bg-purple-900/30"
                    textColor="text-purple-600 dark:text-purple-400"
                />
                <StatCard
                    title="Custo Total"
                    value={`R$ ${analytics.custoTotal.toFixed(2)}`}
                    icon={<DollarSign className="h-6 w-6 text-green-600" />}
                    bgIcon="bg-green-100 dark:bg-green-900/30"
                    textColor="text-green-600 dark:text-green-400"
                />
                <StatCard
                    title="Ticket Médio"
                    value={`R$ ${analytics.ticketMedio.toFixed(2)}`}
                    icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
                    bgIcon="bg-blue-100 dark:bg-blue-900/30"
                    textColor="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    title="Taxa de Entrega"
                    value={`${analytics.percentualEntregues}%`}
                    icon={<Clock className="h-6 w-6 text-orange-600" />}
                    bgIcon="bg-orange-100 dark:bg-orange-900/30"
                    textColor="text-orange-600 dark:text-orange-400"
                />
            </div>

            {/* KPI Cards Interativos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                    index={0}
                    activeIndex={null}
                    onClick={() => {}}
                    percentual={analytics.percentualPrePostados}
                    titulo="Pré-Postados"
                    total={analytics.prePostados}
                    colorClass="text-purple-600 dark:text-purple-400"
                    barColor="#8B5CF6"
                />
                <KpiCard
                    index={1}
                    activeIndex={null}
                    onClick={() => {}}
                    percentual={analytics.percentualEmTransito}
                    titulo="Em Trânsito"
                    total={analytics.emTransito}
                    colorClass="text-blue-600 dark:text-blue-400"
                    barColor="#3B82F6"
                />
                <KpiCard
                    index={2}
                    activeIndex={null}
                    onClick={() => {}}
                    percentual={analytics.percentualEntregues}
                    titulo="Entregues"
                    total={analytics.entregues}
                    colorClass="text-green-600 dark:text-green-400"
                    barColor="#10B981"
                />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribuição por Status */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-foreground">Distribuição por Status</h3>
                    </div>
                    <ReactApexChart
                        options={statusChartOptions}
                        series={statusChartSeries}
                        type="donut"
                        height={320}
                    />
                </div>

                {/* Envios por Transportadora */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-foreground">Envios por Transportadora</h3>
                    </div>
                    <ReactApexChart
                        options={transportadoraChartOptions}
                        series={transportadoraChartSeries}
                        type="bar"
                        height={320}
                    />
                </div>
            </div>

            {/* Evolução Temporal */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-foreground">Evolução de Envios (Última Semana)</h3>
                </div>
                <ReactApexChart
                    options={evolucaoChartOptions}
                    series={evolucaoChartSeries}
                    type="area"
                    height={280}
                />
            </div>

            {/* Insights */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">💡 Insights Inteligentes</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• <strong className="text-foreground">{analytics.percentualEntregues}%</strong> dos seus envios foram entregues com sucesso</li>
                            <li>• Você tem <strong className="text-foreground">{analytics.prePostados} envios</strong> aguardando postagem</li>
                            <li>• Seu ticket médio é de <strong className="text-foreground">R$ {analytics.ticketMedio.toFixed(2)}</strong> por envio</li>
                            <li>• {Object.keys(analytics.porTransportadora).length > 1 
                                ? `Você está utilizando ${Object.keys(analytics.porTransportadora).length} transportadoras diferentes` 
                                : 'Você está trabalhando com uma transportadora'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
