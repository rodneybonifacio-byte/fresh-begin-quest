import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { IGsDominioBase } from '../types/log/IGsDominioBase';
import type { ILogLevelGroup, Log, LogGroup } from '../types/log/ILogs';
import type { ILogType } from '../types/log/ILogType';
import { LogIcon, type ApiLogLevel } from '../types/log/LogIcon';
import { getToday } from '../utils/date-utils';
import { ButtonComponent } from './button';
import SelectCustom from './custom-select';

import { ModalCustom } from './modal';
import { NotFoundData } from './NotFoundData';

const tipoLevelLogData: ILogType[] = [
    {
        id: 'ALL',
        name: 'Todos',
        color: 'text-gray-500',
        bg: 'bg-gray-500',
    },
    {
        id: 'INF',
        name: 'Information',
        color: 'text-blue-500',
        bg: 'bg-blue-500',
    },
    {
        id: 'WRN',
        name: 'Warning',
        color: 'text-yellow-500',
        bg: 'bg-yellow-500',
    },
    {
        id: 'DBG',
        name: 'Debug',
        color: 'text-green-500',
        bg: 'bg-green-500',
    },
    {
        id: 'ERR',
        name: 'Error',
        color: 'text-red-500',
        bg: 'bg-red-500',
    },
];

export const LogsView: React.FC = () => {
    const [expandedGroups, setExpandedGroups] = useState<{ [date: string]: boolean }>({});
    const [expandedLogs, setExpandedLogs] = useState<{ [index: string]: boolean }>({});
    const [, setTipoLogFiltro] = useState<string>('ALL');
    const [_dtInicio, setDataInicial] = useState(getToday());
    const [_dtFinal, setDataFinal] = useState(getToday());
    const [isFilterModal, setIsFilterModal] = useState(false);
    const [filteredLogs, setFilteredLogs] = useState<LogGroup[]>([]);
    const [tipoLevelLog, setTipoLevelLog] = useState<ILogType[]>([]);
    const [isSetClientModal, setIsSetClientModal] = useState<boolean>(false);

    /** client set log */
    const [clientLog, _setClientLog] = useState<IGsDominioBase | null>(null);
    const { data: clientLogsData } = useQuery<LogGroup[]>({
        queryKey: [clientLog],
        queryFn: () => void 0 as any, // api
        staleTime: 1000 * 60 * 60,
        enabled: clientLog ? true : false,
    });

    const toggleGroupExpand = (date: string) => {
        setExpandedGroups((prev) => ({ ...prev, [date]: !prev[date] }));
    };

    const toggleLogExpand = (index: string) => {
        setExpandedLogs((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const formatDate = (timestamp: string, withTime: boolean = false) => {
        const date = parseISO(timestamp);
        return format(date, withTime ? 'dd MMM yyyy HH:mm:ss' : 'dd MMM yyyy', { locale: ptBR });
    };

    const clearFilter = () => {
        setTipoLogFiltro('ALL');
        setDataInicial(getToday());
        setDataFinal(getToday());
        setFilteredLogs(filteredLogs); // Reset the filtered logs to the original logs
        setIsFilterModal(false);
    };

    const applyFilter = () => {
        let filteredLogs = clientLogsData ? clientLogsData : ([] as LogGroup[]);
        setFilteredLogs(filteredLogs);
        setIsFilterModal(false);
    };

    const getLevelColor = (level: string) => {
        const levelItem = tipoLevelLog.find((item) => item.name.toLocaleLowerCase() === level.toLocaleLowerCase());
        return levelItem ? levelItem.color : 'text-gray-500';
    };

    const hendlerOpenModal = () => {
        setIsFilterModal((prevModal) => !prevModal);
    };

    const hendlerOpenModalSetClient = () => {
        setIsSetClientModal((prevModal) => !prevModal);
    };

    /** useEffects */
    useEffect(() => {
        setTipoLevelLog(tipoLevelLogData as ILogType[]);
        setFilteredLogs(clientLogsData || ([] as LogGroup[]));
    }, [clientLogsData]);

    return (
        <>
            <div className="flex flex-col gap-3">
                {/* {!clientLog && (
                    <div className="flex flex-col gap-3 border-1 border-gray-800 py-3 px-3 rounded-lg bg-gs-light mt-4">
                        <span className="text-zinc-300 font-semibold text-sm">Selecione um cliente para visualizar os logs gerados pelo sistema da API.</span>
                        <ClientLogMonitor setClientLog={setClientLog} />
                    </div>
                )} */}

                {filteredLogs.length > 0 ? (
                    filteredLogs.map((group: LogGroup) => (
                        <div key={group.date} className="rounded-lg shadow-small bg-gray-50 dark:bg-gs-light">
                            <div className="w-full cursor-pointer text-left p-4 rounded-lg dark:text-zinc-100 dark:bg-gs-light hover:bg-gray-600 focus:outline-none focus:bg-gray-600">
                                <div className="flex justify-between rounded-lg font-semibold items-center">
                                    <div className="flex justify-between items-center flex-1" onClick={() => toggleGroupExpand(group.date)}>
                                        <span>{formatDate(group.date)}</span>
                                        <div className="flex flex-row gap-3 justify-center items-center">
                                            <div className="flex flex-row gap-3">
                                                {group.levelCounts.Warning && (
                                                    <span className="rounded-full bg-yellow-500 p-1 flex justify-center items-center text-xs">
                                                        {group.levelCounts.Warning.toString().padStart(2, '0')}
                                                    </span>
                                                )}
                                                {group.levelCounts.Information && (
                                                    <span className="rounded-full bg-blue-500 p-1 flex justify-center items-center text-xs">
                                                        {group.levelCounts.Information.toString().padStart(2, '0')}
                                                    </span>
                                                )}
                                                {group.levelCounts.Debug && (
                                                    <span className="rounded-full bg-green-500 p-1 flex justify-center items-center text-xs">
                                                        {group.levelCounts.Debug.toString().padStart(2, '0')}
                                                    </span>
                                                )}
                                                {group.levelCounts.Error && (
                                                    <span className="rounded-full bg-red-500 p-1 flex justify-center items-center text-xs">
                                                        {group.levelCounts.Error.toString().padStart(2, '0')}
                                                    </span>
                                                )}
                                            </div>
                                            {!expandedGroups[group.date] ? <ChevronDown /> : <ChevronUp />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {expandedGroups[group.date] && (
                                <div className="p-4 dark:bg-gs-light whitespace-pre-wrap mt-2">
                                    {group.levels.map((logLevel: ILogLevelGroup, index: number) => (
                                        <div key={index} className="border-b last:border-b-0">
                                            <button
                                                onClick={() => toggleLogExpand(`${group.date}-${index}`)}
                                                className="w-full text-left  p-4 dark:text-zinc-100 dark:bg-gs-light hover:bg-gray-600 focus:outline-none focus:bg-gray-600"
                                            >
                                                <div className="flex justify-between">
                                                    <span className={`font-semibold ${getLevelColor(logLevel.level)}`}>{logLevel.level}</span>
                                                    <LogIcon level={logLevel.level.toString() as ApiLogLevel} />
                                                </div>
                                            </button>
                                            {expandedLogs[`${group.date}-${index}`] && (
                                                <div className="p-4 border-t-1 border-zinc-500 dark:text-zinc-100 dark:bg-gs-light">
                                                    {logLevel.logs.map((log: Log) => (
                                                        <p>
                                                            {log.timestamp} - {log.message}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <NotFoundData />
                )}
            </div>

            {isFilterModal && (
                <ModalCustom title={`Filtro - ${clientLog && clientLog.nome}`} onCancel={hendlerOpenModal}>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-y-2">
                            <SelectCustom
                                data={tipoLevelLog.map((item) => ({
                                    label: item.name,
                                    value: item.name,
                                }))}
                                label="Tipo log"
                                onChange={(e: any) => setTipoLogFiltro(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-row gap-2">
                            <ButtonComponent onClick={clearFilter}>
                                <span>Cancelar</span>
                            </ButtonComponent>
                            <ButtonComponent onClick={applyFilter}>
                                <span>Filtrar</span>
                            </ButtonComponent>
                        </div>
                    </div>
                </ModalCustom>
            )}

            {isSetClientModal && (
                <ModalCustom
                    title="Selecionar um cliente"
                    description="Selecione um cliente para visualizar os logs gerados pelo sistema da API."
                    onCancel={hendlerOpenModalSetClient}
                >
                    {/* <ClientLogMonitor setClientLog={setClientLog} setIsCloseModal={hendlerOpenModalSetClient} /> */}
                    <div className="p-4">Seleção de cliente aqui...</div>
                </ModalCustom>
            )}
        </>
    );
};
