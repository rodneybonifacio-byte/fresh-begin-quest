import { useEffect, useState, useCallback } from 'react';
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
import { getSupabaseWithAuth } from '../../../../integrations/supabase/custom-auth';
import { RefreshCw } from 'lucide-react';

const FinanceiroFaturasAReceber = () => {
    const { setIsLoading } = useLoadingSpinner();
    const config = useGlobalConfig();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<IFatura[]>([]);
    const [tab, setTab] = useState('faturamentos');
    const [lastUpdate, setLastUpdate] = useState<Date>();
    
    // Estado para armazenar fechamentos carregados do Supabase (para verificação síncrona)
    const [fechamentosMap, setFechamentosMap] = useState<Record<string, any>>({});

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
            
            // Remover dados do fechamento do localStorage e do estado
            localStorage.removeItem(`fechamento_${fatura.id}`);
            setFechamentosMap(prev => {
                const novo = { ...prev };
                delete novo[fatura.id];
                return novo;
            });
            
            // Remover também do Supabase (por fatura_id ou subfatura_id) usando cliente autenticado
            const supabaseAuth = getSupabaseWithAuth();
            await supabaseAuth
                .from('fechamentos_fatura')
                .delete()
                .or(`fatura_id.eq.${fatura.id},subfatura_id.eq.${fatura.id}`);
            
            toast.success('Boleto cancelado com sucesso!');
            
            // Recarregar dados
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao cancelar boleto');
        } finally {
            setIsLoading(false);
        }
    };

    // FUNÇÃO DE TESTE - Gera apenas o PDF sem boleto
    const handleTestarPDF = async (fatura: IFatura) => {
        const nomeCliente = fatura.nome ?? fatura.cliente.nome;
        const codigoFatura = fatura.codigo || '';
        const faturaId = fatura.id;
        
        // Identificar se é subfatura
        const ehSubfatura = !!fatura.faturaId;
        const cpfCnpjSubcliente = ehSubfatura ? fatura.cpfCnpj : undefined;
        const valorSubfatura = ehSubfatura ? fatura.totalFaturado : undefined;
        
        const payload = {
            fatura_id: ehSubfatura ? fatura.faturaId : faturaId,
            codigo_fatura: codigoFatura,
            nome_cliente: nomeCliente,
            telefone_cliente: '11999999999',
            fatura_pai_id: ehSubfatura ? fatura.faturaId : undefined,
            subfatura_id: ehSubfatura ? fatura.id : undefined,
            cpf_cnpj_subcliente: cpfCnpjSubcliente,
            valor_subfatura: valorSubfatura,
            apenas_pdf: true // Flag para apenas gerar PDF
        };

        try {
            setIsLoading(true);
            toast.info('Gerando PDF de teste...');
            
            // Usar cliente com token JWT do usuário
            const supabaseAuth = getSupabaseWithAuth();
            const { data, error } = await supabaseAuth.functions.invoke('processar-fechamento-fatura', {
                body: payload
            });
            
            if (error) throw error;
            
            console.log('📄 Resultado PDF teste:', data);
            
            if (data?.fatura_pdf) {
                // Abrir modal apenas com o PDF da fatura
                setIsModalFechamento({
                    isOpen: true,
                    faturaPdf: data.fatura_pdf,
                    boletoPdf: null,
                    codigoFatura: codigoFatura,
                    nomeCliente: nomeCliente,
                    boletoInfo: undefined
                });
                toast.success('PDF gerado com sucesso!');
            } else {
                toast.error('PDF não foi gerado');
            }
        } catch (error: any) {
            console.error('Erro ao gerar PDF teste:', error);
            toast.error(error?.message || 'Erro ao gerar PDF');
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
        
        // Para subfaturas, usar o totalFaturado da própria subfatura
        const valorSubfatura = ehSubfatura ? fatura.totalFaturado : undefined;
        
        const payload = {
            fatura_id: ehSubfatura ? fatura.faturaId : faturaId,
            codigo_fatura: codigoFatura,
            nome_cliente: nomeCliente,
            telefone_cliente: telefoneCliente,
            fatura_pai_id: faturaPaiId,
            subfatura_id: subfaturaId,
            cpf_cnpj_subcliente: cpfCnpjSubcliente,
            valor_subfatura: valorSubfatura // Valor específico da subfatura
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
                cpfCnpjSubcliente,
                valorSubfatura
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
            
            // Salvar dados do fechamento no localStorage e no estado
            const fechamentoData = {
                faturaPdf: result.fatura_pdf,
                boletoPdf: result.boleto_pdf,
                codigoFatura: codigoFatura,
                nomeCliente: nomeCliente,
                boletoInfo: result.boleto_info,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(`fechamento_${faturaId}`, JSON.stringify(fechamentoData));
            
            // SALVAR NO SUPABASE para persistir entre sessões
            try {
                const supabaseAuth = getSupabaseWithAuth();
                const faturaIdParaSalvar = ehSubfatura ? (fatura.faturaId || faturaId) : faturaId;
                
                // Verificar se já existe
                const { data: existente } = await supabaseAuth
                    .from('fechamentos_fatura')
                    .select('id')
                    .eq('fatura_id', faturaIdParaSalvar)
                    .eq('subfatura_id', subfaturaId || '')
                    .maybeSingle();
                
                if (existente) {
                    // Atualizar com os PDFs
                    await supabaseAuth
                        .from('fechamentos_fatura')
                        .update({
                            fatura_pdf: result.fatura_pdf,
                            boleto_pdf: result.boleto_pdf,
                            boleto_id: result.boleto_info?.nossoNumero || null,
                        })
                        .eq('id', existente.id);
                    console.log('✅ Fechamento atualizado no Supabase');
                } else {
                    // Inserir novo
                    await supabaseAuth
                        .from('fechamentos_fatura')
                        .insert([{
                            fatura_id: faturaIdParaSalvar,
                            subfatura_id: subfaturaId || null,
                            codigo_fatura: codigoFatura,
                            nome_cliente: nomeCliente,
                            cpf_cnpj: fatura.cpfCnpj || fatura.cliente?.cpfCnpj || null,
                            fatura_pdf: result.fatura_pdf,
                            boleto_pdf: result.boleto_pdf,
                            boleto_id: result.boleto_info?.nossoNumero || null,
                        }]);
                    console.log('✅ Fechamento salvo no Supabase');
                }
            } catch (dbError) {
                console.error('⚠️ Erro ao salvar no Supabase (continuando):', dbError);
            }
            
            // Atualizar estado em memória para refletir imediatamente na UI
            setFechamentosMap(prev => ({ ...prev, [faturaId]: fechamentoData }));
            
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

    // Função síncrona para verificação rápida na UI (usa estado em memória)
    const verificarFechamentoExistente = (faturaId: string) => {
        // Primeiro verificar no estado em memória
        if (fechamentosMap[faturaId]) {
            return fechamentosMap[faturaId];
        }
        // Fallback para localStorage
        const localFechamento = localStorage.getItem(`fechamento_${faturaId}`);
        return localFechamento ? JSON.parse(localFechamento) : null;
    };

    // Estado para controlar carregamento de fechamentos
    const [carregandoFechamentos, setCarregandoFechamentos] = useState(false);
    const [registrandoFechamentos, setRegistrandoFechamentos] = useState(false);

    // Função para registrar fechamentos em massa (para fechamentos feitos em produção)
    const registrarFechamentosEmMassa = useCallback(async () => {
        if (!data || data.length === 0) return;
        
        const confirmar = window.confirm(
            'Isso irá registrar TODAS as subfaturas como já fechadas (boleto gerado).\n\nUse apenas se os boletos foram gerados em produção.\n\nContinuar?'
        );
        
        if (!confirmar) return;
        
        try {
            setRegistrandoFechamentos(true);
            const supabaseAuth = getSupabaseWithAuth();
            let registrados = 0;
            let erros = 0;
            
            for (const fatura of data) {
                // Registrar subfaturas
                if (fatura.faturas && fatura.faturas.length > 0) {
                    for (const sub of fatura.faturas) {
                        try {
                            const { error } = await supabaseAuth.functions.invoke('registrar-fechamento', {
                                body: {
                                    fatura_id: fatura.id,
                                    subfatura_id: sub.id,
                                    codigo_fatura: fatura.codigo || sub.codigo,
                                    nome_cliente: sub.nome ?? sub.cliente?.nome ?? 'Cliente',
                                    cpf_cnpj: sub.cpfCnpj ?? sub.cliente?.cpfCnpj,
                                }
                            });
                            
                            if (error) {
                                console.error('Erro ao registrar:', sub.id, error);
                                erros++;
                            } else {
                                registrados++;
                            }
                        } catch (e) {
                            console.error('Erro:', e);
                            erros++;
                        }
                    }
                }
            }
            
            toast.success(`${registrados} fechamento(s) registrado(s)${erros > 0 ? `, ${erros} erro(s)` : ''}`);
            
            // Recarregar fechamentos
            await carregarFechamentos();
            setForceUpdate(prev => prev + 1);
            
        } catch (err) {
            console.error('Erro:', err);
            toast.error('Erro ao registrar fechamentos');
        } finally {
            setRegistrandoFechamentos(false);
        }
    }, [data]);

    // Função para carregar fechamentos via edge function
    const carregarFechamentos = useCallback(async () => {
        if (!data || data.length === 0) return;
        
        // Coletar todos os IDs de faturas e subfaturas
        const faturaIds: string[] = [];
        data.forEach(fatura => {
            faturaIds.push(fatura.id);
            if (fatura.faturas && fatura.faturas.length > 0) {
                fatura.faturas.forEach(sub => {
                    faturaIds.push(sub.id);
                });
            }
        });
        
        if (faturaIds.length === 0) return;
        
        try {
            setCarregandoFechamentos(true);
            console.log('🔍 Buscando fechamentos para IDs:', faturaIds);
            
            // Usar edge function com service role para acessar tabela com RLS restritivo
            const supabaseAuth = getSupabaseWithAuth();
            const { data: result, error } = await supabaseAuth.functions.invoke('buscar-fechamentos', {
                body: { faturaIds }
            });
            
            if (error) {
                console.error('❌ Erro ao buscar fechamentos:', error);
                return;
            }
            
            const fechamentos = result?.fechamentos || [];
            console.log('✅ Fechamentos encontrados:', fechamentos.length, fechamentos);
            
            if (fechamentos.length > 0) {
                const novoMap: Record<string, any> = {};
                
                fechamentos.forEach((f: any) => {
                    const fechamentoData = {
                        faturaPdf: f.fatura_pdf,
                        boletoPdf: f.boleto_pdf,
                        codigoFatura: f.codigo_fatura,
                        nomeCliente: f.nome_cliente,
                        boletoInfo: { nossoNumero: f.boleto_id },
                        timestamp: f.created_at
                    };
                    // Para subfaturas, usar o subfatura_id como chave
                    const keyId = f.subfatura_id || f.fatura_id;
                    novoMap[keyId] = fechamentoData;
                    // Também salvar no localStorage como backup
                    localStorage.setItem(`fechamento_${keyId}`, JSON.stringify(fechamentoData));
                    console.log(`📋 Fechamento mapeado para ID: ${keyId}`);
                });
                
                setFechamentosMap(prev => ({ ...prev, ...novoMap }));
                toast.success(`${fechamentos.length} fechamento(s) carregado(s)`);
            } else {
                toast.info('Nenhum fechamento encontrado');
            }
        } catch (err) {
            console.error('❌ Erro ao carregar fechamentos:', err);
            toast.error('Erro ao carregar fechamentos');
        } finally {
            setCarregandoFechamentos(false);
        }
    }, [data]);

    // Carregar fechamentos existentes quando a lista de faturas muda
    useEffect(() => {
        carregarFechamentos();
    }, [data]);

    const handleVisualizarFechamento = async (fatura: IFatura) => {
        const fechamentoData = verificarFechamentoExistente(fatura.id);
        if (fechamentoData) {
            // Se tem PDFs válidos, mostrar direto
            if (fechamentoData.faturaPdf && fechamentoData.boletoPdf) {
                setIsModalFechamento({
                    isOpen: true,
                    faturaPdf: fechamentoData.faturaPdf,
                    boletoPdf: fechamentoData.boletoPdf,
                    codigoFatura: fechamentoData.codigoFatura,
                    nomeCliente: fechamentoData.nomeCliente,
                    boletoInfo: fechamentoData.boletoInfo
                });
                return;
            }
            
            // Se não tem PDFs, buscar do Banco Inter usando CPF/CNPJ do cliente
            const codigoFatura = fechamentoData.codigoFatura || fatura.codigo;
            const cpfCnpj = fatura.cpfCnpj || fatura.cliente?.cpfCnpj;
            const nossoNumero = fechamentoData.boletoInfo?.nossoNumero;
            
            try {
                setIsLoading(true);
                toast.info('Buscando boleto existente no Banco Inter...');
                
                const supabaseAuth = getSupabaseWithAuth();
                const { data: result, error } = await supabaseAuth.functions.invoke('buscar-boleto-pdf', {
                    body: { 
                        nossoNumero: nossoNumero || undefined,
                        codigoFatura: codigoFatura,
                        cpfCnpj: cpfCnpj
                    }
                });
                
                if (error) {
                    console.error('Erro ao buscar boleto:', error);
                    toast.error('Erro na comunicação com Banco Inter');
                    return;
                }
                
                if (!result?.pdf) {
                    console.error('PDF não encontrado:', result);
                    toast.error(`Boleto não encontrado no Banco Inter. Verifique se o boleto foi realmente emitido para ${fechamentoData.nomeCliente}`);
                    return;
                }
                
                // PDF encontrado! Atualizar dados
                fechamentoData.boletoPdf = result.pdf;
                if (result.nossoNumero) {
                    fechamentoData.boletoInfo = { ...fechamentoData.boletoInfo, nossoNumero: result.nossoNumero };
                }
                
                // Também buscar o PDF da fatura
                try {
                    const pdfResult = await service.gerarFaturaPdf(fatura.faturaId || fatura.id, fatura.id);
                    if (pdfResult?.dados) {
                        fechamentoData.faturaPdf = pdfResult.dados;
                    }
                } catch (e) {
                    console.warn('Não foi possível buscar PDF da fatura:', e);
                }
                
                // Salvar no localStorage e estado
                setFechamentosMap(prev => ({ ...prev, [fatura.id]: fechamentoData }));
                localStorage.setItem(`fechamento_${fatura.id}`, JSON.stringify(fechamentoData));
                
                // Salvar no Supabase também
                try {
                    const updateResult = await supabaseAuth
                        .from('fechamentos_fatura')
                        .update({
                            fatura_pdf: fechamentoData.faturaPdf,
                            boleto_pdf: fechamentoData.boletoPdf,
                            boleto_id: result.nossoNumero || fechamentoData.boletoInfo?.nossoNumero,
                        })
                        .or(`fatura_id.eq.${fatura.id},subfatura_id.eq.${fatura.id}`);
                    
                    console.log('✅ Fechamento atualizado no Supabase:', updateResult);
                } catch (dbErr) {
                    console.warn('Erro ao atualizar no Supabase:', dbErr);
                }
                
                toast.success('PDF recuperado do Banco Inter!');
                
                setIsModalFechamento({
                    isOpen: true,
                    faturaPdf: fechamentoData.faturaPdf || '',
                    boletoPdf: fechamentoData.boletoPdf,
                    codigoFatura: fechamentoData.codigoFatura,
                    nomeCliente: fechamentoData.nomeCliente,
                    boletoInfo: fechamentoData.boletoInfo
                });
                
            } catch (err) {
                console.error('Erro:', err);
                toast.error('Erro ao buscar PDF do Banco Inter');
            } finally {
                setIsLoading(false);
            }
            return;
        }
        
        // Se não existe fechamento, realizar
        handleRealizarFechamento(fatura);
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
                
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => carregarFechamentos()}
                        disabled={carregandoFechamentos}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-input bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        title="Atualizar fechamentos"
                    >
                        <RefreshCw size={16} className={carregandoFechamentos ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                    
                    <button
                        onClick={() => registrarFechamentosEmMassa()}
                        disabled={registrandoFechamentos}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 disabled:opacity-50 transition-colors"
                        title="Registrar fechamentos feitos em produção"
                    >
                        {registrandoFechamentos ? <RefreshCw size={16} className="animate-spin" /> : null}
                        Registrar Fechamentos
                    </button>
                    
                    {tab === 'faturamentos' && (
                        <RealtimeStatusIndicator 
                            isConnected={true}
                            lastUpdate={lastUpdate}
                        />
                    )}
                </div>
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
                        testarPDF={handleTestarPDF}
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
