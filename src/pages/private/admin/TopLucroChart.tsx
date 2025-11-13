import { ApexOptions } from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { IFaturaDashboardResumoCliente } from '../../../types/fatura/IFatauraDashboard';

interface Props {
    comparativoClientes: IFaturaDashboardResumoCliente[];
}

export const TopLucroChart = ({ comparativoClientes }: Props) => {
    const isDark = document.documentElement.classList.contains('dark');
    const top5 = [...comparativoClientes]
        .sort((a, b) => Number(b.lucro) - Number(a.lucro))
        .slice(0, 5);

    let categories = top5.map(c => c.cliente.length > 18 ? c.cliente.substring(0, 18) + '...' : c.cliente);
    const series = [{
        name: 'Lucro',
        data: top5.map(c => Number(c.lucro))
    }];

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            height: 350,
            background: 'transparent',
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '60%',
            },
        },
        colors: ['#8b5cf6'], // Roxo
        dataLabels: {
            enabled: true,
            formatter: val => 'R$ ' + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            style: {
                colors: [isDark ? '#e5e7eb' : '#111'],
            },
        },
        xaxis: {
            categories,
            labels: {
                style: {
                    colors: isDark ? '#e5e7eb' : '#6b7280',
                    fontWeight: 500,
                },
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: val => 'R$ ' + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            },
        },
        grid: {
            borderColor: isDark ? '#374151' : '#e5e7eb',
        },
        legend: { show: false },
    };

    return (
        <div className="p-4 bg-white dark:bg-slate-800 shadow rounded">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Top 5 Clientes com Maior Lucro</h2>
            <ReactApexChart options={options} series={series} type="bar" height={400} />
        </div>
    );
};
