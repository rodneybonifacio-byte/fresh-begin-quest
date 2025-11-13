import { useState } from "react";
import type { ICotacaoMinimaResponse } from "../types/ICotacao";
import { CotacaoList } from "./CotacaoList";

interface CotacaoSelectorProps {
    cotacoes: ICotacaoMinimaResponse[];
    onCotacaoSelected: (cotacao: ICotacaoMinimaResponse) => void;
    isLoading?: boolean;
}

export const CotacaoSelector = ({ 
    cotacoes, 
    onCotacaoSelected, 
    isLoading = false 
}: CotacaoSelectorProps) => {
    const [selectedCotacao, setSelectedCotacao] = useState<ICotacaoMinimaResponse | undefined>();

    const handleSelectCotacao = (cotacao: ICotacaoMinimaResponse) => {
        setSelectedCotacao(cotacao);
        onCotacaoSelected(cotacao);
    };

    return (
        <div className="space-y-4">
            {selectedCotacao && (
                <div className="bg-primary/5 dark:bg-primary-dark/5 border border-primary/20 dark:border-primary-dark/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary dark:text-primary-dark mb-2">
                        Cotação Selecionada
                    </h3>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Serviço:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{selectedCotacao.nomeServico}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Valor:</span>
                            <p className="font-bold text-secondary dark:text-secondary-dark text-lg">{selectedCotacao.preco}</p>
                        </div>
                    </div>
                </div>
            )}
            
            <CotacaoList
                cotacoes={cotacoes}
                onSelectCotacao={handleSelectCotacao}
                selectedCotacao={selectedCotacao}
                showSelectButtons={true}
                isLoading={isLoading}
                emptyStateMessage="Nenhuma cotação disponível. Verifique os dados e tente novamente."
            />
        </div>
    );
};
