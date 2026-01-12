import { Package, TrendingUp, DollarSign, Truck, CheckCircle, Clock, Send, MapPin, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { IEmissao } from '../../../types/IEmissao';

interface DashboardEmissoesProps {
    emissoes: IEmissao[];
}

export const DashboardEmissoes = ({ emissoes }: DashboardEmissoesProps) => {
    const isDark = document.documentElement.classList.contains('dark');

    const analytics = useMemo(() => {
        const total = emissoes.length;
        
        const prePostado = emissoes.filter(e => e.status === 'PRE_POSTADO').length;
        const postado = emissoes.filter(e => e.status === 'POSTADO').length;
        const coletado = emissoes.filter(e => e.status === 'COLETADO').length;
        const emTransito = emissoes.filter(e => e.status === 'EM_TRANSITO').length;
        const entregue = emissoes.filter(e => e.status === 'ENTREGUE').length;
        const cancelado = emissoes.filter(e => e.status === 'CANCELADO').length;
        const aguardandoRetirada = emissoes.filter(e => e.status === 'AGUARDANDO_RETIRADA').length;

        const porTransportadora = emissoes.reduce((acc, e) => {
            const trans = (e.transportadora || 'Outros').toUpperCase();
            if (!acc[trans]) acc[trans] = { total: 0, custo: 0 };
            acc[trans].total += 1;
            acc[trans].custo += parseFloat(e.valor?.toString() || '0');
            return acc;
        }, {} as Record<string, { total: number; custo: number }>);

        const custoTotal = emissoes.reduce((acc, e) => acc + parseFloat(e.valor?.toString() || '0'), 0);
        const ticketMedio = total > 0 ? custoTotal / total : 0;

        return {
            total, prePostado, postado, coletado, emTransito, entregue,
            cancelado, aguardandoRetirada, porTransportadora, custoTotal, ticketMedio,
        };
    }, [emissoes]);

    // Chart data
    const statusData = [
        { label: 'Pré-Postado', value: analytics.prePostado, color: '#8B5CF6' },
        { label: 'Postado', value: analytics.postado, color: '#3B82F6' },
        { label: 'Coletado', value: analytics.coletado, color: '#06B6D4' },
        { label: 'Em Trânsito', value: analytics.emTransito, color: '#F59E0B' },
        { label: 'Aguard. Retirada', value: analytics.aguardandoRetirada, color: '#F97316' },
        { label: 'Entregue', value: analytics.entregue, color: '#10B981' },
        { label: 'Cancelado', value: analytics.cancelado, color: '#EF4444' },
    ].filter(s => s.value > 0);

    const chartOptions = {
        chart: { type: 'donut' as const, background: 'transparent' },
        labels: statusData.map(s => s.label),
        colors: statusData.map(s => s.color),
        legend: {
            position: 'bottom' as const,
            fontSize: '12px',
            labels: { colors: isDark ? '#CBD5E1' : '#475569' },
            itemMargin: { horizontal: 8, vertical: 4 },
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val.toFixed(0)}%`,
            style: { fontSize: '11px', fontWeight: 600 },
            dropShadow: { enabled: false },
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
                            fontSize: '14px',
                            fontWeight: 600,
                            color: isDark ? '#E2E8F0' : '#1E293B',
                            formatter: () => `${analytics.total}`,
                        },
                        value: {
                            fontSize: '24px',
                            fontWeight: 700,
                            color: isDark ? '#F8FAFC' : '#0F172A',
                        },
                    },
                },
            },
        },
        stroke: { width: 2, colors: [isDark ? '#1E293B' : '#FFFFFF'] },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val: number) => `${val} envios` } },
    };

    const transportadoraData = Object.entries(analytics.porTransportadora)
        .map(([nome, dados]) => ({ nome, ...dados }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const barChartOptions = {
        chart: { type: 'bar' as const, background: 'transparent', toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '50%' } },
        colors: ['#F97316'],
        dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#fff'] } },
        xaxis: {
            categories: transportadoraData.map(t => t.nome),
            labels: { style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' } },
        },
        yaxis: { labels: { style: { colors: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' } } },
        grid: { borderColor: isDark ? '#334155' : '#E2E8F0', strokeDashArray: 4 },
        tooltip: { theme: isDark ? 'dark' : 'light' },
    };

    const statusCards = [
        { key: 'pre', label: 'Pré-Postado', value: analytics.prePostado, icon: Clock, gradient: 'from-violet-500 to-purple-600' },
        { key: 'post', label: 'Postado', value: analytics.postado, icon: Send, gradient: 'from-blue-500 to-indigo-600' },
        { key: 'transit', label: 'Em Trânsito', value: analytics.emTransito, icon: Truck, gradient: 'from-amber-500 to-orange-600' },
        { key: 'waiting', label: 'Aguard. Retirada', value: analytics.aguardandoRetirada, icon: MapPin, gradient: 'from-orange-500 to-red-500' },
        { key: 'delivered', label: 'Entregue', value: analytics.entregue, icon: CheckCircle, gradient: 'from-emerald-500 to-green-600' },
        { key: 'canceled', label: 'Cancelado', value: analytics.cancelado, icon: XCircle, gradient: 'from-red-500 to-rose-600' },
    ];

    return (
        <div className="space-y-5 mb-6">
            {/* Hero Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-lg">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Total de Envios</span>
                        </div>
                        <p className="text-3xl font-bold">{analytics.total}</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Package className="h-24 w-24" />
                    </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Custo Total</span>
                        </div>
                        <p className="text-3xl font-bold">R$ {analytics.custoTotal.toFixed(2)}</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <DollarSign className="h-24 w-24" />
                    </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Ticket Médio</span>
                        </div>
                        <p className="text-3xl font-bold">R$ {analytics.ticketMedio.toFixed(2)}</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <TrendingUp className="h-24 w-24" />
                    </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Taxa de Entrega</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {analytics.total > 0 ? ((analytics.entregue / analytics.total) * 100).toFixed(0) : 0}%
                        </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <CheckCircle className="h-24 w-24" />
                    </div>
                </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-2">
                {statusCards.map((card) => (
                    <div 
                        key={card.key}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r ${card.gradient} text-white shadow-md transition-transform hover:scale-105`}
                    >
                        <card.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{card.label}</span>
                        <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold">
                            {card.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Donut Chart */}
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Package className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground">Distribuição por Status</h3>
                    </div>
                    {statusData.length > 0 ? (
                        <ReactApexChart
                            options={chartOptions}
                            series={statusData.map(s => s.value)}
                            type="donut"
                            height={280}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                            <div className="text-center">
                                <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p>Nenhum dado disponível</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bar Chart */}
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Truck className="h-4 w-4 text-orange-500" />
                        </div>
                        <h3 className="font-semibold text-foreground">Envios por Transportadora</h3>
                    </div>
                    {transportadoraData.length > 0 ? (
                        <ReactApexChart
                            options={barChartOptions}
                            series={[{ name: 'Envios', data: transportadoraData.map(t => t.total) }]}
                            type="bar"
                            height={280}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                            <div className="text-center">
                                <Truck className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p>Nenhum dado disponível</p>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    </div>
    );
};
