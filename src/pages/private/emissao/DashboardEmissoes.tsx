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

    // Análise de dados consolidados
    const analytics = useMemo(() => {
        const total = emissoes.length;
        
        // Consolidar status em categorias inteligentes
        const aguardandoColeta = emissoes.filter(e => 
            ['PRE_POSTADO', 'POSTADO'].includes(e.status as string)
        ).length;
        
        const emProcessamento = emissoes.filter(e => 
            ['COLETADO', 'EM_TRANSITO'].includes(e.status as string)
        ).length;
        
        const entregues = emissoes.filter(e => 
            e.status === 'ENTREGUE'
        ).length;
        
        const problemas = emissoes.filter(e => 
            ['CANCELADO', 'ERRO', 'FALHA'].includes(e.status as string)
        ).length;

        // Análise por transportadora
        const porTransportadora = emissoes.reduce((acc, e) => {
            const trans = (e.transportadora || 'Outros').toUpperCase();
            if (!acc[trans]) {
                acc[trans] = { total: 0, custo: 0 };
            }
            acc[trans].total += 1;
            acc[trans].custo += parseFloat(e.valor?.toString() || '0');
            return acc;
        }, {} as Record<string, { total: number; custo: number }>);

        // Cálculos financeiros
        const custoTotal = emissoes.reduce((acc, e) => {
            const valor = parseFloat(e.valor?.toString() || '0');
            return acc + valor;
        }, 0);
        const ticketMedio = total > 0 ? custoTotal / total : 0;

        // Cálculo de taxa de sucesso
        const taxaSucesso = total > 0 ? ((entregues / total) * 100) : 0;
        const taxaProcessamento = total > 0 ? ((emProcessamento / total) * 100) : 0;
        const taxaAguardando = total > 0 ? ((aguardandoColeta / total) * 100) : 0;

        return {
            total,
            aguardandoColeta,
            emProcessamento,
            entregues,
            problemas,
            porTransportadora,
            custoTotal,
            ticketMedio,
            taxaSucesso: taxaSucesso.toFixed(1),
            taxaProcessamento: taxaProcessamento.toFixed(1),
            taxaAguardando: taxaAguardando.toFixed(1),
        };
    }, [emissoes]);

    // Gráfico de Pizza - Status Consolidado
    const statusChartOptions = {
        chart: {
            type: 'donut' as const,
            background: 'transparent',
        },
        labels: ['✅ Entregues', '🚚 Em Processamento', '⏳ Aguardando Coleta', '⚠️ Problemas'],
        colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
        legend: {
            position: 'bottom' as const,
            labels: {
                colors: isDark ? '#E2E8F0' : '#1E293B',
            },
        },
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '14px',
                fontWeight: 'bold',
            },
            dropShadow: {
                enabled: false,
            },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total de Envios',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: isDark ? '#E2E8F0' : '#1E293B',
                            formatter: () => `${analytics.total}`,
                        },
                        value: {
                            show: true,
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: isDark ? '#E2E8F0' : '#1E293B',
                        },
                    },
                },
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: (val: number) => `${val} envios (${((val / analytics.total) * 100).toFixed(1)}%)`,
            },
        },
    };

    const statusChartSeries = [
        analytics.entregues,
        analytics.emProcessamento,
        analytics.aguardandoColeta,
        analytics.problemas,
    ];

    // Gráfico de Barras - Transportadoras com Desempenho
    const transportadoraData = Object.entries(analytics.porTransportadora).map(([nome, dados]) => ({
        nome,
        ...dados,
        custoMedio: dados.total > 0 ? dados.custo / dados.total : 0,
    }));

    const transportadoraChartOptions = {
        chart: {
            type: 'bar' as const,
            background: 'transparent',
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                borderRadius: 10,
                horizontal: false,
                columnWidth: '70%',
                dataLabels: {
                    position: 'top',
                },
            },
        },
        colors: ['#8B5CF6', '#3B82F6'],
        dataLabels: {
            enabled: true,
            offsetY: -20,
            style: {
                fontSize: '12px',
                colors: [isDark ? '#E2E8F0' : '#1E293B'],
                fontWeight: 'bold',
            },
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent'],
        },
        xaxis: {
            categories: transportadoraData.map(t => t.nome),
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                    fontSize: '12px',
                    fontWeight: 'bold',
                },
            },
        },
        yaxis: {
            title: {
                text: 'Quantidade',
                style: {
                    color: isDark ? '#94A3B8' : '#64748B',
                },
            },
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
            y: {
                formatter: (val: number, opts: any) => {
                    const seriesIndex = opts.seriesIndex;
                    if (seriesIndex === 0) {
                        return `${val} envios`;
                    }
                    return `R$ ${val.toFixed(2)}`;
                },
            },
        },
    };

    const transportadoraChartSeries = [
        {
            name: 'Envios',
            data: transportadoraData.map(t => t.total),
        },
        {
            name: 'Custo Médio',
            data: transportadoraData.map(t => t.custoMedio),
        },
    ];

    // Gráfico de Performance - Taxa de Conversão
    const performanceChartOptions = {
        chart: {
            type: 'line' as const,
            background: 'transparent',
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        stroke: {
            curve: 'smooth' as const,
            width: [4, 4, 4],
        },
        colors: ['#F59E0B', '#3B82F6', '#10B981'],
        markers: {
            size: 6,
            strokeWidth: 2,
            hover: {
                size: 8,
            },
        },
        xaxis: {
            categories: ['Início', 'Aguardando', 'Processamento', 'Finalizado'],
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                    fontSize: '12px',
                    fontWeight: 'bold',
                },
            },
        },
        yaxis: {
            title: {
                text: 'Quantidade de Envios',
                style: {
                    color: isDark ? '#94A3B8' : '#64748B',
                },
            },
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                },
            },
        },
        grid: {
            borderColor: isDark ? '#334155' : '#E2E8F0',
            strokeDashArray: 4,
        },
        legend: {
            position: 'top' as const,
            horizontalAlign: 'center' as const,
            labels: {
                colors: isDark ? '#E2E8F0' : '#1E293B',
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: (val: number) => `${val} envios`,
            },
        },
    };

    const performanceChartSeries = [
        {
            name: 'Fluxo Total',
            data: [analytics.total, analytics.aguardandoColeta, analytics.emProcessamento, analytics.entregues],
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
                    value={`${analytics.taxaSucesso}%`}
                    icon={<Clock className="h-6 w-6 text-orange-600" />}
                    bgIcon="bg-orange-100 dark:bg-orange-900/30"
                    textColor="text-orange-600 dark:text-orange-400"
                />
            </div>

            {/* KPI Cards Interativos - Jornada do Envio */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard
                    index={0}
                    activeIndex={null}
                    onClick={() => {}}
                    percentual={analytics.taxaAguardando}
                    titulo="⏳ Aguardando Coleta"
                    total={analytics.aguardandoColeta}
                    colorClass="text-orange-600 dark:text-orange-400"
                    barColor="#F59E0B"
                />
                <KpiCard
                    index={1}
                    activeIndex={null}
                    onClick={() => {}}
                    percentual={analytics.taxaProcessamento}
                    titulo="🚚 Em Processamento"
                    total={analytics.emProcessamento}
                    colorClass="text-blue-600 dark:text-blue-400"
                    barColor="#3B82F6"
                />
                <KpiCard
                    index={2}
                    activeIndex={null}
                    onClick={() => {}}
                    percentual={analytics.taxaSucesso}
                    titulo="✅ Entregues"
                    total={analytics.entregues}
                    colorClass="text-green-600 dark:text-green-400"
                    barColor="#10B981"
                />
                <KpiCard
                    index={3}
                    activeIndex={null}
                    onClick={() => {}}
                    percentual={analytics.problemas > 0 ? ((analytics.problemas / analytics.total) * 100).toFixed(1) : '0'}
                    titulo="⚠️ Problemas"
                    total={analytics.problemas}
                    colorClass="text-red-600 dark:text-red-400"
                    barColor="#EF4444"
                />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribuição por Status - Consolidado */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-foreground">Jornada dos Envios</h3>
                        </div>
                        <span className="text-xs text-muted-foreground bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full font-medium">
                            Status Consolidados
                        </span>
                    </div>
                    <ReactApexChart
                        options={statusChartOptions}
                        series={statusChartSeries}
                        type="donut"
                        height={350}
                    />
                </div>

                {/* Desempenho por Transportadora */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-foreground">Análise de Transportadoras</h3>
                        </div>
                        <span className="text-xs text-muted-foreground bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full font-medium">
                            Volume vs Custo
                        </span>
                    </div>
                    <ReactApexChart
                        options={transportadoraChartOptions}
                        series={transportadoraChartSeries}
                        type="bar"
                        height={350}
                    />
                </div>
            </div>

            {/* Funil de Conversão */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                        <h3 className="text-lg font-semibold text-foreground">Funil de Processamento</h3>
                    </div>
                    <span className="text-xs text-muted-foreground bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full font-medium">
                        Fluxo do Pedido à Entrega
                    </span>
                </div>
                <ReactApexChart
                    options={performanceChartOptions}
                    series={performanceChartSeries}
                    type="line"
                    height={280}
                />
                <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{analytics.total}</div>
                        <div className="text-xs text-muted-foreground">Iniciados</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-500">{analytics.aguardandoColeta}</div>
                        <div className="text-xs text-muted-foreground">Aguardando</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{analytics.emProcessamento}</div>
                        <div className="text-xs text-muted-foreground">Processando</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{analytics.entregues}</div>
                        <div className="text-xs text-muted-foreground">Finalizados</div>
                    </div>
                </div>
            </div>

            {/* Insights Inteligentes */}
            <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-green-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800 shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-md">
                        <AlertCircle className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                            🎯 Insights & Recomendações Estratégicas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-semibold text-green-600 dark:text-green-400">Taxa de Sucesso</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-2xl text-foreground">{analytics.taxaSucesso}%</strong> dos envios foram entregues com sucesso! 
                                    {parseFloat(analytics.taxaSucesso) > 80 ? ' 🎉 Performance excelente!' : ' Continue melhorando.'}
                                </p>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">Pendências</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-2xl text-foreground">{analytics.aguardandoColeta}</strong> envios aguardando coleta.
                                    {analytics.aguardandoColeta > 10 ? ' ⚠️ Agende coletas para agilizar!' : ' ✅ Tudo sob controle!'}
                                </p>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">Ticket Médio</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Custo médio de <strong className="text-2xl text-foreground">R$ {analytics.ticketMedio.toFixed(2)}</strong> por envio. 
                                    {Object.keys(analytics.porTransportadora).length > 1 ? ' 💡 Compare custos entre transportadoras!' : ''}
                                </p>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                    <span className="font-semibold text-purple-600 dark:text-purple-400">Diversificação</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-2xl text-foreground">{Object.keys(analytics.porTransportadora).length}</strong> 
                                    {Object.keys(analytics.porTransportadora).length === 1 
                                        ? ' transportadora em uso. 💡 Considere diversificar!' 
                                        : ' transportadoras. ✅ Boa diversificação!'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
