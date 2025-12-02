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
import { useFaturasRealtime } from '../../../../hooks/useFaturasRealtime';
import { RealtimeStatusIndicator } from '../../../../components/RealtimeStatusIndicator';
import { showPagamentoToast } from '../../../../components/PagamentoRealtimeToast';
import { formatCurrencyWithCents } from '../../../../utils/formatCurrency';
import { ModalEmitirBoleto } from '../../../../components/ModalEmitirBoleto';
import { ModalVisualizarFechamento } from '../../../../components/ModalVisualizarFechamento';
import { toast } from 'sonner';
import { BoletoService } from '../../../../services/BoletoService';

const FinanceiroFaturasAReceber = () => {
    const { setIsLoading } = useLoadingSpinner();
    const config = useGlobalConfig();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<IFatura[]>([]);
    const [tab, setTab] = useState('faturamentos');
    const [lastUpdate, setLastUpdate] = useState<Date>();

    const [isModalConfirmaPagamento, setIsModalConfirmaPagamento] = useState<{ isOpen: boolean; fatura: IFatura }>({ isOpen: false, fatura: {} as IFatura });
    const [isModalBoleto, setIsModalBoleto] = useState<{ isOpen: boolean; fatura: IFatura }>({ isOpen: false, fatura: {} as IFatura });
    const [isModalFechamento, setIsModalFechamento] = useState<{ 
        isOpen: boolean; 
        faturaPdf?: string; 
        boletoPdf?: string | null; 
        codigoFatura?: string;
        nomeCliente?: string;
        boletoInfo?: any;
    }>({ 
        isOpen: false, 
        faturaPdf: '', 
        boletoPdf: null, 
        codigoFatura: '' 
    });
    const [debugInfo, setDebugInfo] = useState<{
        httpCode?: number;
        mensagem?: string;
        payload?: any;
        response?: any;
        timestamp?: Date;
    } | null>(null);
    const [page, setPage] = useState<number>(1);
    const [forceUpdate, setForceUpdate] = useState<number>(0);
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

    const handleCancelarBoleto = async (fatura: IFatura) => {
        const fechamento = verificarFechamentoExistente(fatura.id);
        
        if (!fechamento?.boletoInfo?.nossoNumero) {
            toast.error('Boleto não encontrado para esta fatura');
            return;
        }

        const confirmar = window.confirm(
            `Tem certeza que deseja cancelar o boleto da fatura ${fatura.codigo}?\n\nEsta ação não pode ser desfeita.`
        );

        if (!confirmar) return;

        try {
            setIsLoading(true);
            const boletoService = new BoletoService();
            await boletoService.cancelar(fechamento.boletoInfo.nossoNumero, 'OUTROS');
            
            // Remover dados do fechamento do localStorage
            localStorage.removeItem(`fechamento_${fatura.id}`);
            
            toast.success('Boleto cancelado com sucesso!');
            
            // Recarregar dados
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao cancelar boleto');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRealizarFechamento = async (fatura: IFatura) => {
        const nomeCliente = fatura.nome ?? fatura.cliente.nome;
        const codigoFatura = fatura.codigo || '';
        const telefoneCliente = '11999999999';
        const faturaId = fatura.id;
        
        // Identificar se é subfatura
        const ehSubfatura = !!fatura.faturaId;
        const faturaPaiId = ehSubfatura ? fatura.faturaId : undefined;
        const subfaturaId = ehSubfatura ? fatura.id : undefined;
        
        // Para subfaturas, enviar o cpfCnpj do remetente/subcliente
        const cpfCnpjSubcliente = ehSubfatura ? fatura.cpfCnpj : undefined;
        
        const payload = {
            fatura_id: ehSubfatura ? fatura.faturaId : faturaId,
            codigo_fatura: codigoFatura,
            nome_cliente: nomeCliente,
            telefone_cliente: telefoneCliente,
            fatura_pai_id: faturaPaiId,
            subfatura_id: subfaturaId,
            cpf_cnpj_subcliente: cpfCnpjSubcliente
        };

        try {
            setIsLoading(true);
            
            // Registrar início da chamada
            setDebugInfo({
                httpCode: undefined,
                mensagem: 'Iniciando fechamento...',
                payload: payload,
                response: null,
                timestamp: new Date()
            });

            const result = await service.realizarFechamento(
                ehSubfatura ? fatura.faturaId! : faturaId, 
                codigoFatura, 
                nomeCliente, 
                telefoneCliente,
                faturaPaiId,
                subfaturaId,
                cpfCnpjSubcliente
            );
            
            // Registrar sucesso
            setDebugInfo({
                httpCode: 200,
                mensagem: 'Fechamento realizado com sucesso',
                payload: payload,
                response: result,
                timestamp: new Date()
            });
            
            toast.success('Fechamento realizado com sucesso!');
            
            // Salvar dados do fechamento no localStorage
            const fechamentoData = {
                faturaPdf: result.fatura_pdf,
                boletoPdf: result.boleto_pdf,
                codigoFatura: codigoFatura,
                nomeCliente: nomeCliente,
                boletoInfo: result.boleto_info,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(`fechamento_${faturaId}`, JSON.stringify(fechamentoData));
            
            // Abrir modal com os PDFs separados
            setIsModalFechamento({
                isOpen: true,
                faturaPdf: result.fatura_pdf,
                boletoPdf: result.boleto_pdf,
                codigoFatura: codigoFatura,
                nomeCliente: nomeCliente,
                boletoInfo: result.boleto_info
            });
            
            // Forçar re-renderização da lista para mostrar o botão "Visualizar Boleto"
            setForceUpdate(prev => prev + 1);
        } catch (error: any) {
            console.error('Erro ao realizar fechamento:', error);
            
            // Registrar erro detalhado
            setDebugInfo({
                httpCode: error?.status || error?.code || 500,
                mensagem: error?.message || 'Erro desconhecido',
                payload: payload,
                response: error,
                timestamp: new Date()
            });
            
            toast.error(error?.message || 'Erro ao realizar fechamento');
        } finally {
            setIsLoading(false);
        }
    };

    const verificarFechamentoExistente = (faturaId: string) => {
        const fechamento = localStorage.getItem(`fechamento_${faturaId}`);
        return fechamento ? JSON.parse(fechamento) : null;
    };

    const handleVisualizarFechamento = (fatura: IFatura) => {
        const fechamentoData = verificarFechamentoExistente(fatura.id);
        if (fechamentoData) {
            setIsModalFechamento({
                isOpen: true,
                faturaPdf: fechamentoData.faturaPdf,
                boletoPdf: fechamentoData.boletoPdf,
                codigoFatura: fechamentoData.codigoFatura,
                nomeCliente: fechamentoData.nomeCliente,
                boletoInfo: fechamentoData.boletoInfo
            });
        }
    };

    return (
        <Content
            titulo="Faturas a Receber"
            subTitulo="Gerencie as faturas a receber dos seus clientes."
            data={faturas?.data && faturas.data.length > 0 ? faturas.data : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            
            {/* Painel de Debug - Oculto em mobile */}
            {debugInfo && (
                <div className="mb-4 p-3 sm:p-4 rounded-lg border-2 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            🔍 Debug
                        </h3>
                        <button
                            onClick={() => setDebugInfo(null)}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600 dark:text-slate-400">HTTP:</span>
                                <span className={`font-mono px-2 py-1 rounded text-xs ${
                                    debugInfo.httpCode === 200 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : debugInfo.httpCode === 401
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                }`}>
                                    {debugInfo.httpCode || 'N/A'}
                                </span>
                            </div>
                            
                            <div>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">Mensagem:</span>
                                <p className="text-slate-900 dark:text-slate-100 mt-1 break-words">{debugInfo.mensagem}</p>
                            </div>
                            
                            <div>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">Timestamp:</span>
                                <p className="text-slate-900 dark:text-slate-100 mt-1 text-xs">
                                    {debugInfo.timestamp?.toLocaleString('pt-BR')}
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">Payload:</span>
                                <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1 overflow-x-auto max-h-32">
                                    {JSON.stringify(debugInfo.payload, null, 2)}
                                </pre>
                            </div>
                            
                            {debugInfo.response && (
                                <div>
                                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                                        {debugInfo.httpCode === 200 ? 'Resposta:' : 'Erro:'}
                                    </span>
                                    <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1 overflow-x-auto max-h-32">
                                        {JSON.stringify(debugInfo.response, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col gap-4">
                    <TabsList className="flex gap-2 bg-white dark:bg-slate-800 w-full p-2 rounded-xl border border-input dark:border-slate-600">
                        <TabItem value="faturamentos" label="Pendentes" />
                        <TabItem value="finalizados" label="Finalizados" />
                    </TabsList>
                </Tabs>
                
                {tab === 'faturamentos' && (
                    <div className="flex justify-center sm:justify-end">
                        <RealtimeStatusIndicator 
                            isConnected={true}
                            lastUpdate={lastUpdate}
                        />
                    </div>
                )}
            </div>
            {!isLoading && !isError && faturas && faturas.data.length > 0 && (
                <>
                    <ListaFaturas
                        key={forceUpdate}
                        data={data}
                        setIsModalConfirmaPagamento={setIsModalConfirmaPagamento}
                        realizarFechamento={handleRealizarFechamento}
                        verificarFechamentoExistente={verificarFechamentoExistente}
                        visualizarFechamento={handleVisualizarFechamento}
                        cancelarBoleto={handleCancelarBoleto}
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
                    
                    <ModalVisualizarFechamento
                        isOpen={isModalFechamento.isOpen}
                        onClose={() => setIsModalFechamento({ isOpen: false })}
                        faturaPdf={isModalFechamento.faturaPdf || ''}
                        boletoPdf={isModalFechamento.boletoPdf}
                        codigoFatura={isModalFechamento.codigoFatura || ''}
                        nomeCliente={isModalFechamento.nomeCliente}
                        boletoInfo={isModalFechamento.boletoInfo}
                    />
                </>
            )}
        </Content>
    );
};

export default FinanceiroFaturasAReceber;
