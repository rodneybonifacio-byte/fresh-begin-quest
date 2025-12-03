import type { ICotacaoMinimaResponse } from "../types/ICotacao";

interface CotacaoListSimplesProps {
    cotacoes: ICotacaoMinimaResponse[];
    onSelectCotacao?: (cotacao: ICotacaoMinimaResponse) => void;
    selectedCotacao?: ICotacaoMinimaResponse;
    isLoading?: boolean;
}

export const CotacaoListSimples = ({ 
    cotacoes, 
    onSelectCotacao, 
    selectedCotacao,
    isLoading = false
}: CotacaoListSimplesProps) => {
    if (isLoading) {
        return (
            <div className="w-full space-y-3 mt-6">
                <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 animate-pulse">
                        <div className="flex justify-between items-center">
                            <div className="space-y-2">
                                <div className="h-5 w-24 bg-muted rounded"></div>
                                <div className="h-4 w-20 bg-muted rounded"></div>
                            </div>
                            <div className="h-8 w-24 bg-muted rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!cotacoes || cotacoes.length === 0) {
        return null;
    }

    // Ordenar cotações por preço (menor primeiro)
    const cotacoesOrdenadas = [...cotacoes].sort((a, b) => {
        const precoA = parseFloat(a.preco.replace('R$', '').replace(',', '.').trim());
        const precoB = parseFloat(b.preco.replace('R$', '').replace(',', '.').trim());
        return precoA - precoB;
    });

    return (
        <div className="w-full space-y-3 mt-6">
            <h3 className="text-sm font-medium text-foreground">Fretes disponíveis:</h3>
            
            <div className="space-y-3">
                {cotacoesOrdenadas.map((cotacao: ICotacaoMinimaResponse, index: number) => {
                    const isSelected = selectedCotacao?.codigoServico === cotacao.codigoServico;
                    
                    return (
                        <div
                            key={`${cotacao.codigoServico}-${index}`}
                            onClick={() => onSelectCotacao && onSelectCotacao(cotacao)}
                            className={`
                                bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 
                                border-2 transition-all duration-200 cursor-pointer
                                ${isSelected 
                                    ? 'border-primary ring-2 ring-primary/20' 
                                    : 'border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700'
                                }
                            `}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-base font-bold text-foreground">
                                        {cotacao.nomeServico}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {cotacao.prazo} {cotacao.prazo === 1 ? 'dia útil' : 'dias úteis'}
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-foreground">
                                    R$ {cotacao.preco.replace('R$', '').trim()}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
