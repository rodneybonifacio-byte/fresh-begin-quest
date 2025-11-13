import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { DataTable } from '../../../../components/DataTable';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useLayout } from '../../../../providers/LayoutContext';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { JobService } from '../../../../services/JobService';
import { Content } from '../../Content';

type Job = {
    id: number;
    name: string;
    command: string;
    cronExpression: string;
    isActive: boolean;
};

const CronJobList: React.FC = () => {
    const { setIsLoading } = useLoadingSpinner();
    const { layout } = useLayout();
    const [data, setData] = useState<Job[]>([]);
    const [selectedLog, setSelectedLog] = useState<string | null>(null);
    const [logJobId, setLogJobId] = useState<number | null>(null);

    const service = new JobService();
    const queryClient = useQueryClient();
    //Dashboard estatisticas
    const { data: jobsData } = useFetchQuery<any>(['jobs'], async () => {
        const response = await service.getAll();
        return response ?? {}; // <- evita retorno undefined
    });

    const toggleJob = async (job: Job) => {
        console.log(job);

        try {
            await mutation.mutateAsync(job);
        } catch (error) {
            console.error('Error toggling job:', error);
        }
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
    };

    const mutation = useMutation({
        mutationFn: async (input: Job) => {
            if (!input.id) {
                throw new Error('Emissão não encontrada.');
            }
            setIsLoading(true);
            const response = await service.update(`${input.id}/${input.isActive ? 'disable' : 'enable'}`, { status: input.isActive });
            return { success: true, response };
        },
        onSuccess: () => {
            setIsLoading(false);
        },
        onError: (error) => {
            setIsLoading(false);
            throw error;
        },
    });

    const openLogs = async (jobId: number) => {
        const { data } = await axios.get(`/jobs/${jobId}/logs`, {
            responseType: 'text',
        });
        setSelectedLog(data);
        setLogJobId(jobId);
    };

    const closeLogs = () => {
        setSelectedLog(null);
        setLogJobId(null);
    };

    useEffect(() => {
        if (jobsData?.data) {
            setData(jobsData.data);
        }
    }, [jobsData]);

    return (
        <Content
            titulo="Acompanhamento de envios"
            subTitulo="Acompanhe os envios realizados, visualize detalhes e estatísticas em geral."
            data={data && data.length > 0 ? data : []}
            isButton
            button={[
                {
                    label: 'Adicionar',
                    link: `/${layout}/jobs-cron/adicionar`,
                },
            ]}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
                <DataTable<Job>
                    data={data}
                    rowKey={(job) => job.id}
                    columns={[
                        {
                            header: 'nome',
                            accessor: 'name',
                        },
                        {
                            header: 'comando',
                            accessor: 'command',
                        },
                        {
                            header: 'frequência',
                            accessor: 'cronExpression',
                        },
                        {
                            header: 'status',
                            accessor: (job) => (
                                <span
                                    className={`inline-block text-xs font-semibold px-2 py-1 rounded ${
                                        job.isActive
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-gray-200 text-red-600 dark:bg-red-700 dark:text-red-300'
                                    }`}
                                >
                                    {job.isActive ? 'Ativo' : 'Desligado'}
                                </span>
                            ),
                        },
                    ]}
                    actions={[
                        {
                            label: 'Ativa/Desativa',
                            onClick: (job) => toggleJob(job),
                        },
                        {
                            label: 'Editar',
                            to: (row) => `/${layout}/jobs-cron/${row.id}/edit`,
                        },
                        {
                            label: 'Ver Logs',
                            onClick: (job) => openLogs(job.id),
                        },
                    ]}
                />
            </div>

            {/* Modal de logs */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
                    <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Logs do Job #{logJobId}</h3>
                            <button onClick={closeLogs} className="text-red-500 hover:text-red-600 dark:hover:text-red-300 text-sm">
                                Fechar
                            </button>
                        </div>
                        <pre className="text-sm text-gray-700 dark:text-gray-100 whitespace-pre-wrap">{selectedLog}</pre>
                    </div>
                </div>
            )}
        </Content>
    );
};

export default CronJobList;
