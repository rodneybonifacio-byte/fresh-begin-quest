import { DollarSign, Filter, PackageCheck, Printer, ReceiptText, ShoppingCart, Users, Wallet, Download, Bell, RefreshCw, Map as MapIcon, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadSpinner } from '../../../../components/loading';
import { PaginacaoCustom } from '../../../../components/PaginacaoCustom';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useGlobalConfig } from '../../../../providers/GlobalConfigContext';
import { EmissaoService } from '../../../../services/EmissaoService';
import type { IDashboard } from '../../../../types/IDashboard';
import type { IEmissao } from '../../../../types/IEmissao';
import type { IResponse } from '../../../../types/IResponse';
import { Content } from '../../Content';
import { FiltroEmissao } from '../../emissao/FiltroEmissao';
import { ModalViewErroPostagem } from '../../emissao/ModalViewErroPostagem';

import { DataTable } from '../../../../components/DataTable';
import { ResponsiveTabMenu } from '../../../../components/ResponsiveTabMenu';
import { StatusBadgeEmissao } from '../../../../components/StatusBadgeEmissao';
import { useImprimirEtiquetaPDF } from '../../../../hooks/useImprimirEtiquetaPDF';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { formatDateTime } from '../../../../utils/date-utils';
import { calcularLucro, formatMoedaDecimal } from '../../../../utils/formatCurrency';
import { formatCpfCnpj } from '../../../../utils/lib.formats';
import { ModalViewPDF } from '../../emissao/ModalViewPDF';
import { ModalAtualizarPrecos } from './ModalAtualizarPrecos';
import { exportEmissoesToExcel } from '../../../../utils/exportToExcel';
import { fetchEmissoesEmAtraso, type EmissaoEmAtraso } from '../../../../services/EmissoesEmAtrasoService';
import { differenceInDays, parseISO, format } from 'date-fns';
import { supabase } from '../../../../integrations/supabase/client';
import { toast } from 'sonner';
import { ShipmentTrackingMap } from '../../../../components/maps/ShipmentTrackingMap';
import { ModalGerarManifestoSaida } from './ModalGerarManifestoSaida';

const RltEnvios = () => {
    const config = useGlobalConfig();
    const { setIsLoading } = useLoadingSpinner();
    const perPage = config.pagination.perPage;
    const [page, setPage] = useState<number>(1);
    const [tab, setTab] = useState<string>('PRE_POSTADO');

    const service = new EmissaoService();
    const [isModalViewErroPostagem, setIsModalViewErroPostagem] = useState(false);
    const [erroPostagem, setErroPostagem] = useState<string | undefined>('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [data, setData] = useState<IEmissao[]>([]);
    const [isModalViewPDF, setIsModalViewPDF] = useState(false);
    const [etiqueta, setEtiqueta] = useState<{ nome: string; dados: string }>();
    const [isModalUpdatePrecos, setIsModalUpdatePrecos] = useState<{ isOpen: boolean; emissao: IEmissao }>({ isOpen: false, emissao: {} as IEmissao });
    const [showMap, setShowMap] = useState(true);
    const [isModalManifesto, setIsModalManifesto] = useState(false);

    const [searchParams] = useSearchParams();
    const filtros = Object.fromEntries(searchParams.entries());

    //Dashboard estatisticas
    const { data: dashboard } = useFetchQuery<IDashboard>(['dashboard-totais', 'admin', filtros], async () => {
        const response = await service.dashboard(filtros, 'dashboard/admin');
        return response ?? {}; // <- evita retorno undefined
    });

    // Buscar todos os dados para o mapa (sem paginação) - busca em lotes para pegar tudo
    const { data: allEmissoesForMap } = useFetchQuery<IEmissao[]>(
        ['emissoes-map-all', 'admin', filtros],
        async () => {
            const allEmissoes: IEmissao[] = [];
            const batchSize = 100;
            let offset = 0;
            let hasMore = true;
            
            const dataIni = searchParams.get('dataIni') || undefined;
            const dataFim = searchParams.get('dataFim') || undefined;
            
            while (hasMore) {
                const params: Record<string, string | number> = {
                    limit: batchSize,
                    offset: offset,
                };
                if (dataIni) params.dataIni = dataIni;
                if (dataFim) params.dataFim = dataFim;
                
                const response = await service.getAll(params, 'admin');
                const batch = response?.data || [];
                allEmissoes.push(...batch);
                
                // Se retornou menos que o batch, não há mais dados
                if (batch.length < batchSize) {
                    hasMore = false;
                } else {
                    offset += batchSize;
                }
                
                // Limite de segurança: máximo 5000 registros para não travar
                if (allEmissoes.length >= 5000) {
                    hasMore = false;
                }
            }
            
            return allEmissoes;
        },
        { staleTime: 5 * 60 * 1000 } // Cache por 5 minutos
    );

    const {
        data: emissoes,
        isLoading,
        isError,
    } = useFetchQuery<IResponse<IEmissao[]>>(['emissoes', filtros, 'admin', page, tab], async () => {
        // Para EM_ATRASO, buscar da tabela do Supabase
        if (tab === 'EM_ATRASO') {
            // Buscar todas as emissões em atraso sem limite de dias
            const atrasadas = await fetchEmissoesEmAtraso();
            const mapped = atrasadas.map((atraso: EmissaoEmAtraso) => ({
                id: atraso.emissao_id,
                codigoObjeto: atraso.codigo_objeto,
                status: 'EM_ATRASO',
                remetenteNome: atraso.remetente_nome || '',
                destinatario: atraso.destinatario_nome ? { nome: atraso.destinatario_nome } : undefined,
                dataPrevisaoEntrega: atraso.data_previsao_entrega || undefined,
                clienteId: atraso.cliente_id || undefined,
            })) as unknown as IEmissao[];
            
            // Aplicar paginação local
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const paginatedData = mapped.slice(start, end);
            
            return {
                data: paginatedData,
                meta: {
                    totalRecords: mapped.length,
                    totalPages: Math.ceil(mapped.length / perPage),
                    currentPage: page,
                    nextPage: page < Math.ceil(mapped.length / perPage) ? page + 1 : null,
                    prevPage: page > 1 ? page - 1 : null,
                    recordsOnPage: paginatedData.length,
                }
            } as IResponse<IEmissao[]>;
        }
        
        // Para outros status, buscar da API normalmente
        const params: {
            limit: number;
            offset: number;
            dataIni?: string;
            dataFim?: string;
            destinatario?: string;
            status?: string;
            codigoObjeto?: string;
            clienteId?: string;
            remetenteId?: string;
            transportadora?: string;
        } = {
            limit: perPage,
            offset: (page - 1) * perPage,
            status: tab,
        };

        const dataIni = searchParams.get('dataIni') || undefined;
        const dataFim = searchParams.get('dataFim') || undefined;
        const status = searchParams.get('status') || undefined;
        const clienteId = searchParams.get('clienteId') || undefined;
        const remetenteId = searchParams.get('remetenteId') || undefined;
        const transportadora = searchParams.get('transportadora') || undefined;

        if (dataIni) params.dataIni = dataIni;
        if (dataFim) params.dataFim = dataFim;
        if (status) params.status = status;
        if (clienteId) params.clienteId = clienteId;
        if (remetenteId) params.remetenteId = remetenteId;
        if (transportadora) params.transportadora = transportadora;

        return await service.getAll(params, 'admin');
    });

    const handleOnViewErroPostagem = async (jsonContent?: string) => {
        setErroPostagem(jsonContent);
        setIsModalViewErroPostagem(true);
    };

    const handlerToggleFilter = () => {
        setIsFilterOpen((prev) => !prev);
    };

    const handleEnviarAvisosAtraso = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.functions.invoke('cron-aviso-atraso', {
                body: { manual: true }
            });
            
            if (error) {
                toast.error('Erro ao enviar avisos de atraso');
                console.error('Erro:', error);
                return;
            }
            
            toast.success(`Avisos enviados: ${data?.avisos_enviados || 0} | Falhas: ${data?.falhas || 0}`);
        } catch (error) {
            console.error('Erro ao disparar avisos:', error);
            toast.error('Erro ao enviar avisos de atraso');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAtualizarAtrasos = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.functions.invoke('cron-verificar-atrasos', {
                body: { manual: true }
            });
            
            if (error) {
                toast.error('Erro ao atualizar atrasos');
                console.error('Erro:', error);
                return;
            }
            
            toast.success(`Atrasos atualizados: ${data?.total_atrasos_registrados || 0} envios em atraso detectados`);
            // Recarregar a página para mostrar os dados atualizados
            window.location.reload();
        } catch (error) {
            console.error('Erro ao atualizar atrasos:', error);
            toast.error('Erro ao atualizar atrasos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnviarNotificacoesRetirada = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.functions.invoke('cron-verificar-aguardando-retirada', {
                body: { manual: true }
            });
            
            if (error) {
                toast.error('Erro ao enviar notificações de retirada');
                console.error('Erro:', error);
                return;
            }

            const notificadosAgora = (data as any)?.notificados_agora ?? (data as any)?.notificados ?? 0;
            const falhas = Array.isArray((data as any)?.erros) ? (data as any).erros.length : ((data as any)?.falhas ?? 0);
            const jaNotificados = (data as any)?.ja_notificados ?? 0;

            if (notificadosAgora > 0) {
                toast.success(`Notificações enviadas: ${notificadosAgora} | Falhas: ${falhas}`);
            } else {
                toast.warning(`Nenhuma notificação enviada. Já notificados: ${jaNotificados} | Falhas: ${falhas}`);
            }
        } catch (error) {
            console.error('Erro ao disparar notificações:', error);
            toast.error('Erro ao enviar notificações de retirada');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReenviarNotificacaoRetirada = async (emissao: IEmissao) => {
        if (!emissao.codigoObjeto) {
            toast.error('Código de rastreio não encontrado');
            return;
        }

        const confirmar = window.confirm(
            `Tem certeza que deseja REENVIAR a notificação de retirada para o objeto "${emissao.codigoObjeto}"?\n\nIsso irá remover o registro anterior e enviar uma nova notificação.`
        );
        
        if (!confirmar) return;

        try {
            setIsLoading(true);
            
            // 1. Deletar registro existente na tabela notificacoes_aguardando_retirada
            const { error: deleteError } = await supabase
                .from('notificacoes_aguardando_retirada')
                .delete()
                .eq('codigo_objeto', emissao.codigoObjeto);
            
            if (deleteError) {
                console.error('Erro ao deletar registro:', deleteError);
                // Continua mesmo se não existir registro (pode ser que nunca tenha sido notificado)
            }
            
            // 2. Chamar edge function para verificar e enviar notificação
            const { data, error } = await supabase.functions.invoke('cron-verificar-aguardando-retirada', {
                body: { 
                    manual: true,
                    codigoObjeto: emissao.codigoObjeto // Filtrar apenas este objeto
                }
            });
            
            if (error) {
                toast.error('Erro ao reenviar notificação');
                console.error('Erro:', error);
                return;
            }
            
            const notificadosAgora = (data as any)?.notificados_agora ?? (data as any)?.notificados ?? 0;
            const falhas = Array.isArray((data as any)?.erros) ? (data as any).erros.length : ((data as any)?.falhas ?? 0);

            if (notificadosAgora > 0) {
                toast.success('Notificação reenviada com sucesso!');
            } else if (falhas > 0) {
                toast.error('Falha ao enviar notificação. Verifique os logs.');
            } else {
                toast.warning('Nenhuma notificação enviada. Verifique se o objeto está com status AGUARDANDO_RETIRADA.');
            }
        } catch (error) {
            console.error('Erro ao reenviar notificação:', error);
            toast.error('Erro ao reenviar notificação');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportToExcel = async () => {
        try {
            setIsLoading(true);
            
            // Buscar filtros - status vazio significa exportar TODOS os status
            const dataIni = searchParams.get('dataIni') || undefined;
            const dataFim = searchParams.get('dataFim') || undefined;
            const statusParam = searchParams.get('status');
            const status = statusParam && statusParam.length > 0 ? statusParam : undefined;
            const clienteId = searchParams.get('clienteId') || undefined;
            const remetenteId = searchParams.get('remetenteId') || undefined;
            const transportadora = searchParams.get('transportadora') || undefined;

            // Buscar TODOS os registros em lotes
            const batchSize = 100;
            let offset = 0;
            let allData: IEmissao[] = [];
            let hasMore = true;

            while (hasMore) {
                const params: {
                    limit: number;
                    offset: number;
                    dataIni?: string;
                    dataFim?: string;
                    status?: string;
                    clienteId?: string;
                    remetenteId?: string;
                    transportadora?: string;
                } = {
                    limit: batchSize,
                    offset: offset,
                };

                if (dataIni) params.dataIni = dataIni;
                if (dataFim) params.dataFim = dataFim;
                if (status) params.status = status;
                if (clienteId) params.clienteId = clienteId;
                if (remetenteId) params.remetenteId = remetenteId;
                if (transportadora) params.transportadora = transportadora;

                const response = await service.getAll(params, 'admin');
                
                if (response?.data && response.data.length > 0) {
                    allData = [...allData, ...response.data];
                    offset += batchSize;
                    
                    // Se retornou menos que o batchSize, significa que não há mais dados
                    if (response.data.length < batchSize) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            if (allData.length > 0) {
                exportEmissoesToExcel(allData, `relatorio-envios-${dataIni || 'todos'}-${dataFim || 'todos'}`);
                toast.success(`Exportação concluída: ${allData.length} registros`);
            } else {
                toast.error('Nenhum dado encontrado para exportar. Verifique os filtros aplicados.');
            }
        } catch (error) {
            console.error('Erro ao exportar:', error);
            toast.error('Erro ao exportar dados. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (emissoes?.data) {
            setData(emissoes.data);
        }
    }, [emissoes]);

    const handlePageChange = async (pageNumber: number) => {
        setPage(pageNumber);
    };

    const { onEmissaoImprimir } = useImprimirEtiquetaPDF();
    const handleOnPDF = async (emissao: IEmissao, mergePdf: boolean = false) => {
        let novaEtiqueta: IResponse<{ nome: string; dados: string }>;
        if (mergePdf) {
            novaEtiqueta = await onEmissaoImprimir(emissao, 'merge', setIsLoading, setIsModalViewPDF);
        } else {
            novaEtiqueta = await onEmissaoImprimir(emissao, 'etiqueta', setIsLoading, setIsModalViewPDF);
        }
        setEtiqueta(novaEtiqueta.data);
    };

    return (
        <Content
            titulo="Acompanhamento de envios"
            subTitulo="Acompanhe os envios realizados, visualize detalhes e estatísticas em geral."
            isButton
            button={[
                ...(tab === 'EM_ATRASO' ? [
                    {
                        label: 'Atualizar Atrasos',
                        onClick: handleAtualizarAtrasos,
                        icon: <RefreshCw size={22} />,
                        bgColor: 'bg-blue-600',
                    },
                    {
                        label: 'Enviar Avisos',
                        onClick: handleEnviarAvisosAtraso,
                        icon: <Bell size={22} />,
                        bgColor: 'bg-orange-600',
                    }
                ] : []),
                ...(tab === 'AGUARDANDO_RETIRADA' ? [
                    {
                        label: 'Notificar Clientes',
                        onClick: handleEnviarNotificacoesRetirada,
                        icon: <Bell size={22} />,
                        bgColor: 'bg-purple-600',
                    }
                ] : []),
                {
                    label: 'Manifesto',
                    onClick: () => setIsModalManifesto(true),
                    icon: <ReceiptText size={22} />,
                    bgColor: 'bg-indigo-600',
                },
                {
                    label: 'Exportar XLSX',
                    onClick: handleExportToExcel,
                    icon: <Download size={22} />,
                    bgColor: 'bg-green-600',
                },
                {
                    label: 'Filtrar',
                    onClick: () => handlerToggleFilter(),
                    icon: <Filter size={22} />,
                },
            ]}
            data={emissoes?.data && emissoes.data.length > 0 ? emissoes.data : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            
            {/* Indicador de Filtros Ativos */}
            {(searchParams.get('dataIni') || searchParams.get('dataFim') || searchParams.get('status') || 
              searchParams.get('clienteId') || searchParams.get('remetenteId') || searchParams.get('transportadora')) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                        <Filter className="text-blue-600 dark:text-blue-400 mt-0.5" size={18} />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                Filtros Aplicados (serão considerados na exportação):
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {searchParams.get('dataIni') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                        Período: {searchParams.get('dataIni')} até {searchParams.get('dataFim')}
                                    </span>
                                )}
                                {searchParams.get('status') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                                        Status: {searchParams.get('status')}
                                    </span>
                                )}
                                {searchParams.get('transportadora') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                                        Transportadora: {searchParams.get('transportadora')}
                                    </span>
                                )}
                                {searchParams.get('clienteId') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200">
                                        Cliente filtrado
                                    </span>
                                )}
                                {searchParams.get('remetenteId') && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 dark:bg-pink-800 text-pink-800 dark:text-pink-200">
                                        Remetente filtrado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <>
                {isFilterOpen && <FiltroEmissao onCancel={handlerToggleFilter} isDestinatario />}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-4">
                    {/* Total de Envios */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Total de Envios</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{dashboard?.totalEnvios}</p>
                            </div>
                            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                                <PackageCheck className="text-purple-600 dark:text-purple-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Total de Vendas */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Vendas Aproximado</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{formatMoedaDecimal(dashboard?.totalVendas || 0)}</p>
                            </div>
                            <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                                <ShoppingCart className="text-orange-600 dark:text-orange-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Custo Total */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Custo Aproximado</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{formatMoedaDecimal(dashboard?.totalCusto || 0)}</p>
                            </div>
                            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg">
                                <Wallet className="text-red-600 dark:text-red-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Lucro Total */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Lucro Aproximado</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">
                                    {calcularLucro(Number(dashboard?.totalVendas), Number(dashboard?.totalCusto))}
                                </p>
                            </div>
                            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                                <DollarSign className="text-green-600 dark:text-green-400 text-xl" />
                            </div>
                        </div>
                    </div>
                    {/* Total de Clientes */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 dark:text-slate-400 text-xs">Total de Clientes</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{dashboard?.totalClientes}</p>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                                <Users className="text-blue-600 dark:text-blue-400 text-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </>

            {/* Mapa de Rastreamento Admin */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <MapIcon className="h-5 w-5 text-primary" />
                        Mapa de Rastreamento
                    </h3>
                    <button
                        onClick={() => setShowMap(!showMap)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            showMap 
                                ? 'bg-primary text-white' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        {showMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                    </button>
                </div>
                {showMap && allEmissoesForMap && allEmissoesForMap.length > 0 && (
                    <ShipmentTrackingMap 
                        emissoes={allEmissoesForMap.filter(e => 
                            ['EM_TRANSITO', 'POSTADO', 'SAIU_PARA_ENTREGA', 'EM_ATRASO', 'AGUARDANDO_RETIRADA'].includes(e.status || '')
                        )} 
                        enableAutoRefresh={true}
                        refreshIntervalMs={5 * 60 * 1000}
                        isAdmin={true}
                    />
                )}
            </div>

            <ResponsiveTabMenu tab={tab} setTab={setTab}>
                {!isLoading && !isError && emissoes && emissoes.data.length > 0 && (
                    <>
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
                            <DataTable<IEmissao>
                                data={data}
                                rowKey={(row) => row.id?.toString() || ''}
                                columns={[
                                    {
                                        header: 'Código Objeto',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-primary">{row.codigoObjeto}</span>
                                            </div>
                                        ),
                                    },
                                    // Transportadora - oculta na aba EM_ATRASO
                                    ...(tab !== 'EM_ATRASO' ? [{
                                        header: 'Transportadora',
                                        accessor: (row: IEmissao) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.transportadora}</span>
                                            </div>
                                        ),
                                    }] : []),
                                    // Tipo de Frete (PAC/SEDEX) - apenas na aba EM_ATRASO
                                    ...(tab === 'EM_ATRASO' ? [{
                                        header: 'Tipo Frete',
                                        accessor: (row: IEmissao) => {
                                            if (!row.servico) return '-';
                                            const servico = row.servico.toUpperCase();
                                            const isPac = servico.includes('PAC');
                                            const isSedex = servico.includes('SEDEX');
                                            return (
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    isSedex ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                                    isPac ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                }`}>
                                                    {row.servico}
                                                </span>
                                            );
                                        },
                                    }] : []),
                                    {
                                        header: 'Remetente',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.remetenteNome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {row.remetente?.endereco?.localidade || ''} - {row.remetente?.endereco?.uf || ''}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Cliente',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm">{row.cliente?.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {formatCpfCnpj(row.cliente?.cpfCnpj || '')}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Destinatário',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.destinatario?.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {row.destinatario?.endereco?.localidade || ''} - {row.destinatario?.endereco?.uf || ''}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    // Valores - oculta na aba EM_ATRASO
                                    ...(tab !== 'EM_ATRASO' ? [{
                                        header: 'Valores',
                                        accessor: (row: IEmissao) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-green-600 dark:text-green-400">
                                                    R$ {row.valor || 0}
                                                </span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    Custo: R$ {row.valorPostagem || 0}
                                                </small>
                                                <small className="font-medium text-blue-600 dark:text-blue-400">
                                                    Lucro: {calcularLucro(row.valor || 0, row.valorPostagem || 0)}
                                                </small>
                                            </div>
                                        ),
                                    }] : []),
                                    // Previsão Entrega - só na aba EM_ATRASO
                                    ...(tab === 'EM_ATRASO' ? [{
                                        header: 'Previsão Entrega',
                                        accessor: (row: IEmissao) => {
                                            const previsao = (row as any).dataPrevisaoEntrega;
                                            if (!previsao) return '-';
                                            try {
                                                const date = parseISO(previsao);
                                                return format(date, 'dd/MM/yyyy');
                                            } catch {
                                                return previsao;
                                            }
                                        },
                                    }] : []),
                                    // Dias em Atraso - só na aba EM_ATRASO
                                    ...(tab === 'EM_ATRASO' ? [{
                                        header: 'Dias em Atraso',
                                        accessor: (row: IEmissao) => {
                                            const previsao = (row as any).dataPrevisaoEntrega;
                                            if (!previsao) return '-';
                                            try {
                                                const previsaoDate = parseISO(previsao);
                                                const hoje = new Date();
                                                const diasAtraso = differenceInDays(hoje, previsaoDate);
                                                return (
                                                    <span className={`font-semibold ${diasAtraso > 7 ? 'text-red-600' : diasAtraso > 3 ? 'text-orange-600' : 'text-yellow-600'}`}>
                                                        {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'}
                                                    </span>
                                                );
                                            } catch {
                                                return '-';
                                            }
                                        },
                                    }] : []),
                                    // NF - oculta na aba EM_ATRASO
                                    ...(tab !== 'EM_ATRASO' ? [{
                                        header: 'NF',
                                        accessor: (row: IEmissao) => (
                                            <div className="flex flex-col gap-0.5">
                                                {row.numeroNotaFiscal && (
                                                    <span className="text-sm">{row.numeroNotaFiscal}</span>
                                                )}
                                                {row.valorNotaFiscal > 0 && (
                                                    <small className="text-slate-500 dark:text-slate-400">
                                                        R$ {row.valorNotaFiscal}
                                                    </small>
                                                )}
                                            </div>
                                        ),
                                    }] : []),
                                    {
                                        header: 'Status',
                                        accessor: (row) => (
                                            <StatusBadgeEmissao
                                                status={row.status}
                                                mensagensErrorPostagem={row.mensagensErrorPostagem}
                                                handleOnViewErroPostagem={handleOnViewErroPostagem}
                                            />
                                        ),
                                    },
                                    // Status Faturamento - oculta na aba EM_ATRASO
                                    ...(tab !== 'EM_ATRASO' ? [{
                                        header: 'Status Faturamento',
                                        accessor: (row: IEmissao) => (
                                            <StatusBadgeEmissao
                                                status={row.statusFaturamento}
                                                mensagensErrorPostagem={row.mensagensErrorPostagem}
                                                handleOnViewErroPostagem={handleOnViewErroPostagem}
                                            />
                                        ),
                                    }] : []),
                                    {
                                        header: 'Criado em',
                                        accessor: (row) => {
                                            return formatDateTime(row.criadoEm);
                                        },
                                    },
                                ]}
                                actionTitle={(row) => row.codigoObjeto || '---'}
                                actions={[
                                    {
                                        label: 'Detalhamento',
                                        icon: <ReceiptText size={16} />,
                                        to: (row) => `./detail/${row.id}`,
                                        show: true,
                                    },
                                    {
                                        label: 'Imprimir Etiqueta',
                                        icon: <Printer size={16} />,
                                        onClick: (row) => handleOnPDF(row, true),
                                        show: (row) => !row.mensagensErrorPostagem && !['ENTREGUE', 'EM_TRANSITO', 'POSTADO'].includes(row.status as string),
                                    },
                                    {
                                        label: 'Atualizar Preços',
                                        icon: <DollarSign size={16} />,
                                        onClick: (emissao) => setIsModalUpdatePrecos({ isOpen: true, emissao }),
                                        show: true,
                                    },
                                    {
                                        label: 'Reenviar Notificação',
                                        icon: <RotateCw size={16} />,
                                        onClick: (row) => handleReenviarNotificacaoRetirada(row),
                                        show: tab === 'AGUARDANDO_RETIRADA',
                                    },
                                ]}
                            />
                        </div>
                        <div className="py-3">
                            <PaginacaoCustom meta={emissoes?.meta} onPageChange={handlePageChange} />
                        </div>
                    </>
                )}
            </ResponsiveTabMenu>

            <ModalViewErroPostagem isOpen={isModalViewErroPostagem} jsonContent={erroPostagem || ''} onCancel={() => setIsModalViewErroPostagem(false)} />

            <ModalViewPDF isOpen={isModalViewPDF} base64={etiqueta?.dados || ''} onCancel={() => setIsModalViewPDF(false)} />
            <ModalAtualizarPrecos
                data={isModalUpdatePrecos?.emissao}
                isOpen={isModalUpdatePrecos?.isOpen}
                onClose={() => setIsModalUpdatePrecos({ isOpen: false, emissao: {} as IEmissao })}
            />
            <ModalGerarManifestoSaida
                isOpen={isModalManifesto}
                onClose={() => setIsModalManifesto(false)}
            />
        </Content>
    );
};

export default RltEnvios;
