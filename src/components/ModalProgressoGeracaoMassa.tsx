import React from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Package } from 'lucide-react';

interface ProgressoGeracaoMassaProps {
    isOpen: boolean;
    total: number;
    processados: number;
    sucessos: number;
    erros: number;
    pedidoAtual?: string;
    onCancelar: () => void;
    cancelando: boolean;
}

export const ModalProgressoGeracaoMassa: React.FC<ProgressoGeracaoMassaProps> = ({
    isOpen,
    total,
    processados,
    sucessos,
    erros,
    pedidoAtual,
    onCancelar,
    cancelando,
}) => {
    if (!isOpen) return null;

    const progresso = total > 0 ? Math.round((processados / total) * 100) : 0;
    const finalizado = processados >= total;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-border">
                {/* Header */}
                <div className="bg-primary/10 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg">
                                <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    Gerando Etiquetas
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {finalizado ? 'Processamento concluído' : 'Aguarde enquanto processamos...'}
                                </p>
                            </div>
                        </div>
                        {finalizado && (
                            <button
                                onClick={onCancelar}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium text-foreground">{processados} de {total}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progresso}%` }}
                            />
                        </div>
                        <div className="text-right text-sm font-medium text-primary">
                            {progresso}%
                        </div>
                    </div>

                    {/* Status atual */}
                    {!finalizado && pedidoAtual && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-sm text-muted-foreground truncate">
                                Processando: <span className="font-medium text-foreground">{pedidoAtual}</span>
                            </span>
                        </div>
                    )}

                    {/* Resultados */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{sucessos}</p>
                                <p className="text-xs text-green-600/80 dark:text-green-400/80">Sucesso</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <div>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{erros}</p>
                                <p className="text-xs text-red-600/80 dark:text-red-400/80">Erros</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border">
                    {finalizado ? (
                        <button
                            onClick={onCancelar}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                            Fechar
                        </button>
                    ) : (
                        <button
                            onClick={onCancelar}
                            disabled={cancelando}
                            className="w-full py-3 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {cancelando ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cancelando...
                                </>
                            ) : (
                                <>
                                    <X className="w-4 h-4" />
                                    Cancelar Geração
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
