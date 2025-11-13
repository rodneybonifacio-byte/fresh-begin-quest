import { useNavigate, useSearchParams } from "react-router-dom";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import {
    PackageSearch, CreditCard, TrendingUp, CheckCircle2, Banknote,
} from "lucide-react"
import { formatMoedaDecimal } from "../../../utils/formatCurrency";
import { StatCard } from "../../../components/StatCard";
import { ChartDashboardHome } from "./ChartDashboardHome";
import { TopLucroChart } from "./TopLucroChart";
import { DashboardService } from "../../../services/DashboardService";
import type { IDashboardGeral } from "../../../types/dashboard/IDashboardGeral";
import { TopChart } from "../../../components/TopChart";
import { useState } from "react";
import ModalNotificacaoFaturaEmAtraso from "../../../components/ModalNotificacaoFaturaEmAtraso";

import { FilterDropdown } from "../../../components/FilterDropdown";
import DashboardAnaliticoSLA from "../../../components/DashboardAnaliticoSLA";


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
        // Limpa os parâmetros da URL
        navigate({ search: "" });

        // Reseta os filtros do formulário
        setFormFiltro({
            clienteId: "",
            periodo: "",
            dataIni: "",
            dataFim: ""
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl flex flex-row gap-4 justify-between items-center">
                <FilterDropdown
                    formFiltro={formFiltro}
                    setFormFiltro={setFormFiltro}
                    onApply={aplicarFiltros}
                    onReset={aplicarReset}
                />
            </div>
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-4">
                    <StatCard
                        title="Faturado"
                        value={formatMoedaDecimal(dashboardData?.faturamento.resumo.faturado || 0)}
                        icon={<PackageSearch />}
                        bgIcon="bg-green-700/30"
                        textColor="text-green-600"
                        loading={isLoading}
                    />

                    <StatCard
                        title="Pago"
                        value={formatMoedaDecimal(dashboardData?.faturamento.resumo.pago || 0)}
                        icon={<CreditCard />}
                        bgIcon="bg-blue-700/30"
                        textColor="text-blue-600"
                        loading={isLoading}
                    />

                    <StatCard
                        title="Lucro"
                        value={formatMoedaDecimal(dashboardData?.faturamento.resumo.lucro || 0)}
                        icon={<TrendingUp />}
                        bgIcon="bg-green-700/30"
                        textColor="text-green-600"
                        loading={isLoading}
                    />

                    <StatCard
                        title="Recebido"
                        value={`${(Number(dashboardData?.faturamento.resumo.porcentagemRecebida || 0)).toFixed(2)}%`}
                        icon={<CheckCircle2 />}
                        bgIcon="bg-purple-700/30"
                        textColor="text-purple-600"
                        loading={isLoading}
                    />

                    <StatCard
                        title="Total Envios"
                        value={dashboardData?.faturamento.resumo.totalObjetos || 0}
                        icon={<Banknote />}
                        bgIcon="bg-orange-700/30"
                        textColor="text-orange-600"
                        loading={isLoading}
                    />

                </div>
            </div>
            {!isLoading && dashboardData && (
                <div className="flex flex-col gap-6">

                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-6">
                        {dashboardData?.faturamento.comparativoClientes && dashboardData?.faturamento.comparativoClientes?.length > 0 && (
                            <>
                                <ChartDashboardHome comparativoClientes={dashboardData.faturamento.comparativoClientes} />
                                <TopLucroChart comparativoClientes={dashboardData.faturamento.comparativoClientes} />
                            </>
                        )}
                        {dashboardData.envio && (
                            <>
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
                            </>
                        )}

                        <ModalNotificacaoFaturaEmAtraso />
                    </div>
                    <DashboardAnaliticoSLA entregaAnalitico={dashboardData?.entregaAnalitico} />
                </div>
            )}
        </div>
    );
};

export default HomeAdmin;