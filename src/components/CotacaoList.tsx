import type { ICotacaoMinimaResponse } from "../types/ICotacao";
import { CotacaoCard } from "./CotacaoCard";

interface CotacaoListProps {
    cotacoes: ICotacaoMinimaResponse[];
    onSelectCotacao?: (cotacao: ICotacaoMinimaResponse) => void;
    selectedCotacao?: ICotacaoMinimaResponse;
    showSelectButtons?: boolean;
    emptyStateMessage?: string;
    isLoading?: boolean;
    maxItems?: number;
    disabledServices?: string[];
}

// Verifica se a cotação pertence a um serviço desabilitado
const isServiceDisabled = (cotacao: ICotacaoMinimaResponse, disabledServices: string[]): boolean => {
    if (disabledServices.length === 0) return false;
    
    const nomeServico = cotacao.nomeServico?.toLowerCase() || '';
    const imagem = cotacao.imagem?.toLowerCase() || '';
    
    // Verifica se é Correios
    if (disabledServices.includes('correios')) {
        const isRodonaves = nomeServico.includes('rodonaves') || imagem.includes('rodonaves');
        if (!isRodonaves) return true;
    }
    
    return false;
};

export const CotacaoList = ({ 
    cotacoes, 
    onSelectCotacao, 
    selectedCotacao, 
    showSelectButtons = false,
    emptyStateMessage = "Nenhuma cotação encontrada",
    isLoading = false,
    maxItems = 5,
    disabledServices = []
}: CotacaoListProps) => {
    if (isLoading) {
        return (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {[...Array(Math.min(5, maxItems))].map((_, index) => (
                    <div key={index} className="bg-card rounded-xl shadow-lg p-4 border-2 border-border animate-pulse">
                        <div className="gap-2 mb-2 w-full flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="w-24 h-10 bg-muted rounded-lg"></div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="w-16 h-3 bg-muted rounded"></div>
                                <div className="w-24 h-4 bg-muted rounded"></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg">
                            <div className="w-full h-5 bg-muted rounded"></div>
                            <div className="w-full h-6 bg-muted rounded"></div>
                        </div>
                        <div className="mt-3 w-full h-10 bg-muted rounded-xl"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!cotacoes || cotacoes.length === 0) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-6a2 2 0 00-2 2v3a2 2 0 002 2h6a2 2 0 002-2v-3a2 2 0 00-2-2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Nenhuma cotação disponível
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    {emptyStateMessage}
                </p>
            </div>
        );
    }

    // Ordenar cotações por preço (menor primeiro)
    const cotacoesOrdenadas = [...cotacoes].sort((a, b) => {
        const precoA = parseFloat(a.preco.replace('R$', '').replace(',', '.').trim());
        const precoB = parseFloat(b.preco.replace('R$', '').replace(',', '.').trim());
        return precoA - precoB;
    });

    // Limitar ao número máximo de itens
    const cotacoesExibidas = cotacoesOrdenadas.slice(0, maxItems);

    // Determinar o número de colunas baseado na quantidade de cotações
    const getGridCols = () => {
        const count = cotacoesExibidas.length;
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
        if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
        if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
    };

    return (
        <div className={`w-full grid ${getGridCols()} gap-4`}>
            {cotacoesExibidas.map((cotacao: ICotacaoMinimaResponse, index: number) => {
                const isDisabled = isServiceDisabled(cotacao, disabledServices);
                return (
                    <CotacaoCard
                        key={`${cotacao.codigoServico}-${index}`}
                        cotacao={cotacao}
                        onSelect={isDisabled ? undefined : onSelectCotacao}
                        isSelected={selectedCotacao?.nomeServico === cotacao.nomeServico}
                        showSelectButton={showSelectButtons}
                        isBestPrice={index === 0 && !isDisabled}
                        compact={cotacoesExibidas.length > 3}
                        isDisabled={isDisabled}
                        disabledReason="Não disponível para múltiplos volumes"
                    />
                );
            })}
        </div>
    );
};
