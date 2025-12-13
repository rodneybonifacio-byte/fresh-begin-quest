import { ApexOptions } from 'apexcharts';
import ReactApexChart from "react-apexcharts";
import { IFaturaDashboardResumoCliente } from "../../../types/fatura/IFatauraDashboard";
import { TrendingUp } from 'lucide-react';

interface Props {
    comparativoClientes: IFaturaDashboardResumoCliente[];
}

export const ChartDashboardHome = ({ comparativoClientes }: Props) => {
    const isDark = document.documentElement.classList.contains('dark');
    const categorias = comparativoClientes.map(c => c.cliente);
    const truncadas = categorias.map(nome =>
        nome.length > 12 ? nome.substring(0, 12) + "..." : nome
    );

    const series: ApexAxisChartSeries = [
        {
            name: "Faturado",
            data: comparativoClientes.map(c => Number(c.faturado)),
        },
        {
            name: "Pago",
            data: comparativoClientes.map(c => Number(c.pago)),
        },
        {
            name: "Custo",
            data: comparativoClientes.map(c => Number(c.custo)),
        },
        {
            name: "Lucro",
            data: comparativoClientes.map(c => Number(c.lucro)),
        },
    ];

    const options: ApexOptions = {
        chart: {
            type: 'area',
            height: 400,
            toolbar: { show: false },
            zoom: { enabled: false },
            background: 'transparent',
            fontFamily: 'inherit',
        },
        colors: ['#10b981', '#3b82f6', '#f97316', '#8b5cf6'],
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: 'smooth',
            width: 3,
        },
        markers: {
            size: 0,
            strokeWidth: 0,
            hover: {
                size: 8,
                sizeOffset: 3,
            },
        },
        xaxis: {
            categories: truncadas,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: {
                    colors: isDark ? "#94a3b8" : "#64748b",
                    fontSize: "12px",
                    fontWeight: 500,
                },
            },
        },
        yaxis: {
            labels: {
                formatter: val =>
                    "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 0 }),
                style: {
                    colors: isDark ? "#94a3b8" : "#64748b",
                    fontSize: "12px",
                    fontWeight: 400,
                },
            },
        },
        tooltip: {
            shared: true,
            intersect: false,
            theme: isDark ? 'dark' : 'light',
            style: {
                fontSize: '13px',
            },
            y: {
                formatter: val =>
                    "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            fontSize: '13px',
            fontWeight: 600,
            markers: {
                size: 10,
                shape: 'circle',
                offsetX: -4,
            },
            itemMargin: {
                horizontal: 16,
            },
            labels: {
                colors: isDark ? '#e2e8f0' : '#1e293b',
            },
        },
        grid: {
            borderColor: isDark ? '#334155' : '#e2e8f0',
            strokeDashArray: 4,
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 10,
            },
        },
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comparativo entre Clientes</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Análise financeira detalhada</p>
                    </div>
                </div>
            </div>
            
            {/* Chart */}
            <div className="px-4 pb-4">
                <ReactApexChart options={options} series={series} type="area" height={420} />
            </div>
        </div>
    );
};
