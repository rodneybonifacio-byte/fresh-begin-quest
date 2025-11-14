import { Package, Truck, DollarSign, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import { DashboardService } from "../../../services/DashboardService";
import type { IDashboardGeral } from "../../../types/dashboard/IDashboardGeral";
import { formatMoedaDecimal } from "../../../utils/formatCurrency";
import { StatCard } from "../../../components/StatCard";

export const ModernHome = () => {
    const navigate = useNavigate();
    const dashboardService = new DashboardService();

    const { data: dashboardData, isLoading } = useFetchQuery<IDashboardGeral>(
        ['dashboard-cliente'],
        async () => await dashboardService.getDashboard({ periodo: '30d' })
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Carregando...</div>
            </div>
        );
    }

    if (!dashboardData || !dashboardData.entregaAnalitico) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Package className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum dado disponível</p>
                <button
                    onClick={() => navigate('/app/emissao/adicionar')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-colors"
                >
                    Emitir primeiro frete
                </button>
            </div>
        );
    }

    const { entregaAnalitico, faturamento } = dashboardData;
    const { indicadores } = entregaAnalitico;
    const totalEnvios = (indicadores.totalEntregues || 0) + (indicadores.totalEmTransito || 0);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Últimos 30 dias</p>
                </div>
                <button
                    onClick={() => navigate('/app/emissao/adicionar')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    <Package className="w-4 h-4" />
                    Nova Emissão
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total de Envios"
                    value={totalEnvios}
                    icon={<Package className="w-5 h-5" />}
                />
                <StatCard
                    title="Em Trânsito"
                    value={indicadores.totalEmTransito || 0}
                    icon={<Truck className="w-5 h-5" />}
                />
                <StatCard
                    title="Entregues"
                    value={indicadores.totalEntregues || 0}
                    icon={<TrendingUp className="w-5 h-5" />}
                />
                <StatCard
                    title="Valor Total"
                    value={formatMoedaDecimal(faturamento?.resumo?.faturado || 0)}
                    icon={<DollarSign className="w-5 h-5" />}
                />
            </div>

            {totalEnvios === 0 && (
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Comece a enviar agora</h3>
                    <p className="text-muted-foreground mb-4">
                        Você ainda não tem nenhum envio registrado. Clique no botão acima para criar sua primeira emissão.
                    </p>
                </div>
            )}
        </div>
    );
};
