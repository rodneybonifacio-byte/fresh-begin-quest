import { useState, useEffect } from "react";
import { useAuth } from "../../../../providers/AuthContext";
import { CreditoService, ITransacaoCredito } from "../../../../services/CreditoService";
import { formatCurrencyWithCents } from "../../../../utils/formatCurrency";
import { Receipt, ArrowUpCircle, ArrowDownCircle, Clock, AlertCircle, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../../../../integrations/supabase/client";
import { useRecargaPixRealtime } from "../../../../hooks/useRecargaPixRealtime";
import { toast } from "sonner";
import { ExplicacaoRegraBloqueio } from "../../../../components/ExplicacaoRegraBloqueio";
import { ProcessarCreditosService } from "../../../../services/ProcessarCreditosService";

export default function ExtratoCreditos() {
    const { user } = useAuth();
    const [transacoes, setTransacoes] = useState<ITransacaoCredito[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState<'todos' | 'recarga' | 'consumo' | 'bloqueado' | 'estorno'>('todos');
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 15;
    const [resumo, setResumo] = useState({
        totalRecargas: 0,
        totalConsumos: 0,
        totalBloqueados: 0,
        quantidadeRecargas: 0,
        quantidadeConsumos: 0,
        quantidadeBloqueados: 0
    });

    const service = new CreditoService();

    useRecargaPixRealtime({
        enabled: true,
        onPaymentConfirmed: () => {
            carregarDados();
        }
    });

    useEffect(() => {
        if (!user?.clienteId) return;

        console.log('🔔 Configurando listener realtime para transacoes_credito...');
        const channel = supabase
            .channel('transacoes-credito-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'transacoes_credito',
                    filter: `cliente_id=eq.${user.clienteId}`
                },
                (payload) => {
                    console.log('📥 Mudança detectada em transacoes_credito:', payload);
                    console.log('🔄 Recarregando dados do extrato...');
                    carregarDados();
                }
            )
            .subscribe((status) => {
                console.log('📡 Status do canal transacoes_credito:', status);
            });

        return () => {
            console.log('🔕 Removendo listener de transacoes_credito');
            supabase.removeChannel(channel);
        };
    }, [user?.clienteId]);

    useEffect(() => {
        if (user?.clienteId) {
            carregarDados();
        }
    }, [user?.clienteId]);

    const carregarDados = async () => {
        try {
            setLoading(true);
            
            if (!user?.clienteId) {
                setLoading(false);
                return;
            }
            
            const extratoData = await service.obterExtrato(user.clienteId);
            
            const [bloqueados, consumidos] = await Promise.all([
                service.calcularCreditosBloqueados(user.clienteId),
                service.calcularCreditosConsumidos(user.clienteId)
            ]);
            
            const totalRecargas = extratoData
                .filter(t => t.tipo === 'recarga')
                .reduce((acc, t) => acc + Number(t.valor), 0);
            
            const quantidadeRecargas = extratoData.filter(t => t.tipo === 'recarga').length;
            const quantidadeBloqueados = extratoData.filter(t => t.status === 'bloqueado').length;
            const quantidadeConsumos = extratoData.filter(t => t.tipo === 'consumo' && t.status === 'consumido').length;
            
            setTransacoes(extratoData);
            setResumo({
                totalRecargas,
                totalConsumos: consumidos,
                totalBloqueados: bloqueados,
                quantidadeRecargas,
                quantidadeConsumos,
                quantidadeBloqueados
            });
            
        } catch (error) {
            console.error('Erro ao carregar extrato:', error);
            toast.error('Erro ao carregar extrato de créditos');
        } finally {
            setLoading(false);
        }
    };

    const processarCreditosBloqueados = async () => {
        try {
            toast.loading('Processando créditos bloqueados...', { id: 'processar-creditos' });
            
            const resultado = await ProcessarCreditosService.executarProcessamento();
            
            toast.success(`Processamento concluído! ${resultado.consumidas || 0} consumidas, ${resultado.liberadas || 0} liberadas, ${resultado.mantidas || 0} mantidas.`, { 
                id: 'processar-creditos',
                duration: 5000 
            });
            
            // Recarregar dados após processamento
            await carregarDados();
        } catch (error) {
            console.error('Erro ao processar créditos:', error);
            toast.error('Erro ao processar créditos bloqueados', { id: 'processar-creditos' });
        }
    };

    const transacoesFiltradas = transacoes.filter(t => {
        if (filtroTipo === 'todos') return true;
        if (filtroTipo === 'bloqueado') {
            return t.status === 'bloqueado';
        }
        if (filtroTipo === 'estorno') {
            return t.tipo === 'recarga' && (t.descricao || '').startsWith('Estorno de cancelamento');
        }
        return t.tipo === filtroTipo;
    });

    const totalPaginas = Math.ceil(transacoesFiltradas.length / itensPorPagina);
    const indiceInicio = (paginaAtual - 1) * itensPorPagina;
    const indiceFim = indiceInicio + itensPorPagina;
    const transacoesPaginadas = transacoesFiltradas.slice(indiceInicio, indiceFim);

    useEffect(() => {
        setPaginaAtual(1);
    }, [filtroTipo]);

    const formatarData = (data: string) => {
        return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Receipt className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Extrato de Créditos</h1>
                        <p className="text-muted-foreground">Histórico completo de transações</p>
                    </div>
                    <button
                        onClick={processarCreditosBloqueados}
                        className="ml-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
                        title="Processar créditos bloqueados (verifica status das etiquetas e consome/libera créditos)"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="text-sm font-medium">Processar Créditos</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <ArrowUpCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Recargas</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrencyWithCents(resumo.totalRecargas.toString())}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {resumo.quantidadeRecargas} {resumo.quantidadeRecargas === 1 ? 'transação' : 'transações'}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Bloqueados</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrencyWithCents(resumo.totalBloqueados.toString())}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {resumo.quantidadeBloqueados} {resumo.quantidadeBloqueados === 1 ? 'etiqueta' : 'etiquetas'}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <ArrowDownCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Consumidos</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrencyWithCents(resumo.totalConsumos.toString())}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {resumo.quantidadeConsumos} {resumo.quantidadeConsumos === 1 ? 'transação' : 'transações'}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Disponível</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrencyWithCents((resumo.totalRecargas - resumo.totalBloqueados - resumo.totalConsumos).toString())}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Saldo livre
                        </p>
                    </div>
                </div>

                <ExplicacaoRegraBloqueio />

                <div className="bg-card border border-border rounded-lg">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-foreground">Histórico de Transações</h2>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <select
                                value={filtroTipo}
                                onChange={(e) => {
                                    setFiltroTipo(e.target.value as any);
                                }}
                                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="todos">Todas</option>
                                <option value="recarga">Recargas</option>
                                <option value="bloqueado">Bloqueados</option>
                                <option value="consumo">Consumidos</option>
                                <option value="estorno">Estornos</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-muted-foreground">Carregando...</p>
                        </div>
                    ) : transacoesPaginadas.length === 0 ? (
                        <div className="p-12 text-center">
                            <Receipt className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-lg font-medium text-muted-foreground">
                                Nenhuma transação encontrada
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {transacoesPaginadas.map((transacao) => (
                                            <tr key={transacao.id} className="hover:bg-muted/30">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatarData(transacao.created_at)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {(transacao.descricao || '').startsWith('Estorno de cancelamento') ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Estorno
                                                    </span>
                                                ) : transacao.status === 'bloqueado' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        Bloqueado
                                                    </span>
                                                ) : transacao.tipo === 'recarga' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                                                        Recarga
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                                        <ArrowDownCircle className="w-3 h-3 mr-1" />
                                                        Consumido
                                                    </span>
                                                )}
                                            </td>
                                                <td className="px-6 py-4 text-sm">{transacao.descricao || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <span className={transacao.tipo === 'recarga' ? 'text-green-600' : 'text-red-600'}>
                                                        {transacao.tipo === 'recarga' ? '+' : ''}
                                                        {formatCurrencyWithCents(transacao.valor.toString())}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPaginas > 1 && (
                                <div className="px-6 py-4 border-t flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        {indiceInicio + 1} a {Math.min(indiceFim, transacoesFiltradas.length)} de {transacoesFiltradas.length}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                                            disabled={paginaAtual === 1}
                                            className="px-3 py-1 text-sm border rounded-lg hover:bg-muted disabled:opacity-50"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                                            disabled={paginaAtual === totalPaginas}
                                            className="px-3 py-1 text-sm border rounded-lg hover:bg-muted disabled:opacity-50"
                                        >
                                            Próxima
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
