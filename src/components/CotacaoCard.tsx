import type { ICotacaoMinimaResponse } from '../types/ICotacao';
import { AlertCircle, Check } from 'lucide-react';

interface CotacaoCardProps {
    cotacao: ICotacaoMinimaResponse;
    onSelect?: (cotacao: ICotacaoMinimaResponse) => void;
    isSelected?: boolean;
    showSelectButton?: boolean;
    isBestPrice?: boolean;
    compact?: boolean;
    isDisabled?: boolean;
    disabledReason?: string;
}

export const CotacaoCard = ({
    cotacao,
    onSelect,
    isSelected = false,
    isBestPrice = false,
    isDisabled = false,
    disabledReason,
}: CotacaoCardProps) => {
    const nome = cotacao.nomeServico || '';
    const prazoLabel =
        cotacao.prazo === 0
            ? 'Hoje'
            : `${cotacao.prazo} ${cotacao.prazo > 1 ? 'dias úteis' : 'dia útil'}`;

    const handleClick = (e: React.MouseEvent) => {
        if (isDisabled) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(cotacao);
    };

    const ring = isDisabled
        ? 'opacity-60 cursor-not-allowed border-border bg-muted/20'
        : isSelected
        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
        : 'border-border/70 bg-card hover:border-primary/50 hover:bg-accent/30';

    return (
        <div
            onClick={handleClick}
            className={`relative w-full rounded-2xl border-2 px-5 py-4 transition-all duration-200 ${
                isDisabled ? '' : 'cursor-pointer'
            } ${ring}`}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-foreground uppercase tracking-wide leading-tight">
                            {nome}
                        </p>
                        {isBestPrice && !isDisabled && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-bold uppercase tracking-wide">
                                Melhor preço
                            </span>
                        )}
                        {isSelected && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{prazoLabel}</p>
                </div>

                <div className="text-right flex-shrink-0">
                    <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                        {cotacao.preco}
                    </span>
                </div>
            </div>

            {isDisabled && disabledReason && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/70 dark:border-amber-700/50">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-amber-700 dark:text-amber-300">{disabledReason}</span>
                </div>
            )}
        </div>
    );
};
