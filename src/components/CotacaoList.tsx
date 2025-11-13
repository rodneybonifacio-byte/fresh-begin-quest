import type { ICotacaoMinimaResponse } from "../types/ICotacao";
import { CotacaoCard } from "./CotacaoCard";

interface CotacaoListProps {
    cotacoes: ICotacaoMinimaResponse[];
    onSelectCotacao?: (cotacao: ICotacaoMinimaResponse) => void;
    selectedCotacao?: ICotacaoMinimaResponse;
    showSelectButtons?: boolean;
    emptyStateMessage?: string;
    isLoading?: boolean;
}

export const CotacaoList = ({ 
    cotacoes, 
    onSelectCotacao, 
    selectedCotacao, 
    showSelectButtons = false,
    emptyStateMessage = "Nenhuma cotação encontrada",
    isLoading = false
}: CotacaoListProps) => {
    if (isLoading) {
        return (
            <div className="w-full grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-700/20 p-4 border border-gray-200 dark:border-slate-600 animate-pulse">
                        <div className="gap-2 mb-2 w-full flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="w-32 h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                                <div className="space-y-2">
                                    <div className="w-16 h-3 bg-gray-200 dark:bg-slate-700 rounded"></div>
                                    <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-20 h-3 bg-gray-200 dark:bg-slate-700 rounded"></div>
                                    <div className="w-16 h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row justify-between items-center">
                            <div className="w-20 h-6 bg-gray-200 dark:bg-slate-700 rounded"></div>
                            <div className="w-24 h-6 bg-gray-200 dark:bg-slate-700 rounded"></div>
                        </div>
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

    return (
        <div className="w-full grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {cotacoes.map((cotacao: ICotacaoMinimaResponse, index: number) => (
                <CotacaoCard
                    key={index}
                    cotacao={cotacao}
                    onSelect={onSelectCotacao}
                    isSelected={selectedCotacao?.nomeServico === cotacao.nomeServico}
                    showSelectButton={showSelectButtons}
                />
            ))}
        </div>
    );
};
