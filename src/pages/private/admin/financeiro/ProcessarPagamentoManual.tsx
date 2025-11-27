import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../integrations/supabase/client';
import { toastSuccess, toastError } from '../../../../utils/toastNotify';
import { Content } from '../../Content';
import { CreditCard, Search, CheckCircle, AlertCircle, Gift } from 'lucide-react';

export default function ProcessarPagamentoManualAdmin() {
    const [txid, setTxid] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultado, setResultado] = useState<{ success: boolean; message: string; valor?: number; bonus?: number } | null>(null);
    const queryClient = useQueryClient();

    const processarPagamento = useMutation({
        mutationFn: async (txid: string) => {
            const { data, error } = await supabase.functions.invoke('processar-pagamento-manual', {
                body: { txid }
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Erro ao processar pagamento');

            return data;
        },
        onSuccess: (data) => {
            const mensagem = data.bonus > 0 
                ? `Pagamento processado! R$ ${data.valor} + R$ ${data.bonus} (bônus) adicionados.`
                : `Pagamento processado! R$ ${data.valor} adicionado aos créditos.`;
            
            toastSuccess(mensagem);
            setResultado({ 
                success: true, 
                message: mensagem,
                valor: data.valor,
                bonus: data.bonus 
            });
            queryClient.invalidateQueries({ queryKey: ['saldo-cliente'] });
            queryClient.invalidateQueries({ queryKey: ['recargas-pix'] });
        },
        onError: (error: any) => {
            const errorMessage = error.message || 'Erro ao processar pagamento';
            toastError(errorMessage);
            setResultado({ success: false, message: errorMessage });
        },
        onSettled: () => {
            setIsProcessing(false);
        }
    });

    const handleProcessar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!txid.trim()) {
            toastError('Informe o TXID da transação');
            return;
        }
        setIsProcessing(true);
        setResultado(null);
        processarPagamento.mutate(txid.trim());
    };

    return (
        <Content titulo="Processar Pagamento Manual" subTitulo="Confirmar pagamentos PIX não detectados automaticamente">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Aviso */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Atenção</h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                Use esta ferramenta apenas quando o webhook automático não detectar um pagamento PIX. 
                                Informe o TXID da transação para processar manualmente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Formulário */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground">Processar Pagamento</h2>
                    </div>

                    <form onSubmit={handleProcessar} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                TXID da Transação PIX
                            </label>
                            <input
                                type="text"
                                value={txid}
                                onChange={(e) => setTxid(e.target.value)}
                                placeholder="Ex: abc123def456..."
                                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-foreground"
                                disabled={isProcessing}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                O TXID é o identificador único da transação PIX gerada pelo sistema.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing || !txid.trim()}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Processar Pagamento
                                </>
                            )}
                        </button>
                    </form>

                    {/* Resultado */}
                    {resultado && (
                        <div className={`mt-6 p-4 rounded-lg ${
                            resultado.success 
                                ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' 
                                : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
                        }`}>
                            <div className="flex items-start gap-3">
                                {resultado.success ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <p className={`font-medium ${resultado.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                        {resultado.success ? 'Sucesso!' : 'Erro'}
                                    </p>
                                    <p className={`text-sm mt-1 ${resultado.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                        {resultado.message}
                                    </p>
                                    {resultado.success && resultado.bonus && resultado.bonus > 0 && (
                                        <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400">
                                            <Gift className="w-4 h-4" />
                                            <span>Bônus promocional de R$ {resultado.bonus.toFixed(2)} aplicado!</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info sobre bônus */}
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Gift className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-green-800 dark:text-green-200">Promoção Ativa</h3>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                Recargas de R$ 100 ou mais recebem automaticamente um bônus de R$ 50 em créditos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Content>
    );
}
