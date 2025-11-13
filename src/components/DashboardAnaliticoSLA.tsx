import { StatCard } from "../components/StatCard";
import { PackageSearch, Truck, Timer, AlertTriangle, BarChart3 } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState } from "react";
import { ModalCustom } from "./modal";
import { TableCustom } from "./table";
import { StatusBadgeEmissao } from "./StatusBadgeEmissao";
import type { IEntregaAnaliticoDashboard, IEntregaDetalhada } from "../types/dashboard/IEntregaAnaliticoDashboard";
import GraficoDistribuicaoPorServico from "./GraficoDistribuicaoPorServico";

const barColors: Record<string, string> = {
    'ENTREGUE_NO_PRAZO': '#22c55e',
    'ENTREGUE_COM_ATRASO': '#ef4444',
    'EM_TRANSITO_NO_PRAZO': '#3b82f6',
    'EM_TRANSITO_COM_ATRASO': '#f97316',
};

interface Props {
    entregaAnalitico: IEntregaAnaliticoDashboard | null;
}

export default function DashboardAnaliticoSLA({ entregaAnalitico }: Props) {
    const isDark = document.documentElement.classList.contains('dark');
    
    // Verificar se entregaAnalitico existe antes de fazer destructuring
    if (!entregaAnalitico) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <PackageSearch className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Dados de SLA não disponíveis
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Não há dados analíticos de entrega para exibir no momento.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const { distribuicaoStatus, indicadores, detalhes } = entregaAnalitico;
    const [registrosFiltrados, setRegistrosFiltrados] = useState<IEntregaDetalhada[]>([]);

    // Verificações de segurança para as propriedades
    if (!distribuicaoStatus || !indicadores || !detalhes) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <AlertTriangle className="w-16 h-16 text-yellow-400" />
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Dados incompletos
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Os dados analíticos de entrega estão incompletos.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const series = [{
        name: 'Total',
        data: (distribuicaoStatus || []).map(item => item.total)
    }];

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            background: 'transparent',
            events: {
                dataPointSelection: (_event, _chartContext, config) => {
                    const selectedStatus = (distribuicaoStatus || [])[config.dataPointIndex]?.status;
                    if (selectedStatus) {
                        const filtrados = (detalhes || []).filter(reg => reg.statusEntrega === selectedStatus);
                        setRegistrosFiltrados(filtrados);
                    }
                }
            }
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '70%',
                distributed: true
            },
        },
        dataLabels: {
            enabled: true,
            style: {
                colors: [isDark ? '#e5e7eb' : '#111'],
            },
        },
        xaxis: {
            categories: (distribuicaoStatus || []).map(item => item.status),
            labels: {
                style: {
                    colors: isDark ? '#e5e7eb' : '#6b7280',
                },
            },
        },
        colors: (distribuicaoStatus || []).map(item => barColors[item.status]),
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: (val: number) => `${val} envios`,
            }
        },
        grid: {
            borderColor: isDark ? '#374151' : '#e5e7eb',
        },
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-4">
                    <StatCard
                        title="Entregues"
                        value={(indicadores.totalEntregues || 0).toString()}
                        icon={<PackageSearch />}
                        bgIcon="bg-green-700/30"
                        textColor="text-green-600"
                    />
                    <StatCard
                        title="Em Trânsito"
                        value={(indicadores.totalEmTransito || 0).toString()}
                        icon={<Truck />}
                        bgIcon="bg-blue-700/30"
                        textColor="text-blue-600"
                    />
                    <StatCard
                        title="Com Atraso"
                        value={(indicadores.totalComAtraso || 0).toString()}
                        icon={<AlertTriangle />}
                        bgIcon="bg-orange-700/30"
                        textColor="text-orange-600"
                    />
                    <StatCard
                        title="Atraso Médio"
                        value={`${(indicadores.atrasoMedio || 0).toFixed(1)} dias`}
                        icon={<Timer />}
                        bgIcon="bg-yellow-700/30"
                        textColor="text-yellow-600"
                    />
                    <StatCard
                        title="SLA"
                        value={`${(indicadores.sla || 0)}%`}
                        icon={<BarChart3 />}
                        bgIcon="bg-purple-700/30"
                        textColor={(indicadores.sla || 0) >= 90 ? 'text-green-600' : (indicadores.sla || 0) >= 75 ? 'text-yellow-500' : 'text-red-600'}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-between">
                    <div className="col-span-12 lg:col-span-10 bg-white dark:bg-slate-800 shadow rounded p-4 w-full">
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Distribuição por Status</h2>
                        <ReactApexChart options={options} series={series} type="bar" height={350} />
                    </div>
                    <GraficoDistribuicaoPorServico dados={entregaAnalitico.distribuicaoServicos || []} />
                </div>

            </div>
            {registrosFiltrados.length > 0 && (

                <ModalCustom
                    title="Registros Filtrados"
                    description={`Foram encontrados ${registrosFiltrados.length} registros com o status selecionado.`}
                    onCancel={() => setRegistrosFiltrados([])}
                >
                    <TableCustom
                        thead={['Objeto', 'Data Prevista', 'Último Evento', 'Status Atual', 'Dias de Atraso']}
                    >
                        {registrosFiltrados.map((reg, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="p-2 font-mono">{reg.codObjeto}</td>
                                <td className="p-2 text-center">{new Date(reg.dtPrevista).toLocaleDateString()}</td>
                                <td className="p-2 text-center">{new Date(reg.dataUltimoEvento).toLocaleDateString()}</td>
                                <td className="p-2 text-center">
                                    <StatusBadgeEmissao status={reg.status} handleOnViewErroPostagem={() => { }} />
                                </td>
                                <td className="p-2 text-center">{reg.diasDeAtraso}</td>
                            </tr>
                        ))}
                    </TableCustom>

                </ModalCustom>

            )}
        </div>
    );
}
