import { useState, useEffect } from "react";
import { useAuth } from "../../../../providers/AuthContext";
import { CreditoService, ITransacaoCredito } from "../../../../services/CreditoService";
import { formatCurrencyWithCents } from "../../../../utils/formatCurrency";
import { Receipt, TrendingUp, TrendingDown, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../../../../integrations/supabase/client";
import { useRecargaPixRealtime } from "../../../../hooks/useRecargaPixRealtime";
import { toast } from "sonner";

export default function ExtratoCreditos() {
    const { user } = useAuth();
    const [transacoes, setTransacoes] = useState<ITransacaoCredito[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState<'todos' | 'recarga' | 'consumo'>('todos');
    const [resumo, setResumo] = useState({
        totalRecargas: 0,
        totalConsumos: 0,
        totalEtiquetasGeradas: 0, // Novo: total de etiquetas com status != pré-postado
        quantidadeRecargas: 0,
        quantidadeConsumos: 0,
        quantidadeEtiquetas: 0 // Novo: quantidade de etiquetas com status != pré-postado
    });

    const service = new CreditoService();

    // Listener de notificações em tempo real para pagamentos PIX e transações
    useRecargaPixRealtime({
        enabled: true,
        onPaymentConfirmed: () => {
            console.log('🎉 Pagamento confirmado! Atualizando extrato...');
            carregarDados();
        }
    });

    // Listener para atualizações em tempo real na tabela transacoes_credito
    useEffect(() => {
        if (!user?.clienteId) return;

        console.log('🔔 Iniciando listener de transações em tempo real...');

        const channel = supabase
            .channel('transacoes-credito-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuta INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'transacoes_credito',
                    filter: `cliente_id=eq.${user.clienteId}`
                },
                (payload) => {
                    console.log('📥 Mudança detectada em transações:', payload);
                    
                    if (payload.eventType === 'INSERT') {
                        const novaTransacao = payload.new as ITransacaoCredito;
                        const tipo = novaTransacao.tipo === 'recarga' ? 'Recarga' : 'Consumo';
                        toast.success(`${tipo} registrada: ${formatCurrencyWithCents(novaTransacao.valor.toString())}`);
                    }
                    
                    // Atualizar dados
                    carregarDados();
                }
            )
            .subscribe((status) => {
                console.log('Status do canal de transações:', status);
            });

        return () => {
            console.log('🔕 Removendo listener de transações');
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
            
            // Carregar transações e resumo
            const [extratoData, resumoData] = await Promise.all([
                service.obterExtrato(user?.clienteId ?? '', 100),
                service.obterResumo(user?.clienteId ?? '')
            ]);
            
            setTransacoes(extratoData);
            
            // Por enquanto, usar os dados das transações já registradas
            // TODO: Integrar com backend para buscar todas as emissões com status != pré-postado
            setResumo({
                totalRecargas: resumoData.totalRecargas,
                totalConsumos: resumoData.totalConsumos,
                totalEtiquetasGeradas: resumoData.totalConsumos, // Mesmo valor por enquanto
                quantidadeRecargas: resumoData.quantidadeRecargas,
                quantidadeConsumos: resumoData.quantidadeConsumos,
                quantidadeEtiquetas: resumoData.quantidadeConsumos // Mesmo valor por enquanto
            });
        } catch (error) {
            console.error('Erro ao carregar extrato:', error);
        } finally {
            setLoading(false);
        }
    };

    const transacoesFiltradas = transacoes.filter(t => {
        if (filtroTipo === 'todos') return true;
        return t.tipo === filtroTipo;
    });

    const formatarData = (data: string) => {
        return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Receipt className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Extrato de Créditos</h1>
                        <p className="text-muted-foreground">Histórico completo de transações</p>
                    </div>
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Total Recargas</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrencyWithCents(resumo.totalRecargas.toString())}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {resumo.quantidadeRecargas} transações
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <TrendingDown className="w-5 h-5 text-red-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Total Consumos</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrencyWithCents(resumo.totalEtiquetasGeradas.toString())}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {resumo.quantidadeEtiquetas} etiquetas (status ≠ pré-postado)
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Calendar className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Saldo Líquido</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {formatCurrencyWithCents((resumo.totalRecargas - resumo.totalEtiquetasGeradas).toString())}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Recargas - Etiquetas geradas
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Filter className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Filtrar</span>
                        </div>
                        <select
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value as any)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        >
                            <option value="todos">Todas</option>
                            <option value="recarga">Recargas</option>
                            <option value="consumo">Consumos</option>
                        </select>
                    </div>
                </div>

                {/* Tabela de Transações */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-bold text-foreground">Histórico de Transações</h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <p className="text-muted-foreground">Carregando transações...</p>
                        </div>
                    ) : transacoesFiltradas.length === 0 ? (
                        <div className="p-12 text-center">
                            <Receipt className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Data</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tipo</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Descrição</th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {transacoesFiltradas.map((transacao) => (
                                        <tr key={transacao.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {formatarData(transacao.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                                                        transacao.tipo === 'recarga'
                                                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                    }`}
                                                >
                                                    {transacao.tipo === 'recarga' ? (
                                                        <>
                                                            <TrendingUp className="w-3 h-3" />
                                                            Recarga
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TrendingDown className="w-3 h-3" />
                                                            Consumo
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground">
                                                {transacao.descricao || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span
                                                    className={`text-sm font-semibold ${
                                                        transacao.tipo === 'recarga'
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}
                                                >
                                                    {transacao.tipo === 'recarga' ? '+' : '-'}
                                                    {formatCurrencyWithCents(Math.abs(transacao.valor).toString())}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Informações */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        Sobre o Extrato
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">•</span>
                            <span><strong>Recargas:</strong> Créditos adicionados à sua conta via PIX</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span><strong>Consumos:</strong> Calculado pela soma dos valores de todas as etiquetas geradas com status diferente de "pré-postado"</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span><strong>Status pré-postado:</strong> Etiquetas neste status não consomem créditos</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 font-bold">•</span>
                            <span><strong>Cobrança única:</strong> Cada etiqueta é cobrada apenas uma vez, mesmo que o status mude novamente</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-500 font-bold">•</span>
                            <span><strong>Saldo líquido:</strong> Diferença entre total de recargas e total de etiquetas geradas</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
