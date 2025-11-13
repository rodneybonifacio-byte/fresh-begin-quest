import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { OrdemColetaService } from '../../../../services/OrdemColetaService';
import type { IEmissaoOrdemColeta } from '../../../../types/emissao/IEmissaoOrdemColeta';
import type { IResponse } from '../../../../types/IResponse';
import { Content } from '../../Content';
import { getToday } from '../../../../utils/date-utils';
import { LoadSpinner } from '../../../../components/loading';
import { Calendar, Filter } from 'lucide-react';
import { InputLabel } from '../../../../components/input-label';
import { ButtonComponent } from '../../../../components/button';
import { useState } from 'react';

const OrdemColeta: React.FC = () => {
    const today = getToday();
    const [showFiltros, setShowFiltros] = useState(false);
    const [dataInicioFiltro, setDataInicioFiltro] = useState<string>(today);
    const [dataFimFiltro, setDataFimFiltro] = useState<string>(today);
    const [filtros, setFiltros] = useState<{ dataIni: string; dataFim: string }>({
        dataIni: today,
        dataFim: today,
    });
    const service = new OrdemColetaService();

    const { data: ordemColeta, isLoading } = useFetchQuery<IResponse<IEmissaoOrdemColeta[]>>(['ordemColeta', filtros], async () => {
        return await service.getWithParams({ ...filtros });
    });

    // Função para atualizar os filtros de data
    const atualizarFiltro = () => {
        setFiltros((prevFiltros) => ({
            ...prevFiltros!,
            dataIni: dataInicioFiltro,
            dataFim: dataFimFiltro,
        }));
        // fecha filtros
        setShowFiltros(false);
    };

    return (
        <Content
            titulo="Ordem de Coleta"
            subTitulo="Acompanhe as ordens de coleta emitidas"
            button={[
                {
                    label: 'Filtros',
                    onClick: () => setShowFiltros(!showFiltros),
                    icon: <Filter size={22} className="text-slate-500" />,
                    bgColor: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
                },
            ]}
            isButton
            data={ordemColeta?.data || []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            
            {/* Card com total de objetos */}
            {ordemColeta?.data && ordemColeta.data.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                Total de Objetos para Coleta
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Soma de todos os objetos das ordens de coleta ({ordemColeta.data.length} clientes)
                            </p>
                        </div>
                        <div className="flex items-center">
                            <span className="bg-secondary dark:bg-secondary-dark text-white px-4 py-2 rounded-lg text-2xl font-bold">
                                {ordemColeta?.total || 0}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {showFiltros && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm w-full">
                    <div className="flex flex-col sm:flex-col gap-4 w-full">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                            <Calendar className="w-5 h-5" />
                            <span className="font-medium text-sm sm:text-base">Período:</span>
                        </div>

                        <div className="flex flex-col gap-3 flex-1">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                    <InputLabel
                                        labelTitulo="Data Inicial"
                                        type="date"
                                        value={dataInicioFiltro}
                                        onChange={(e) => setDataInicioFiltro(e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                    <InputLabel labelTitulo="Data Final" type="date" value={dataFimFiltro} onChange={(e) => setDataFimFiltro(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-start mt-2">
                                <ButtonComponent onClick={atualizarFiltro}>Aplicar Filtros</ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 auto-rows-fr">
                {ordemColeta?.data.map((ordem: IEmissaoOrdemColeta, index: number) => (
                    <div key={index} className="bg-white dark:bg-slate-800 rounded-md shadow-sm overflow-hidden border-l-4 border-secondary dark:border-secondary-dark flex flex-col justify-between h-full">
                        <div className="p-4 flex flex-col gap-3">
                            {/* Título + total */}
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold text-primary dark:text-primary-dark">{ordem.cliente}</h2>
                                <span className="bg-secondary dark:bg-secondary-dark text-white px-3 py-1 rounded-full text-sm font-medium">{ordem.totalObjeto}</span>
                            </div>

                            {/* Local e responsável */}
                            <div className="text-gray-600 dark:text-gray-300 flex flex-col gap-2 min-h-[100px]">
                                <p className="flex flex-col">
                                    <span className="font-medium">Local:</span>
                                    <span className="text-xs">{ordem.localColeta || 'N/D'}</span>
                                </p>
                                <p className="flex flex-col">
                                    <span className="font-medium">Responsável:</span>
                                    <span className="text-xs">{ordem.responsavel || 'N/D'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Horário de coleta sempre no rodapé */}
                        <div className="bg-gray-300 dark:bg-slate-700 px-4 py-2">
                            <p className="text-gray-800 dark:text-gray-200 font-medium text-sm">
                                Horário de Coleta:
                                <span className="text-gray-700 dark:text-gray-100 ml-1">{ordem.dataHoraColeta || 'N/D'}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </Content>
    );
};

export default OrdemColeta;
