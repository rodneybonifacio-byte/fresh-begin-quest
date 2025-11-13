import { ApexOptions } from 'apexcharts';
import ReactApexChart from "react-apexcharts";
import { IFaturaDashboardResumoCliente } from "../../../types/fatura/IFatauraDashboard";

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
        },
        colors: ['#3b82f6', '#10b981', '#ea580c', '#8b5cf6'], // Azul, Verde, Laranja escuro, Roxo (Lucro)
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: 'smooth',
            width: 2,
        },
        markers: {
            size: 4,
            strokeWidth: 2,
            hover: {
                size: 6,
            },
        },
        xaxis: {
            categories: truncadas,
            labels: {
                style: {
                    colors: isDark ? "#e5e7eb" : "#6c757d",
                    fontSize: "12px",
                    fontWeight: 500,
                },
            },
        },
        yaxis: {
            labels: {
                formatter: val =>
                    "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
                style: {
                    colors: isDark ? "#e5e7eb" : "#6c757d",
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
                fontSize: '14px',
            },
            y: {
                formatter: val =>
                    "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            },
        },
        fill: {
            type: 'solid',
            opacity: 0.3,
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            fontSize: '14px',
            fontWeight: 500,
            labels: {
                colors: isDark ? '#e5e7eb' : '#374151',
            },
        },
        grid: {
            borderColor: isDark ? '#374151' : '#e5e7eb',
        },
    };

    return (
        <div className="p-4 bg-white dark:bg-slate-800 shadow rounded">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Comparativo entre Clientes</h2>
            <ReactApexChart options={options} series={series} type="area" height={450} />
        </div>
    );
};
