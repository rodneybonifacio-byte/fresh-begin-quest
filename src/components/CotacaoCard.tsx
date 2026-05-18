import type { ICotacaoMinimaResponse } from '../types/ICotacao';
import { getTransportadoraAltText, getTransportadoraImage } from '../utils/imageHelper';
import { AlertCircle, Check, Clock, Package, Receipt, TrendingDown } from 'lucide-react';

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
    const lower = nome.toLowerCase();
    const imagemLower = (cotacao.imagem || '').toLowerCase();
    const isRodonaves =
        imagemLower.includes('rodonaves') || lower.includes('rodonaves');
    const isGrandesVolumesImg =
        imagemLower.includes('grandes') || imagemLower.includes('grandes-volumes') || imagemLower.includes('grandesvolumes');
    const isCargas =
        lower.includes('carga') ||
        lower.includes('rodonaves') ||
        lower.includes('braspress') ||
        isGrandesVolumesImg;

    const prazoLabel =
        cotacao.prazo === 0
            ? 'Hoje'
            : `${cotacao.prazo} ${cotacao.prazo > 1 ? 'dias úteis' : 'dia útil'}`;

    const precoNumerico = parseFloat(cotacao.preco.replace('R$', '').replace(',', '.').trim());
    const multiplicador = isRodonaves ? 1.5 : 2.7657;
    const percentualDesconto = isRodonaves ? 50 : 64;
    const valorTabela = precoNumerico * multiplicador;
    const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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
        : isCargas
        ? 'border-blue-400/70 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-500 hover:bg-blue-50/70 dark:hover:bg-blue-950/30'
        : 'border-border/70 bg-card hover:border-primary/50 hover:bg-accent/30';

    return (
        <div
            onClick={handleClick}
            className={`relative w-full rounded-2xl border-2 pl-5 pr-4 sm:pr-5 py-4 transition-all duration-200 overflow-hidden ${
                isDisabled ? '' : 'cursor-pointer'
            } ${ring}`}
        >
            {isCargas && !isDisabled && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-blue-700" />
            )}
            <div className="flex items-center gap-4">
                {/* Logo transportadora */}
                <div className="bg-white rounded-xl p-2 border border-border/60 w-20 h-14 flex items-center justify-center flex-shrink-0">
                    <img
                        src={getTransportadoraImage(cotacao.imagem || '')}
                        alt={getTransportadoraAltText(cotacao.imagem || '')}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>

                {/* Informações */}
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
                        {isCargas && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">
                                <Package className="h-3 w-3" />
                                Grandes Volumes
                            </span>
                        )}
                        {(cotacao.isNotaFiscal === true || isRodonaves) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wide border border-amber-300 dark:border-amber-700">
                                <Receipt className="h-3 w-3" />
                                Exige Nota Fiscal
                            </span>
                        )}
                        {isSelected && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {prazoLabel}
                        </span>
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                            <TrendingDown className="h-3.5 w-3.5" />
                            -{percentualDesconto}%
                        </span>
                    </div>
                </div>

                {/* Preço */}
                <div className="text-right flex-shrink-0">
                    <span className="block text-[11px] text-muted-foreground line-through leading-none">
                        {fmt(valorTabela)}
                    </span>
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
