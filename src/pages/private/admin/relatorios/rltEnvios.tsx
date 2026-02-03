import { DollarSign, Filter, PackageCheck, Printer, ReceiptText, ShoppingCart, Users, Wallet, Download, Bell, RefreshCw, Map as MapIcon, RotateCw, Bug, X } from 'lucide-react';
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
    const [etiqueta] = useState<{ nome: string; dados: string }>();
    const [isModalUpdatePrecos, setIsModalUpdatePrecos] = useState<{ isOpen: boolean; emissao: IEmissao }>({ isOpen: false, emissao: {} as IEmissao });
    const [showMap, setShowMap] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
    const [isModalManifesto, setIsModalManifesto] = useState(false);
    const [isModalDebugPrecos, setIsModalDebugPrecos] = useState(false);
    const [debugData, setDebugData] = useState<{loading: boolean; data: any[]}>({ loading: false, data: [] });

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

    // Handler para debug de preços - verifica dados brutos
    const handleDebugPrecos = async () => {
        setIsModalDebugPrecos(true);
        setDebugData({ loading: true, data: [] });
        
        try {
            const dataIni = searchParams.get('dataIni') || undefined;
            const dataFim = searchParams.get('dataFim') || undefined;
            
            // Buscar dados sem paginação para análise
            const allData: IEmissao[] = [];
            let offset = 0;
            const batchSize = 100;
            let hasMore = true;
            
            while (hasMore && allData.length < 500) {
                const params: Record<string, string | number> = {
                    limit: batchSize,
                    offset: offset,
                };
                if (dataIni) params.dataIni = dataIni;
                if (dataFim) params.dataFim = dataFim;
                
                const response = await service.getAll(params, 'admin');
                const batch = response?.data || [];
                allData.push(...batch);
                
                if (batch.length < batchSize) {
                    hasMore = false;
                } else {
                    offset += batchSize;
                }
            }
            
            // Calcular totais para comparação
            const totaisCalculados = allData.reduce((acc, e) => {
                const venda = Number(e.valor) || 0;
                const custo = Number(e.valorPostagem) || 0;
                return {
                    totalVendas: acc.totalVendas + venda,
                    totalCusto: acc.totalCusto + custo,
                    countSemVenda: acc.countSemVenda + (venda === 0 ? 1 : 0),
                    countSemCusto: acc.countSemCusto + (custo === 0 ? 1 : 0),
                };
            }, { totalVendas: 0, totalCusto: 0, countSemVenda: 0, countSemCusto: 0 });
            
            console.log('🔍 DEBUG PREÇOS:', {
                dashboardAPI: {
                    totalVendas: dashboard?.totalVendas,
                    totalCusto: dashboard?.totalCusto,
                    lucro: Number(dashboard?.totalVendas) - Number(dashboard?.totalCusto),
                },
                calculadoLocal: {
                    ...totaisCalculados,
                    lucro: totaisCalculados.totalVendas - totaisCalculados.totalCusto,
                },
                totalRegistros: allData.length,
                amostra: allData.slice(0, 10).map(e => ({
                    codigo: e.codigoObjeto,
                    valor: e.valor,
                    valorPostagem: e.valorPostagem,
                    lucro: (Number(e.valor) || 0) - (Number(e.valorPostagem) || 0),
                })),
            });
            
            setDebugData({ loading: false, data: allData });
        } catch (error) {
            console.error('Erro no debug:', error);
            toast.error('Erro ao carregar dados de debug');
            setDebugData({ loading: false, data: [] });
        }
    };

    const handleExportToExcel = async () => {
        try {
            setIsLoading(true);
            toast.info('Iniciando exportação... Aguarde.');
            
            // Buscar filtros da URL
            const dataIni = searchParams.get('dataIni') || undefined;
            const dataFim = searchParams.get('dataFim') || undefined;
            const statusParam = searchParams.get('status');
            const status = statusParam && statusParam.length > 0 ? statusParam : undefined;
            const clienteId = searchParams.get('clienteId') || undefined;
            const remetenteId = searchParams.get('remetenteId') || undefined;
            const transportadora = searchParams.get('transportadora') || undefined;

            // Observação: a API está retornando 500 quando enviamos MUITOS status no mesmo parâmetro.
            // Para garantir a exportação completa, vamos:
            // 1) Quando houver múltiplos status (separados por vírgula), buscar um por vez e concatenar.
            // 2) Se a API falhar com lote 50, reduzir automaticamente (30 -> 20 -> 10).

            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

            const statusesToFetch = (status
                ? status.split(',').map((s) => s.trim()).filter(Boolean)
                : []);

            // Fallback: se não veio status em query, usa a aba selecionada.
            if (statusesToFetch.length === 0 && tab) {
                statusesToFetch.push(tab);
            }

            const buildParams = (opts: { limit: number; offset: number; singleStatus?: string }) => {
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
                    limit: opts.limit,
                    offset: opts.offset,
                };

                if (dataIni) params.dataIni = dataIni;
                if (dataFim) params.dataFim = dataFim;
                if (opts.singleStatus) params.status = opts.singleStatus;
                if (clienteId) params.clienteId = clienteId;
                if (remetenteId) params.remetenteId = remetenteId;
                if (transportadora) params.transportadora = transportadora;

                return params;
            };

            const fetchAllPagedForStatus = async (singleStatus?: string): Promise<IEmissao[]> => {
                let batchSize = 50;
                let offset = 0;
                let hasMore = true;
                let batchCount = 0;
                const result: IEmissao[] = [];

                const statusLabel = singleStatus ? `(${singleStatus})` : '';

                while (hasMore) {
                    const params = buildParams({ limit: batchSize, offset, singleStatus });

                    try {
                        const response = await service.getAll(params, 'admin');
                        const batch = response?.data || [];

                        if (batch.length === 0) break;

                        result.push(...batch);
                        offset += batchSize;
                        batchCount++;

                        if (batchCount % 3 === 0) {
                            toast.info(`Carregando ${statusLabel}... ${result.length} registros`);
                        }

                        if (batch.length < batchSize) {
                            hasMore = false;
                        }

                        await sleep(250);
                    } catch (err) {
                        console.error(`Erro no lote ${batchCount + 1} ${statusLabel}:`, err);

                        // Tenta reduzir o lote antes de desistir
                        if (batchSize > 10) {
                            batchSize = batchSize === 50 ? 30 : batchSize === 30 ? 20 : 10;
                            toast.warning(`API instável ${statusLabel}. Reduzindo lote para ${batchSize} e tentando novamente...`);
                            await sleep(800);
                            continue;
                        }

                        throw err;
                    }
                }

                return result;
            };

            const allData: IEmissao[] = [];
            const errors: string[] = [];

            if (statusesToFetch.length > 1) {
                toast.info(`Exportando por status (${statusesToFetch.length})...`);
            }

            for (const st of statusesToFetch) {
                try {
                    const partial = await fetchAllPagedForStatus(st);
                    allData.push(...partial);
                    await sleep(400);
                } catch (e) {
                    errors.push(st);
                }
            }

            // Remover duplicados (quando status podem se sobrepor no backend)
            const dedup = new Map<string, IEmissao>();
            for (const emissao of allData) {
                const key = String((emissao as any)?.id ?? emissao.codigoObjeto ?? JSON.stringify(emissao));
                if (!dedup.has(key)) dedup.set(key, emissao);
            }

            const finalData = Array.from(dedup.values());

            if (finalData.length > 0) {
                exportEmissoesToExcel(finalData, `relatorio-envios-${dataIni || 'todos'}-${dataFim || 'todos'}`);
                if (errors.length > 0) {
                    toast.warning(`Exportação concluída com avisos: falhou em ${errors.length} status (${errors.join(', ')})`);
                } else {
                    toast.success(`Exportação concluída: ${finalData.length} registros`);
                }
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

    const { onEmissaoVisualizarPDF } = useImprimirEtiquetaPDF();
    const handleOnPDF = async (emissao: IEmissao, mergePdf: boolean = false) => {
        try {
            const tipo = mergePdf ? 'merge' : 'etiqueta';
            await onEmissaoVisualizarPDF(emissao, tipo, setIsLoading);
        } catch (error) {
            console.error('Erro ao imprimir:', error);
            toast.error('Erro ao gerar PDF para impressão');
        }
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
                    label: 'Debug Preços',
                    onClick: handleDebugPrecos,
                    icon: <Bug size={22} />,
                    bgColor: 'bg-yellow-600',
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
            
            {/* Indicador de Filtros Ativos - Compacto no mobile */}
            {(searchParams.get('dataIni') || searchParams.get('dataFim') || searchParams.get('status') || 
              searchParams.get('clienteId') || searchParams.get('remetenteId') || searchParams.get('transportadora')) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-4 mb-2 sm:mb-4">
                    <div className="flex items-start gap-2">
                        <Filter className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100 mb-1 sm:mb-2">
                                Filtros Ativos
                            </p>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                                {searchParams.get('dataIni') && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                        {searchParams.get('dataIni')} - {searchParams.get('dataFim')}
                                    </span>
                                )}
                                {searchParams.get('status') && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                                        {searchParams.get('status')}
                                    </span>
                                )}
                                {searchParams.get('transportadora') && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                                        {searchParams.get('transportadora')}
                                    </span>
                                )}
                                {searchParams.get('clienteId') && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200">
                                        Cliente
                                    </span>
                                )}
                                {searchParams.get('remetenteId') && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-pink-100 dark:bg-pink-800 text-pink-800 dark:text-pink-200">
                                        Remetente
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <>
                {isFilterOpen && <FiltroEmissao onCancel={handlerToggleFilter} isDestinatario />}
                
                {/* KPIs - Layout compacto para mobile */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4">
                    {/* Total de Envios */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-500 dark:text-slate-400 text-[10px] sm:text-xs truncate">Total Envios</p>
                                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white mt-0.5">{dashboard?.totalEnvios ?? '-'}</p>
                            </div>
                            <div className="bg-purple-100 dark:bg-purple-900 p-2 sm:p-3 rounded-lg flex-shrink-0">
                                <PackageCheck className="text-purple-600 dark:text-purple-400 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                    </div>
                    {/* Total de Vendas */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-500 dark:text-slate-400 text-[10px] sm:text-xs truncate">Vendas</p>
                                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white mt-0.5 truncate">{formatMoedaDecimal(dashboard?.totalVendas || 0)}</p>
                            </div>
                            <div className="bg-orange-100 dark:bg-orange-900 p-2 sm:p-3 rounded-lg flex-shrink-0">
                                <ShoppingCart className="text-orange-600 dark:text-orange-400 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                    </div>
                    {/* Custo Total */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-500 dark:text-slate-400 text-[10px] sm:text-xs truncate">Custo</p>
                                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white mt-0.5 truncate">{formatMoedaDecimal(dashboard?.totalCusto || 0)}</p>
                            </div>
                            <div className="bg-red-100 dark:bg-red-900 p-2 sm:p-3 rounded-lg flex-shrink-0">
                                <Wallet className="text-red-600 dark:text-red-400 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                    </div>
                    {/* Lucro Total */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-600">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-500 dark:text-slate-400 text-[10px] sm:text-xs truncate">Lucro</p>
                                <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400 mt-0.5 truncate">
                                    {calcularLucro(Number(dashboard?.totalVendas), Number(dashboard?.totalCusto))}
                                </p>
                            </div>
                            <div className="bg-green-100 dark:bg-green-900 p-2 sm:p-3 rounded-lg flex-shrink-0">
                                <DollarSign className="text-green-600 dark:text-green-400 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                    </div>
                    {/* Total de Clientes */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-600 col-span-2 md:col-span-1">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-500 dark:text-slate-400 text-[10px] sm:text-xs truncate">Clientes</p>
                                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white mt-0.5">{dashboard?.totalClientes ?? '-'}</p>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 sm:p-3 rounded-lg flex-shrink-0">
                                <Users className="text-blue-600 dark:text-blue-400 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </>

            {/* Mapa de Rastreamento - Carrega SOB DEMANDA para economizar recursos */}
            <div className="mb-4 sm:mb-6">
                {!showMap ? (
                    <button
                        onClick={() => setShowMap(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 transition-colors"
                    >
                        <MapIcon className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Abrir Mapa de Rastreamento
                        </span>
                    </button>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <MapIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                Mapa de Rastreamento
                            </h3>
                            <button
                                onClick={() => setShowMap(false)}
                                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                Fechar Mapa
                            </button>
                        </div>
                        {allEmissoesForMap && allEmissoesForMap.length > 0 && (
                            <ShipmentTrackingMap 
                                emissoes={allEmissoesForMap.filter(e => 
                                    ['EM_TRANSITO', 'POSTADO', 'SAIU_PARA_ENTREGA', 'EM_ATRASO', 'AGUARDANDO_RETIRADA'].includes(e.status || '')
                                )} 
                                enableAutoRefresh={false}
                                isAdmin={true}
                            />
                        )}
                    </>
                )}
            </div>

            <ResponsiveTabMenu tab={tab} setTab={setTab}>
                {!isLoading && !isError && emissoes && emissoes.data.length > 0 && (
                    <>
                        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-2 sm:p-6 shadow-sm overflow-visible">
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
            
            {/* Modal Debug Preços */}
            {isModalDebugPrecos && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Bug className="text-yellow-600" size={20} />
                                Debug de Preços (Venda vs Custo)
                            </h2>
                            <button
                                onClick={() => setIsModalDebugPrecos(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-auto flex-1">
                            {debugData.loading ? (
                                <div className="text-center py-8">
                                    <LoadSpinner mensagem="Carregando dados para análise..." />
                                </div>
                            ) : (
                                <>
                                    {/* Resumo comparativo */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                                            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Dashboard API</h3>
                                            <div className="space-y-1 text-sm">
                                                <p>Vendas: <span className="font-bold">{formatMoedaDecimal(dashboard?.totalVendas || 0)}</span></p>
                                                <p>Custo: <span className="font-bold">{formatMoedaDecimal(dashboard?.totalCusto || 0)}</span></p>
                                                <p className="text-green-600 dark:text-green-400">Lucro: <span className="font-bold">{calcularLucro(Number(dashboard?.totalVendas), Number(dashboard?.totalCusto))}</span></p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                                            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">Calculado Local ({debugData.data.length} registros)</h3>
                                            {(() => {
                                                const totais = debugData.data.reduce((acc, e) => ({
                                                    vendas: acc.vendas + (Number(e.valor) || 0),
                                                    custo: acc.custo + (Number(e.valorPostagem) || 0),
                                                    semVenda: acc.semVenda + (Number(e.valor) === 0 ? 1 : 0),
                                                    semCusto: acc.semCusto + (Number(e.valorPostagem) === 0 ? 1 : 0),
                                                }), { vendas: 0, custo: 0, semVenda: 0, semCusto: 0 });
                                                return (
                                                    <div className="space-y-1 text-sm">
                                                        <p>Vendas: <span className="font-bold">{formatMoedaDecimal(totais.vendas)}</span></p>
                                                        <p>Custo: <span className="font-bold">{formatMoedaDecimal(totais.custo)}</span></p>
                                                        <p className="text-green-600 dark:text-green-400">Lucro: <span className="font-bold">{calcularLucro(totais.vendas, totais.custo)}</span></p>
                                                        <hr className="my-2 border-purple-200 dark:border-purple-700" />
                                                        <p className="text-orange-600">Sem valor venda: <span className="font-bold">{totais.semVenda}</span></p>
                                                        <p className="text-red-600">Sem valor custo: <span className="font-bold">{totais.semCusto}</span></p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    
                                    {/* Tabela de etiquetas */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 dark:bg-slate-700">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Código</th>
                                                    <th className="px-3 py-2 text-left">Cliente</th>
                                                    <th className="px-3 py-2 text-right">Venda (valor)</th>
                                                    <th className="px-3 py-2 text-right">Custo (valorPostagem)</th>
                                                    <th className="px-3 py-2 text-right">Lucro</th>
                                                    <th className="px-3 py-2 text-left">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                                {debugData.data.slice(0, 100).map((e, idx) => {
                                                    const venda = Number(e.valor) || 0;
                                                    const custo = Number(e.valorPostagem) || 0;
                                                    const lucro = venda - custo;
                                                    const isProblema = venda === 0 || custo === 0 || lucro < 0;
                                                    return (
                                                        <tr key={e.id || idx} className={isProblema ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                                                            <td className="px-3 py-2 font-mono text-xs">{e.codigoObjeto || '-'}</td>
                                                            <td className="px-3 py-2 truncate max-w-[150px]">{e.cliente?.nome || '-'}</td>
                                                            <td className={`px-3 py-2 text-right ${venda === 0 ? 'text-red-600 font-bold' : ''}`}>
                                                                R$ {venda.toFixed(2)}
                                                            </td>
                                                            <td className={`px-3 py-2 text-right ${custo === 0 ? 'text-orange-600 font-bold' : ''}`}>
                                                                R$ {custo.toFixed(2)}
                                                            </td>
                                                            <td className={`px-3 py-2 text-right font-semibold ${lucro < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                R$ {lucro.toFixed(2)}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <span className="text-xs">{e.status}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {debugData.data.length > 100 && (
                                            <div className="bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm text-gray-500">
                                                Mostrando 100 de {debugData.data.length} registros. Veja console para dados completos.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Content>
    );
};

export default RltEnvios;
