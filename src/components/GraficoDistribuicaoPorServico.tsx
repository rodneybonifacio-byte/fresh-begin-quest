import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface ServicoDistribuicao {
    servico: string;
    total: number;
    totalNoPrazo: number;
    totalComAtraso: number;
}

interface Props {
    dados: ServicoDistribuicao[];
}

export default function GraficoDistribuicaoPorServico({ dados }: Props) {
    const isDark = document.documentElement.classList.contains('dark');
    
    const series = [
        {
            name: "No Prazo",
            data: dados.map((d) => d.totalNoPrazo),
        },
        {
            name: "Com Atraso",
            data: dados.map((d) => d.totalComAtraso),
        },
    ];

    const options: ApexOptions = {
        chart: {
            type: "bar",
            stacked: true,
            toolbar: { show: false },
            background: 'transparent',
        },
        colors: ["#22c55e", "#ef4444"],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "50%",
            },
        },
        xaxis: {
            categories: dados.map((d) => d.servico),
            labels: {
                style: {
                    colors: isDark ? '#e5e7eb' : '#6b7280',
                },
            },
        },
        dataLabels: {
            enabled: true,
            style: {
                colors: [isDark ? '#e5e7eb' : '#111'],
            },
        },
        legend: {
            position: "top",
            labels: {
                colors: isDark ? '#e5e7eb' : '#374151',
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: (val: number) => `${val} envios`,
            },
        },
        grid: {
            borderColor: isDark ? '#374151' : '#e5e7eb',
        },
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 shadow rounded w-full flex-1">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Distribuição por Serviço</h2>
            <ReactApexChart options={options} series={series} type="bar" height={350} />
        </div>
    );
}
