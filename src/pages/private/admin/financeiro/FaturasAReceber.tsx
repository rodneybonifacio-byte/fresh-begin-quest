import { useEffect, useState } from 'react';
import { useGlobalConfig } from '../../../../providers/GlobalConfigContext';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { Content } from '../../Content';
import { LoadSpinner } from '../../../../components/loading';
import type { IFatura } from '../../../../types/IFatura';
import type { IResponse } from '../../../../types/IResponse';
import { useSearchParams } from 'react-router-dom';
import { PaginacaoCustom } from '../../../../components/PaginacaoCustom';
import { FaturaService } from '../../../../services/FaturaService';
import { ModalConfirmaPagamento } from './ModalConfirmaPagamento';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { toastSuccess } from '../../../../utils/toastNotify';
import { Tabs, TabsList } from '@radix-ui/react-tabs';
import { TabItem } from '../../../../components/TabItem';
import { ListaFaturas } from './ListaFaturas';
import { useMutation } from '@tanstack/react-query';
import { viewPDF } from '../../../../utils/pdfUtils';
import { useFaturasRealtime } from '../../../../hooks/useFaturasRealtime';
import { RealtimeStatusIndicator } from '../../../../components/RealtimeStatusIndicator';
import { showPagamentoToast } from '../../../../components/PagamentoRealtimeToast';
import { formatCurrencyWithCents } from '../../../../utils/formatCurrency';
import { ModalEmitirBoleto } from '../../../../components/ModalEmitirBoleto';

const FinanceiroFaturasAReceber = () => {
    const { setIsLoading } = useLoadingSpinner();
    const config = useGlobalConfig();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<IFatura[]>([]);
    const [tab, setTab] = useState('faturamentos');
    const [lastUpdate, setLastUpdate] = useState<Date>();

    const [isModalConfirmaPagamento, setIsModalConfirmaPagamento] = useState<{ isOpen: boolean; fatura: IFatura }>({ isOpen: false, fatura: {} as IFatura });
    const [isModalBoleto, setIsModalBoleto] = useState<{ isOpen: boolean; fatura: IFatura }>({ isOpen: false, fatura: {} as IFatura });
    const [page, setPage] = useState<number>(1);
    const perPage = config.pagination.perPage;

    const service = new FaturaService();

    // Monitoramento em tempo real de pagamentos
    useFaturasRealtime({
        enabled: tab === 'faturamentos', // Apenas quando está na aba de pendentes
        onStatusChange: (faturaId, novoStatus) => {
            console.log(`🔔 Status da fatura ${faturaId} alterado para: ${novoStatus}`);
            
            // Buscar a fatura atualizada nos dados atuais
            const faturaAtualizada = data.find(f => f.id === faturaId);
            
            if (faturaAtualizada && novoStatus === 'PAGO') {
                showPagamentoToast({
                    faturaId,
                    clienteNome: faturaAtualizada.cliente.nome,
                    valor: formatCurrencyWithCents(faturaAtualizada.totalFaturado),
                    onShow: () => {
                        setLastUpdate(new Date());
                    }
                });
            }
            
            setLastUpdate(new Date());
        }
    });

    const {
        data: faturas,
        isLoading,
        isError,
    } = useFetchQuery<IResponse<IFatura[]>>(['faturas', page, tab], async () => {
        const params: {
            limit: number;
            offset: number;
            dataIni?: string;
            dataFim?: string;
            destinatario?: string;
            statusFaturamento?: string;
            codigoObjeto?: string;
        } = {
            limit: perPage,
            offset: (page - 1) * perPage,
            statusFaturamento: tab === 'faturamentos' ? 'PENDENTE,PAGO_PARCIAL' : 'PAGO',
        };

        const dataIni = searchParams.get('dataIni') || undefined;
        const dataFim = searchParams.get('dataFim') || undefined;
        const statusFaturamento = searchParams.get('statusFaturamento') || undefined;

        if (dataIni) params.dataIni = dataIni;
        if (dataFim) params.dataFim = dataFim;
        if (statusFaturamento) params.statusFaturamento = statusFaturamento;

        return await service.getWithParams(params, 'admin');
    });

    useEffect(() => {
        if (faturas?.data) {
            setData(faturas.data);
        }
    }, [faturas]);

    const handlePageChange = async (pageNumber: number) => {
        setPage(pageNumber);
    };

    const notificaViaWhatsApp = async (fatura: IFatura, tipoNotificacao: 'PADRAO' | 'ATRASADA' = 'PADRAO') => {
        try {
            setIsLoading(true);
            await service.notificaViaWhatsApp(fatura.id, tipoNotificacao);
            toastSuccess('Notificação enviada com sucesso!');
        } finally {
            setIsLoading(false);
        }
    };

    const sendMutation = useMutation({
        mutationFn: async (fatura: IFatura) => {
            let faturaId = '';
            let id = fatura.id;

            if (fatura.faturaId) {
                faturaId = fatura.id;
                id = fatura.faturaId || '';
            }

            const result = await service.gerarFaturaPdf(id, faturaId || '');
            return result;
        },
        onSuccess: () => {},
    });

    const handleEnviarEImprimir = async (fatura: IFatura) => {
        console.log(fatura);

        try {
            setIsLoading(true);
            const result = await sendMutation.mutateAsync(fatura);
            if (result?.dados) {
                viewPDF(result?.dados, result.faturaId);
            }
        } catch (_error) {
        } finally {
            setIsLoading(false);
        }
    };

    const handleRealizarFechamento = async (fatura: IFatura) => {
        try {
            setIsLoading(true);
            
            const nomeCliente = fatura.nome ?? fatura.cliente.nome;
            const codigoFatura = fatura.codigo || '';

            // O telefone será buscado pelo MCP usando o código da fatura
            const result = await service.realizarFechamento(codigoFatura, nomeCliente, '');
            
            console.log('Resultado do fechamento:', result);
            toastSuccess('Fechamento realizado com sucesso! WhatsApp enviado.');
        } catch (error: any) {
            console.error('Erro ao realizar fechamento:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmitirBoleto = (fatura: IFatura) => {
        setIsModalBoleto({ isOpen: true, fatura });
    };

    return (
        <Content
            titulo="Faturas a Receber"
            subTitulo="Gerencie as faturas a receber dos seus clientes."
            data={faturas?.data && faturas.data.length > 0 ? faturas.data : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            
            <div className="flex items-center justify-between mb-4">
                <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col gap-4">
                    <TabsList className="flex gap-4 bg-white dark:bg-slate-800 w-full p-4 rounded-xl border border-input dark:border-slate-600">
                        <TabItem value="faturamentos" label="Pendentes" />
                        <TabItem value="finalizados" label="Finalizados" />
                    </TabsList>
                </Tabs>
                
                {tab === 'faturamentos' && (
                    <RealtimeStatusIndicator 
                        isConnected={true}
                        lastUpdate={lastUpdate}
                    />
                )}
            </div>
            {!isLoading && !isError && faturas && faturas.data.length > 0 && (
                <>
                    <ListaFaturas
                        data={data}
                        setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
                        notificaViaWhatsApp={notificaViaWhatsApp}
                        estaAtrasada={(fatura: IFatura) => {
                            const today = new Date();
                            return new Date(fatura.dataVencimento) < today && !fatura.dataPagamento;
                        }}
                        imprimirFaturaPdf={handleEnviarEImprimir}
                        realizarFechamento={handleRealizarFechamento}
                        emitirBoleto={handleEmitirBoleto}
                    />

                    <div className="py-3">
                        <PaginacaoCustom meta={faturas?.meta} onPageChange={handlePageChange} />
                    </div>
                    <ModalConfirmaPagamento
                        data={isModalConfirmaPagamento.fatura}
                        isOpen={isModalConfirmaPagamento.isOpen}
                        onClose={() => setIsModalConfirmaPagamento({ isOpen: false, fatura: {} as IFatura })}
                    />
                    {isModalBoleto.isOpen && (
                        <ModalEmitirBoleto
                            fatura={isModalBoleto.fatura}
                            onClose={() => setIsModalBoleto({ isOpen: false, fatura: {} as IFatura })}
                            onSuccess={() => {
                                toastSuccess('Boleto emitido com sucesso!');
                                setIsModalBoleto({ isOpen: false, fatura: {} as IFatura });
                            }}
                        />
                    )}
                </>
            )}
        </Content>
    );
};

export default FinanceiroFaturasAReceber;
