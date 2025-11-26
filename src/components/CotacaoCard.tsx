import type { ICotacaoMinimaResponse } from '../types/ICotacao';
import { getTransportadoraAltText, getTransportadoraImage } from '../utils/imageHelper';
import { BadgePercent } from 'lucide-react';

interface CotacaoCardProps {
    cotacao: ICotacaoMinimaResponse;
    onSelect?: (cotacao: ICotacaoMinimaResponse) => void;
    isSelected?: boolean;
    showSelectButton?: boolean;
    isBestPrice?: boolean;
}

export const CotacaoCard = ({ cotacao, onSelect, isSelected = false, showSelectButton = false, isBestPrice = false }: CotacaoCardProps) => {
    // O valor da API é o valor real que o cliente paga
    // Identifica se é Rodonaves ou Correios para aplicar o percentual correto
    const isRodonaves = cotacao.imagem?.toLowerCase().includes('rodonaves') || 
                        cotacao.nomeServico?.toLowerCase().includes('rodonaves');
    
    const precoNumerico = parseFloat(cotacao.preco.replace('R$', '').replace(',', '.').trim());
    
    // Rodonaves: 50% OFF (1.50) | Correios: 63.8% OFF (2.7657)
    // Correios: valor_tabela = preço + 176,57% = preço * 2.7657
    // Exemplo: R$ 8,75 * 2.7657 = R$ 24,20
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

    return (
        <div
            className={`group bg-card rounded-xl shadow-lg p-5 gap-3 w-full flex flex-col relative border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${
                isSelected
                    ? 'border-primary ring-4 ring-primary/20 bg-primary/5'
                    : isBestPrice
                    ? 'border-green-500 ring-4 ring-green-500/30 bg-green-50 dark:bg-green-950/20'
                    : 'border-border hover:border-primary/50'
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
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
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

            {showSelectButton && (
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
        </div>
    );
};
