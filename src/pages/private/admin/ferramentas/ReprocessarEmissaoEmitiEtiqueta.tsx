import { useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Calendar, Filter } from 'lucide-react';
import { ButtonComponent } from '../../../../components/button';
import { DataTable } from '../../../../components/DataTable';
import { InputLabel } from '../../../../components/input-label';
import { LoadSpinner } from '../../../../components/loading';
import { NotFoundData } from '../../../../components/NotFoundData';
import { StatusBadgeEmissao } from '../../../../components/StatusBadgeEmissao';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { EmissaoService } from '../../../../services/EmissaoService';
import type { IEmissao } from '../../../../types/IEmissao';
import { formatDateTime, getToday } from '../../../../utils/date-utils';
import { truncateText } from '../../../../utils/funcoes';
import { Content } from '../../Content';

const ReprocessarEmissaoEmitiEtiqueta = () => {
    const { setIsLoading } = useLoadingSpinner();
    const clientQuery = useQueryClient();
    const service = new EmissaoService();
    const today = getToday();
    const [showFiltros, setShowFiltros] = useState(false);
    const [dataInicioFiltro, setDataInicioFiltro] = useState<string>(today);
    const [dataFimFiltro, setDataFimFiltro] = useState<string>(today);
    const [filtros, setFiltros] = useState<{ dataIni: string; dataFim: string; codigoObjeto: string }>({
        dataIni: today,
        dataFim: today,
        codigoObjeto: 'isNull',
    });

    const {
        data: emissoes,
        isLoading,
        isError,
    } = useFetchQuery<IEmissao[]>(['emissoes', 'reprocessar-emissao', filtros], async () => (await service.getAll(filtros, 'admin/sem-etiqueta')).data);

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            setIsLoading(true);
            return service.reprocessarEmissao(id);
        },
        onSuccess: () => {
            setIsLoading(false);
            toast.success('Registro reprocessado com sucesso!', { duration: 5000, position: 'top-center' });
            clientQuery.invalidateQueries({ queryKey: ['emissoes', 'reprocessar-emissao'] });
        },
        onError: (_error) => {
            setIsLoading(false);
            toast.error('Erro ao reprocessar o registro!', { duration: 5000, position: 'top-center' });
        },
    });

    const handleReprocessar = async (id: string) => {
        try {
            await mutation.mutateAsync(id);
        } catch (_error) {
            // Erro já é tratado na mutation
        }
    };

    const [emissoesOriginais, setEmissoesOriginais] = useState<IEmissao[]>([]);

    useEffect(() => {
        if (emissoes) setEmissoesOriginais(emissoes);
    }, [emissoes]);

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
            titulo="Ferramentas - Reprocessar Emissão Etiqueta"
            subTitulo="Reprocesse emissões que não geraram etiquetas corretamente."
            isToBack
            data={emissoes}
            button={[
                {
                    label: 'Filtros',
                    onClick: () => setShowFiltros(!showFiltros),
                    icon: <Filter size={22} className="text-slate-500" />,
                    bgColor: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
                },
            ]}
            isButton
        >
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
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && emissoes && emissoes.length > 0 && (
                <div className="rounded-lg flex flex-col gap-2 bg-white dark:bg-slate-800 p-4 border border-gray-200 dark:border-gray-700">
                    <div className="md:lg:xl:block">
                        <DataTable<IEmissao>
                            rowKey={(row) => row.id?.toString() || ''}
                            data={emissoesOriginais}
                            columns={[
                                {
                                    header: 'Objeto',
                                    accessor: (emissao) => (
                                        <div className="flex-col flex">
                                            <span className="font-medium text-gray-900 dark:text-gray-100"> {emissao.id || '-------------'}</span>
                                            <span className="font-medium text-xs text-slate-400 dark:text-slate-500">{emissao.servico}</span>
                                        </div>
                                    ),
                                },
                                {
                                    header: 'Remetente',
                                    accessor: (row) => (
                                        <div className="flex flex-col">
                                            <span className="font-medium">{truncateText(row.remetenteNome || '---', 15)}</span>
                                            <small className="text-slate-500 dark:text-slate-400">{row.cliente?.nome}</small>
                                        </div>
                                    ),
                                },
                                {
                                    header: 'Destinatario',
                                    accessor: (emissao) => <span className="text-gray-900 dark:text-gray-100">{emissao.destinatario?.nome}</span>,
                                },
                                {
                                    header: 'Status',
                                    accessor: (emissao) => (
                                        <StatusBadgeEmissao
                                            status={emissao.status}
                                            mensagensErrorPostagem={emissao.mensagensErrorPostagem}
                                            handleOnViewErroPostagem={() => console.log('emissao.mensagensErrorPostagem')}
                                        />
                                    ),
                                },
                                {
                                    header: 'Criado em',
                                    accessor: (row) => {
                                        return formatDateTime(row.criadoEm);
                                    },
                                },
                            ]}
                            actions={[
                                {
                                    label: 'Reprocessar',
                                    onClick: (emissao) => handleReprocessar(emissao.id?.toString() || ''),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}

            {isError && <NotFoundData />}
        </Content>
    );
};

export default ReprocessarEmissaoEmitiEtiqueta;
