import type { ICotacaoMinimaResponse } from '../types/ICotacao';
import { getTransportadoraAltText, getTransportadoraImage } from '../utils/imageHelper';
import { BadgePercent, AlertCircle } from 'lucide-react';

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
    disabledReason
}: CotacaoCardProps) => {
    const isRodonaves = cotacao.imagem?.toLowerCase().includes('rodonaves') || 
                        cotacao.nomeServico?.toLowerCase().includes('rodonaves');
    
    const precoNumerico = parseFloat(cotacao.preco.replace('R$', '').replace(',', '.').trim());
    
    const multiplicador = isRodonaves ? 1.50 : 2.7657;
    const percentualDesconto = isRodonaves ? 50 : 63.8;
    
    const valorTabela = precoNumerico * multiplicador;
    const economia = valorTabela - precoNumerico;
    
    const valorTabelaFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valorTabela);
    
    const economiaFormatada = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(economia);

    if (compact) {
        return (
            <div
                className={`group bg-card rounded-xl shadow-md p-3 gap-2 w-full flex flex-col relative border-2 transition-all duration-200 ${
                    isDisabled
                        ? 'opacity-50 cursor-not-allowed border-muted bg-muted/30'
                        : isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 hover:shadow-lg hover:scale-[1.01]'
                        : isBestPrice
                        ? 'border-green-500 ring-2 ring-green-500/20 bg-green-50 dark:bg-green-950/20 hover:shadow-lg hover:scale-[1.01]'
                        : 'border-border hover:border-primary/50 hover:shadow-lg hover:scale-[1.01]'
                }`}
            >
                {/* Badge de melhor preço compacto */}
                {isBestPrice && (
                    <div className="absolute -top-2 left-2 z-20">
                        <div className="bg-gradient-to-br from-green-600 to-green-700 text-white px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                            <span className="text-xs">⭐</span>
                            <span className="font-bold text-[10px]">MELHOR</span>
                        </div>
                    </div>
                )}
                
                {/* Badge de desconto compacto */}
                <div className={`absolute -top-2 z-10 ${isBestPrice ? 'right-2' : 'right-2'}`}>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <BadgePercent className="h-3 w-3" />
                        <span className="font-bold text-[10px]">{percentualDesconto}%</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <div className="bg-white p-1.5 rounded-md shadow-sm border border-border flex-shrink-0">
                        <img
                            src={getTransportadoraImage(cotacao.imagem || '')}
                            alt={getTransportadoraAltText(cotacao.imagem || '')}
                            className="w-16 h-6 object-contain"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{cotacao.nomeServico}</p>
                        <p className="text-xs text-muted-foreground">
                            {cotacao.prazo} {cotacao.prazo > 1 ? 'dias' : 'dia'}
                        </p>
                    </div>
                </div>

                {/* Preços compacto */}
                <div className="flex flex-col gap-1 p-2 bg-gradient-to-br from-primary/5 to-primary/10 rounded-md">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground line-through">{valorTabelaFormatado}</span>
                        <span className="text-lg font-bold text-primary">{cotacao.preco}</span>
                    </div>
                    <span className="text-[10px] text-green-600 dark:text-green-400 text-center">
                        💰 -{economiaFormatada}
                    </span>
                </div>

                {isDisabled && disabledReason && (
                    <div className="flex items-center gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-700">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-xs text-amber-700 dark:text-amber-300">{disabledReason}</span>
                    </div>
                )}

                {showSelectButton && !isDisabled && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect && onSelect(cotacao);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                            isSelected
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'
                        }`}
                    >
                        {isSelected ? '✓ Selecionado' : 'Selecionar'}
                    </button>
                )}

                {showSelectButton && isDisabled && (
                    <button
                        type="button"
                        disabled
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-muted text-muted-foreground cursor-not-allowed"
                    >
                        Indisponível
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            className={`group bg-card rounded-xl shadow-lg p-5 gap-3 w-full flex flex-col relative border-2 transition-all duration-300 ${
                isDisabled
                    ? 'opacity-50 cursor-not-allowed border-muted bg-muted/30'
                    : isSelected
                    ? 'border-primary ring-4 ring-primary/20 bg-primary/5 hover:shadow-2xl hover:scale-[1.02]'
                    : isBestPrice
                    ? 'border-green-500 ring-4 ring-green-500/30 bg-green-50 dark:bg-green-950/20 hover:shadow-2xl hover:scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:shadow-2xl hover:scale-[1.02]'
            }`}
        >
            {/* Badge de melhor preço */}
            {isBestPrice && (
                <div className="absolute -top-3 -left-3 z-20">
                    <div className="bg-gradient-to-br from-green-600 to-green-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                        <span className="text-xl">⭐</span>
                        <span className="font-bold text-sm">MELHOR PREÇO</span>
                    </div>
                </div>
            )}
            {/* Badge de desconto com porcentagem real */}
            <div className={`absolute -top-3 z-10 ${isBestPrice ? 'right-3' : '-right-3'}`}>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
                    <BadgePercent className="h-4 w-4" />
                    <span className="font-bold text-sm">{percentualDesconto}% OFF</span>
                </div>
            </div>

            <div className="gap-3 w-full flex flex-col">
                <div className="flex items-center justify-between">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-border">
                        <img
                            src={getTransportadoraImage(cotacao.imagem || '')}
                            alt={getTransportadoraAltText(cotacao.imagem || '')}
                            className="w-32 h-10 object-contain"
                        />
                    </div>
                    {isSelected && (
                        <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-full shadow-lg animate-scale-in">
                            <svg className="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 bg-muted/50 p-3 rounded-lg">
                    <div className="flex-1">
                        <span className="text-xs text-muted-foreground font-medium">Modalidade:</span>
                        <p className="text-base font-semibold text-foreground">{cotacao.nomeServico}</p>
                    </div>
                    <div className="flex-1 text-right">
                        <span className="text-xs text-muted-foreground font-medium">Prazo Estimado:</span>
                        <p className="text-base font-semibold text-foreground">
                            {cotacao.prazo} {cotacao.prazo > 1 ? 'dias' : 'dia'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Seção de preços com destaque de desconto */}
            <div className="flex flex-col gap-2 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Valor de tabela:</span>
                    <span className="text-lg text-muted-foreground line-through">{valorTabelaFormatado}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                    <span className="text-base font-semibold text-foreground">Você paga apenas:</span>
                    <span className="text-2xl font-bold text-primary">{cotacao.preco}</span>
                </div>
                <div className="text-center mt-1">
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        💰 Economize {economiaFormatada} ({percentualDesconto}% de desconto)
                    </span>
                </div>
            </div>

            {isDisabled && disabledReason && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">{disabledReason}</span>
                </div>
            )}

            {showSelectButton && !isDisabled && (
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect && onSelect(cotacao);
                        }}
                        className={`w-full py-3 px-6 rounded-xl text-base font-bold transition-all duration-300 shadow-md ${
                            isSelected
                                ? 'bg-primary text-primary-foreground shadow-primary/50 scale-105'
                                : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:scale-105'
                        }`}
                    >
                        {isSelected ? '✓ Frete Selecionado' : 'Selecionar Frete'}
                    </button>
                </div>
            )}

            {showSelectButton && isDisabled && (
                <div className="mt-2">
                    <button
                        type="button"
                        disabled
                        className="w-full py-3 px-6 rounded-xl text-base font-bold bg-muted text-muted-foreground cursor-not-allowed"
                    >
                        Indisponível
                    </button>
                </div>
            )}
        </div>
    );
};
