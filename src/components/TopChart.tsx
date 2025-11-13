import { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";
import { ChartTooltipBuilder } from "./ChartTooltipBuilder";

interface Item {
    label: string;
    totalEnviado: number;
    valorFrete: string;
    mediaFrete: string;
    extraInfo?: string;
}

interface Props {
    data: Item[];
    title: string;
    subtitle: string;
    chartType: 'bar' | 'pie' ;
    height?: number;
}

export const TopChart = ({ data, title, subtitle, chartType, height = 500 }: Props) => {
    const isDark = document.documentElement.classList.contains('dark');
    const top10 = [...data].sort((a, b) => b.totalEnviado - a.totalEnviado).slice(0, 10);

    const getBarChartConfig = () => {
        const series = [
            {
                name: "Valor Frete",
                data: top10.map((u) => u.totalEnviado),
            },
        ];

        const options: ApexOptions = {
            chart: {
                type: "bar",
                height,
                toolbar: { show: false },
                background: 'transparent',
            },
            colors: ["#60a5fa"],
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: "70%",
                },
            },
            dataLabels: {
                enabled: true,
                formatter: (val: number) => `${val}`,
                style: {
                    fontSize: "12px",
                    colors: [isDark ? "#e5e7eb" : "#111"],
                },
            },
            xaxis: {
                categories: top10.map((u) => u.label || "N/D"),
                labels: {
                    style: {
                        fontSize: "12px",
                        colors: isDark ? "#e5e7eb" : "#6c757d",
                    },
                },
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                custom: ({ dataPointIndex }) => {
                    const item = top10[dataPointIndex];
                    return ChartTooltipBuilder({
                        title: item.extraInfo || item.label,
                        items: [
                            { label: "Envios", value: item.totalEnviado, icon: "📦" },
                            { label: "Faturamento", value: `R$ ${Number(item.valorFrete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: "💰" },
                            { label: "Média Frete", value: `R$ ${Number(item.mediaFrete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: "📊" }
                        ]
                    });
                },
            },
            stroke: {
                show: true,
                width: 1,
                colors: [isDark ? "#374151" : "#fff"],
            },
            grid: {
                borderColor: isDark ? "#374151" : "#f1f1f1",
            },
        };

        return { series, options };
    };

    const getPieChartConfig = () => {
        const series = top10.map((u) => u.totalEnviado);
        const options: ApexOptions = {
            chart: {
                type: "pie",
                height,
                toolbar: { show: false },
                background: 'transparent',
            },
            labels: top10.map((u) => u.label || "N/D"),
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                custom: ({ seriesIndex }) => {
                    const item = top10[seriesIndex];
                    return ChartTooltipBuilder({
                        title: item.extraInfo || item.label,
                        items: [
                            { label: "Envios", value: item.totalEnviado, icon: "📦" },
                            { label: "Faturamento", value: `R$ ${Number(item.valorFrete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: "💰" },
                            { label: "Média Frete", value: `R$ ${Number(item.mediaFrete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: "📊" }
                        ]
                    });
                }
            },
            legend: {
                position: "bottom",
                labels: {
                    colors: isDark ? '#e5e7eb' : '#374151',
                },
            },
        };

        return { series, options };
    };

    const { series, options } = chartType === "bar" ? getBarChartConfig() : getPieChartConfig();

    return (
        <div className="p-4 bg-white dark:bg-slate-800 shadow rounded">
            <h2 className="text-xl font-semibold mb-2 flex flex-col text-gray-900 dark:text-white">
                {title}
                <small className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</small>
            </h2>
            <ReactApexChart options={options} series={series} type={chartType} height={height} />
        </div>
    );
};
