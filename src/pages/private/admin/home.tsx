import { useNavigate, useSearchParams } from "react-router-dom";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import {
    PackageSearch, CreditCard, TrendingUp, CheckCircle2, Banknote,
    Sparkles, ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react"
import { formatMoedaDecimal } from "../../../utils/formatCurrency";
import { ChartDashboardHome } from "./ChartDashboardHome";
import { TopLucroChart } from "./TopLucroChart";
import { DashboardService } from "../../../services/DashboardService";
import type { IDashboardGeral } from "../../../types/dashboard/IDashboardGeral";
import { TopChart } from "../../../components/TopChart";
import { useState } from "react";
import ModalNotificacaoFaturaEmAtraso from "../../../components/ModalNotificacaoFaturaEmAtraso";
import { FilterDropdown } from "../../../components/FilterDropdown";
import DashboardAnaliticoSLA from "../../../components/DashboardAnaliticoSLA";
import { motion } from "framer-motion";

interface GlassStatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    accentColor: string;
    delay?: number;
    loading?: boolean;
}

const GlassStatCard = ({ title, value, icon, trend, accentColor, delay = 0, loading }: GlassStatCardProps) => {
    const isPositive = trend && trend > 0;
    
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 dark:from-slate-800/50 dark:to-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-6"
            >
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-20 bg-slate-300/30 dark:bg-slate-600/30 rounded" />
                    <div className="h-8 w-32 bg-slate-300/30 dark:bg-slate-600/30 rounded" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.5, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300"
        >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${accentColor}`} />
            
            {/* Glow effect */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${accentColor.replace('from-', 'bg-').split(' ')[0]}`} />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${accentColor} shadow-lg`}>
                        <div className="text-white">
                            {icon}
                        </div>
                    </div>
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {Math.abs(trend).toFixed(1)}%
                        </div>
                    )}
                </div>
                
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
            </div>
        </motion.div>
    );
};

const HomeAdmin = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const filtros = Object.fromEntries(searchParams.entries());
    const dashboardService = new DashboardService();

    const [formFiltro, setFormFiltro] = useState({
        clienteId: searchParams.get("clienteId") || "",
        periodo: searchParams.get("periodo") || "hoje",
        dataIni: searchParams.get("dataIni") || "",
        dataFim: searchParams.get("dataFim") || ""
    });

    const { data: dashboardData, isLoading } = useFetchQuery<IDashboardGeral>(
        ['dashboard-geral', filtros],
        async () => {
            const params: { periodo?: string, clienteId?: string, dataIni?: string, dataFim?: string } = {};

            const periodo = searchParams.get('periodo') || undefined;
            const clienteId = searchParams.get('clienteId') || undefined;
            const dataIni = searchParams.get('dataIni') || undefined;
            const dataFim = searchParams.get('dataFim') || undefined;

            if (periodo === 'periodoPersonalizado') {
                if (dataIni) params.dataIni = dataIni;
                if (dataFim) params.dataFim = dataFim;
            } else if (periodo) {
                params.periodo = periodo;
            }

            if (dataIni) params.dataIni = dataIni;
            if (dataFim) params.dataFim = dataFim;
            if (periodo) params.periodo = periodo;
            if (clienteId) params.clienteId = clienteId;

            return await dashboardService.getDashboard(params);
        }
    )

    const aplicarFiltros = () => {
        const params = new URLSearchParams();

        if (formFiltro.clienteId) params.set('clienteId', formFiltro.clienteId);
        if (formFiltro.periodo) params.set('periodo', formFiltro.periodo);
        if (formFiltro.periodo === 'periodoPersonalizado') {
            if (formFiltro.dataIni) params.set('dataIni', formFiltro.dataIni);
            if (formFiltro.dataFim) params.set('dataFim', formFiltro.dataFim);
        }

        navigate({ search: params.toString() });
    };

    const aplicarReset = () => {
        navigate({ search: "" });
        setFormFiltro({
            clienteId: "",
            periodo: "",
            dataIni: "",
            dataFim: ""
        });
    };

    return (
        <div className="min-h-screen">
            {/* Hero Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-8 mb-8 shadow-2xl"
            >
                {/* Animated background patterns */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-white/80 font-medium text-sm tracking-wide uppercase">Painel Administrativo</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Dashboard BRHUB
                        </h1>
                        <p className="text-white/70 text-lg">
                            Visão geral do seu negócio em tempo real
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
                            <span className="text-white/90 text-sm font-medium">Sistema Online</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <FilterDropdown
                    formFiltro={formFiltro}
                    setFormFiltro={setFormFiltro}
                    onApply={aplicarFiltros}
                    onReset={aplicarReset}
                />
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                <GlassStatCard
                    title="Faturado"
                    value={formatMoedaDecimal(dashboardData?.faturamento.resumo.faturado || 0)}
                    icon={<PackageSearch className="w-5 h-5" />}
                    accentColor="from-emerald-400 to-emerald-600"
                    delay={0.1}
                    loading={isLoading}
                />

                <GlassStatCard
                    title="Pago"
                    value={formatMoedaDecimal(dashboardData?.faturamento.resumo.pago || 0)}
                    icon={<CreditCard className="w-5 h-5" />}
                    accentColor="from-blue-400 to-blue-600"
                    delay={0.15}
                    loading={isLoading}
                />

                <GlassStatCard
                    title="Lucro"
                    value={formatMoedaDecimal(dashboardData?.faturamento.resumo.lucro || 0)}
                    icon={<TrendingUp className="w-5 h-5" />}
                    accentColor="from-violet-400 to-violet-600"
                    delay={0.2}
                    loading={isLoading}
                />

                <GlassStatCard
                    title="Recebido"
                    value={`${(Number(dashboardData?.faturamento.resumo.porcentagemRecebida || 0)).toFixed(2)}%`}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    accentColor="from-amber-400 to-orange-500"
                    delay={0.25}
                    loading={isLoading}
                />

                <GlassStatCard
                    title="Total Envios"
                    value={dashboardData?.faturamento.resumo.totalObjetos || 0}
                    icon={<Banknote className="w-5 h-5" />}
                    accentColor="from-rose-400 to-rose-600"
                    delay={0.3}
                    loading={isLoading}
                />
            </div>

            {/* Charts Section */}
            {!isLoading && dashboardData && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-6"
                >
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {dashboardData?.faturamento.comparativoClientes && dashboardData?.faturamento.comparativoClientes?.length > 0 && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <ChartDashboardHome comparativoClientes={dashboardData.faturamento.comparativoClientes} />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.55 }}
                                >
                                    <TopLucroChart comparativoClientes={dashboardData.faturamento.comparativoClientes} />
                                </motion.div>
                            </>
                        )}
                        {dashboardData.envio && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <TopChart
                                        chartType="pie"
                                        data={dashboardData.envio.analyticsUf.map(uf => ({
                                            label: uf.destinatarioUf || 'N/D',
                                            totalEnviado: uf.totalEnviado,
                                            valorFrete: String(uf.valorFrete),
                                            mediaFrete: String(uf.mediaFrete),
                                        }))}
                                        title="Top 10 Estados"
                                        subtitle="com maior envio no período"
                                    />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.65 }}
                                >
                                    <TopChart
                                        chartType="pie"
                                        data={dashboardData.envio.analyticsCidade.map(c => ({
                                            label: `${c.destinatarioLocalidade?.slice(0, 12) || 'N/D'} - ${c.destinatarioUf}`,
                                            totalEnviado: c.totalEnviado,
                                            valorFrete: String(c.valorFrete),
                                            mediaFrete: String(c.mediaFrete),
                                            extraInfo: `${c.destinatarioLocalidade} - ${c.destinatarioUf}`
                                        }))}
                                        title="Top 10 Cidades"
                                        subtitle="com maior envio no período"
                                    />
                                </motion.div>
                            </>
                        )}

                        <ModalNotificacaoFaturaEmAtraso />
                    </div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <DashboardAnaliticoSLA entregaAnalitico={dashboardData?.entregaAnalitico} />
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default HomeAdmin;
