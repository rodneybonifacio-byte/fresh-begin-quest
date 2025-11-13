import { PackageCheck, CheckSquare, Truck, Wallet, Tag } from "lucide-react";
import { EmissaoService } from "../services/EmissaoService";
import { useFetchQuery } from "../hooks/useFetchQuery";
import type { IDashboard } from "../types/IDashboard";
import { formatMoedaDecimal } from "../utils/formatCurrency";

interface ResumoDashboardCardsProps {
    filtros?: Record<string, string>;
}

export const ResumoDashboardCards = ({ filtros }: ResumoDashboardCardsProps) => {

    const service = new EmissaoService();
    const { data: dashboard } = useFetchQuery<IDashboard>(
        ['dashboard-totais', filtros],
        async () => {
            const response = await service.dashboard(filtros, "dashboard");
            return response ?? {}; // <- evita retorno undefined
        }
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* Total de Envios */}
            <CardInfo
                title="Total de Envios"
                value={dashboard?.totalEnvios || 0}
                bgColor="bg-red-500"
                icon={<PackageCheck className="text-red-50" />}
            />
            {/* Envios Pre postados */}
            <CardInfo
                title="Pre-postados"
                value={dashboard?.totalEnvioPrepostado || 0}
                bgColor="bg-blue-500"
                icon={<Tag className="text-blue-50" />}
            />
            {/* Envios Entregues */}
            <CardInfo
                title="Entregues"
                value={dashboard?.totalEnvioEntregue || 0}
                bgColor="bg-green-500"
                icon={<CheckSquare className="text-green-50" />}
            />
            {/* Em Trânsito */}
            <CardInfo
                title="Em Trânsito"
                value={dashboard?.totalEnvioEmTransito || 0}
                bgColor="bg-yellow-500"
                icon={<Truck className="text-yellow-50" />}
            />
            {/* Custo Total */}
            <CardInfo
                title="Custo Total"
                value={`${formatMoedaDecimal(dashboard?.totalVendas || 0)}`}
                bgColor="bg-purple-500"
                icon={<Wallet className="text-purple-50" />}
            />
        </div>
    );
};

interface CardInfoProps {
    title: string;
    value: string | number;
    bgColor: string;
    icon: React.ReactNode;
}

const CardInfo = ({ title, value, bgColor, icon }: CardInfoProps) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-100 dark:border-slate-600">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{title}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
            </div>
            <div className={`${bgColor} p-3 rounded-lg`}>
                {icon}
            </div>
        </div>
    </div>
);
{/* <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex justify-between items-start">
        <div>
            <p className="text-gray-500 text-xs">Vendas Aproximado</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">{formatMoedaDecimal(dashboard?.totalVendas || 0)}</p>
        </div>
        <div className="bg-orange-100 p-3 rounded-lg">
            <ShoppingCart className="text-orange-600 text-xl" />
        </div>
    </div>
</div> */}