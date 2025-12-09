import { Package, TrendingUp, DollarSign, Truck, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { IEmissao } from '../../../types/IEmissao';

interface DashboardEmissoesProps {
    emissoes: IEmissao[];
}

export const DashboardEmissoes = ({ emissoes }: DashboardEmissoesProps) => {
    const isDark = document.documentElement.classList.contains('dark');

    // Análise de dados consolidados
    const analytics = useMemo(() => {
        const total = emissoes.length;
        
        // Contagem por status individual
        const prePostado = emissoes.filter(e => e.status === 'PRE_POSTADO').length;
        const postado = emissoes.filter(e => e.status === 'POSTADO').length;
        const coletado = emissoes.filter(e => e.status === 'COLETADO').length;
        const emTransito = emissoes.filter(e => e.status === 'EM_TRANSITO').length;
        const entregue = emissoes.filter(e => e.status === 'ENTREGUE').length;
        const cancelado = emissoes.filter(e => e.status === 'CANCELADO').length;
        const aguardandoRetirada = emissoes.filter(e => e.status === 'AGUARDANDO_RETIRADA').length;
        const outros = emissoes.filter(e => 
            !['PRE_POSTADO', 'POSTADO', 'COLETADO', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO', 'AGUARDANDO_RETIRADA'].includes(e.status as string)
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

        return {
            total,
            prePostado,
            postado,
            coletado,
            emTransito,
            entregue,
            cancelado,
            aguardandoRetirada,
            outros,
            porTransportadora,
            custoTotal,
            ticketMedio,
        };
    }, [emissoes]);

    // Dados do gráfico de pizza com TODOS os status
    const statusLabels = [];
    const statusValues = [];
    const statusColors = [];

    if (analytics.prePostado > 0) {
        statusLabels.push('Pré-Postado');
        statusValues.push(analytics.prePostado);
        statusColors.push('#8B5CF6');
    }
    if (analytics.postado > 0) {
        statusLabels.push('Postado');
        statusValues.push(analytics.postado);
        statusColors.push('#3B82F6');
    }
    if (analytics.coletado > 0) {
        statusLabels.push('Coletado');
        statusValues.push(analytics.coletado);
        statusColors.push('#06B6D4');
    }
    if (analytics.emTransito > 0) {
        statusLabels.push('Em Trânsito');
        statusValues.push(analytics.emTransito);
        statusColors.push('#F59E0B');
    }
    if (analytics.aguardandoRetirada > 0) {
        statusLabels.push('Aguardando Retirada');
        statusValues.push(analytics.aguardandoRetirada);
        statusColors.push('#F97316');
    }
    if (analytics.entregue > 0) {
        statusLabels.push('Entregue');
        statusValues.push(analytics.entregue);
        statusColors.push('#10B981');
    }
    if (analytics.cancelado > 0) {
        statusLabels.push('Cancelado');
        statusValues.push(analytics.cancelado);
        statusColors.push('#EF4444');
    }
    if (analytics.outros > 0) {
        statusLabels.push('Outros');
        statusValues.push(analytics.outros);
        statusColors.push('#6B7280');
    }

    // Gráfico de Pizza - Todos os Status
    const statusChartOptions = {
        chart: {
            type: 'donut' as const,
            background: 'transparent',
        },
        labels: statusLabels,
        colors: statusColors,
        legend: {
            position: 'right' as const,
            fontSize: '13px',
            labels: {
                colors: isDark ? '#E2E8F0' : '#1E293B',
            },
            markers: {
                size: 8,
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val.toFixed(0)}%`,
            style: {
                fontSize: '12px',
                fontWeight: 'bold',
            },
            dropShadow: {
                enabled: false,
            },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '60%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: isDark ? '#E2E8F0' : '#1E293B',
                            formatter: () => `${analytics.total}`,
                        },
                        value: {
                            show: true,
                            fontSize: '20px',
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
                formatter: (val: number) => `${val} envios`,
            },
        },
        responsive: [{
            breakpoint: 480,
            options: {
                legend: {
                    position: 'bottom',
                },
            },
        }],
    };

    // Dados do gráfico de barras por transportadora
    const transportadoraData = Object.entries(analytics.porTransportadora)
        .map(([nome, dados]) => ({
            nome,
            ...dados,
        }))
        .sort((a, b) => b.total - a.total);

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
                barHeight: '60%',
            },
        },
        colors: ['#F97316'],
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '12px',
                colors: ['#fff'],
            },
        },
        xaxis: {
            categories: transportadoraData.map(t => t.nome),
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                    fontSize: '12px',
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: isDark ? '#94A3B8' : '#64748B',
                    fontSize: '12px',
                },
            },
        },
        grid: {
            borderColor: isDark ? '#334155' : '#E2E8F0',
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: (val: number) => `${val} envios`,
            },
        },
    };

    const transportadoraChartSeries = [{
        name: 'Envios',
        data: transportadoraData.map(t => t.total),
    }];

    // Status cards data
    const statusCards = [
        { label: 'Pré-Postado', value: analytics.prePostado, icon: Clock, color: 'bg-purple-500', textColor: 'text-purple-600' },
        { label: 'Postado', value: analytics.postado, icon: Send, color: 'bg-blue-500', textColor: 'text-blue-600' },
        { label: 'Em Trânsito', value: analytics.emTransito, icon: Truck, color: 'bg-amber-500', textColor: 'text-amber-600' },
        { label: 'Entregue', value: analytics.entregue, icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-600' },
        { label: 'Cancelado', value: analytics.cancelado, icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-red-600' },
    ];

    return (
        <div className="space-y-4 mb-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total de Envios</p>
                            <p className="text-xl font-bold text-foreground">{analytics.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Custo Total</p>
                            <p className="text-xl font-bold text-green-600">R$ {analytics.custoTotal.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Ticket Médio</p>
                            <p className="text-xl font-bold text-blue-600">R$ {analytics.ticketMedio.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Taxa de Entrega</p>
                            <p className="text-xl font-bold text-emerald-600">
                                {analytics.total > 0 ? ((analytics.entregue / analytics.total) * 100).toFixed(0) : 0}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {statusCards.map((card) => (
                    <div 
                        key={card.label} 
                        className="bg-card border rounded-lg p-3 flex items-center gap-2"
                    >
                        <div className={`p-1.5 ${card.color} rounded-lg`}>
                            <card.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                            <p className={`text-lg font-bold ${card.textColor}`}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico de Status */}
                <div className="bg-card border rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        Distribuição por Status
                    </h3>
                    {statusValues.length > 0 ? (
                        <ReactApexChart
                            options={statusChartOptions}
                            series={statusValues}
                            type="donut"
                            height={280}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                            Nenhum dado disponível
                        </div>
                    )}
                </div>

                {/* Gráfico de Transportadoras */}
                <div className="bg-card border rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        Envios por Transportadora
                    </h3>
                    {transportadoraData.length > 0 ? (
                        <ReactApexChart
                            options={transportadoraChartOptions}
                            series={transportadoraChartSeries}
                            type="bar"
                            height={280}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                            Nenhum dado disponível
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
