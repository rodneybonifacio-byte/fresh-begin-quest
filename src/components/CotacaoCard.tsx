import type { ICotacaoMinimaResponse } from '../types/ICotacao';
import { getTransportadoraAltText, getTransportadoraImage } from '../utils/imageHelper';
import { Clock, Check, AlertCircle, Sparkles, TrendingDown } from 'lucide-react';

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
    showSelectButton = false,
    isBestPrice = false,
    compact = false,
    isDisabled = false,
    disabledReason,
}: CotacaoCardProps) => {
    const nome = cotacao.nomeServico || '';
    const lower = nome.toLowerCase();
    const isRodonaves = cotacao.imagem?.toLowerCase().includes('rodonaves') || lower.includes('rodonaves');
    const isCargas = lower.includes('carga') || lower.includes('rodonaves') || lower.includes('jadlog') || lower.includes('braspress');

    const precoNumerico = parseFloat(cotacao.preco.replace('R$', '').replace(',', '.').trim());
    const multiplicador = isRodonaves ? 1.5 : 2.7657;
    const percentualDesconto = isRodonaves ? 50 : 64;
    const valorTabela = precoNumerico * multiplicador;
    const economia = valorTabela - precoNumerico;

    const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const handleClick = (e: React.MouseEvent) => {
        if (isDisabled) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(cotacao);
    };

    const baseRing = isDisabled
        ? 'opacity-60 cursor-not-allowed border-border bg-muted/20'
        : isSelected
        ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-lg'
        : isBestPrice
        ? 'border-green-500/60 bg-gradient-to-br from-green-50/60 to-card dark:from-green-950/20 dark:to-card hover:border-green-500 hover:shadow-xl'
        : 'border-border hover:border-primary/40 hover:shadow-xl';

    if (compact) {
        return (
            <div
                onClick={handleClick}
                className={`group relative bg-card rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all duration-200 ${
                    isDisabled ? '' : 'cursor-pointer hover:-translate-y-0.5'
                } ${baseRing}`}
            >
                {isBestPrice && !isDisabled && (
                    <div className="absolute -top-2.5 left-3 z-10">
                        <div className="flex items-center gap-1 bg-green-600 text-white px-2.5 py-0.5 rounded-full shadow-md">
                            <Sparkles className="h-3 w-3" />
                            <span className="text-[10px] font-bold tracking-wide uppercase">Melhor preço</span>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <div className="bg-white rounded-lg p-1.5 border border-border/60 flex-shrink-0 w-16 h-12 flex items-center justify-center">
                        <img
                            src={getTransportadoraImage(cotacao.imagem || '')}
                            alt={getTransportadoraAltText(cotacao.imagem || '')}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">{nome}</p>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{cotacao.prazo} {cotacao.prazo > 1 ? 'dias úteis' : 'dia útil'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-between gap-2 pt-2 border-t border-border/60">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground line-through leading-none">
                            {fmt(valorTabela)}
                        </span>
                        <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 mt-1 flex items-center gap-0.5">
                            <TrendingDown className="h-3 w-3" />
                            -{percentualDesconto}%
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block leading-none">você paga</span>
                        <span className="text-xl font-extrabold text-primary leading-tight">{cotacao.preco}</span>
                    </div>
                </div>

                {isDisabled && disabledReason && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200/70 dark:border-amber-700/50">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">{disabledReason}</span>
                    </div>
                )}

                {showSelectButton && (
                    <button
                        type="button"
                        onClick={handleClick}
                        disabled={isDisabled}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                            isDisabled
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : isSelected
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-foreground/5 text-foreground hover:bg-primary hover:text-primary-foreground'
                        }`}
                    >
                        {isDisabled ? 'Indisponível' : isSelected ? (
                            <span className="flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5" /> Selecionado</span>
                        ) : 'Selecionar'}
                    </button>
                )}
            </div>
        );
    }

    // Full version
    return (
        <div
            onClick={handleClick}
            className={`group relative bg-card rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all duration-300 ${
                isDisabled ? '' : 'cursor-pointer hover:-translate-y-1'
            } ${baseRing}`}
        >
            {isBestPrice && !isDisabled && (
                <div className="absolute -top-3 left-4 z-10">
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-full shadow-lg">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold tracking-wide uppercase">Melhor preço</span>
                    </div>
                </div>
            )}

            {isSelected && (
                <div className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 bg-primary rounded-full shadow-md">
                    <Check className="h-5 w-5 text-primary-foreground" strokeWidth={3} />
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="bg-white rounded-xl p-2 border border-border/60 w-24 h-14 flex items-center justify-center flex-shrink-0">
                    <img
                        src={getTransportadoraImage(cotacao.imagem || '')}
                        alt={getTransportadoraAltText(cotacao.imagem || '')}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{nome}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Entrega em <strong className="text-foreground">{cotacao.prazo} {cotacao.prazo > 1 ? 'dias úteis' : 'dia útil'}</strong></span>
                    </div>
                    {isCargas && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded uppercase tracking-wide">
                            Cargas
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-end justify-between gap-3 p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/10 border border-border/40">
                <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground line-through leading-none">{fmt(valorTabela)}</span>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" />
                        Economia de {fmt(economia)}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block uppercase tracking-wide leading-none">você paga</span>
                    <span className="text-3xl font-extrabold text-primary leading-tight tracking-tight">{cotacao.preco}</span>
                </div>
            </div>

            {isDisabled && disabledReason && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/70 dark:border-amber-700/50">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-amber-700 dark:text-amber-300">{disabledReason}</span>
                </div>
            )}

            {showSelectButton && (
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={isDisabled}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isDisabled
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                            : 'bg-foreground/5 text-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-lg'
                    }`}
                >
                    {isDisabled ? 'Indisponível' : isSelected ? (
                        <span className="flex items-center justify-center gap-1.5"><Check className="h-4 w-4" /> Selecionado</span>
                    ) : 'Selecionar frete'}
                </button>
            )}
        </div>
    );
};
