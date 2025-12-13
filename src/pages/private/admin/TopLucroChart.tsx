import { ApexOptions } from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { IFaturaDashboardResumoCliente } from '../../../types/fatura/IFatauraDashboard';
import { Award } from 'lucide-react';

interface Props {
    comparativoClientes: IFaturaDashboardResumoCliente[];
}

export const TopLucroChart = ({ comparativoClientes }: Props) => {
    const isDark = document.documentElement.classList.contains('dark');
    const top5 = [...comparativoClientes]
        .sort((a, b) => Number(b.lucro) - Number(a.lucro))
        .slice(0, 5);

    const categories = top5.map(c => c.cliente.length > 20 ? c.cliente.substring(0, 20) + '...' : c.cliente);
    const series = [{
        name: 'Lucro',
        data: top5.map(c => Number(c.lucro))
    }];

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            height: 350,
            background: 'transparent',
            fontFamily: 'inherit',
            toolbar: { show: false },
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '70%',
                borderRadius: 8,
                borderRadiusApplication: 'end',
                distributed: true,
            },
        },
        colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
        dataLabels: {
            enabled: true,
            formatter: val => 'R$ ' + Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            style: {
                colors: ['#fff'],
                fontSize: '12px',
                fontWeight: 600,
            },
            offsetX: 0,
        },
        xaxis: {
            categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                formatter: val => 'R$ ' + Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 0 }),
                style: {
                    colors: isDark ? '#94a3b8' : '#64748b',
                    fontWeight: 500,
                    fontSize: '12px',
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: isDark ? '#e2e8f0' : '#1e293b',
                    fontWeight: 600,
                    fontSize: '13px',
                },
            },
        },
        tooltip: {
            enabled: true,
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: val => 'R$ ' + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            },
        },
        grid: {
            borderColor: isDark ? '#334155' : '#e2e8f0',
            strokeDashArray: 4,
            xaxis: {
                lines: { show: true }
            },
            yaxis: {
                lines: { show: false }
            },
        },
        legend: { show: false },
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-500/10 to-purple-500/5 rounded-full blur-3xl" />
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/20">
                        <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Top 5 Clientes</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Maior lucratividade</p>
                    </div>
                </div>
            </div>
            
            {/* Chart */}
            <div className="px-4 pb-4">
                <ReactApexChart options={options} series={series} type="bar" height={380} />
            </div>
        </div>
    );
};
