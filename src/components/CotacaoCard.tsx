import type { ICotacaoMinimaResponse } from '../types/ICotacao';
import { getTransportadoraAltText, getTransportadoraImage } from '../utils/imageHelper';

interface CotacaoCardProps {
    cotacao: ICotacaoMinimaResponse;
    onSelect?: (cotacao: ICotacaoMinimaResponse) => void;
    isSelected?: boolean;
    showSelectButton?: boolean;
}

export const CotacaoCard = ({ cotacao, onSelect, isSelected = false, showSelectButton = false }: CotacaoCardProps) => {
    return (
        <div
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-700/20 p-4 gap-2 mb-4 w-full flex flex-col relative border transition-all duration-200 hover:shadow-lg dark:hover:shadow-slate-700/30 ${
                isSelected
                    ? 'border-primary dark:border-primary-dark ring-2 ring-primary/20 dark:ring-primary-dark/20'
                    : 'border-gray-200 dark:border-slate-600'
            }`}
        >
            <div className="gap-2 mb-2 w-full flex flex-col">
                <div className="flex items-center justify-between">
                    <div className="bg-white dark:bg-white p-2 rounded-md shadow-sm">
                        <img
                            src={getTransportadoraImage(cotacao.imagem || '')}
                            alt={getTransportadoraAltText(cotacao.imagem || '')}
                            className="w-32 h-8 object-contain"
                        />
                    </div>
                    {isSelected && (
                        <div className="flex items-center justify-center w-8 h-8 bg-primary dark:bg-primary-dark rounded-full">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Modalidade:</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cotacao.nomeServico}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 text-end">Prazo Estimado:</span>
                        <p className="text-sm font-medium text-end text-gray-900 dark:text-gray-100">
                            {cotacao.prazo} {cotacao.prazo > 1 ? 'dias' : 'dia'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-row justify-between items-center bottom-0 rodape">
                <span className="text-xl text-slate-600 dark:text-slate-300 font-semibold">Total Frete:</span>
                <span className="text-xl font-bold text-secondary dark:text-secondary-dark">{cotacao.preco}</span>
            </div>

            {showSelectButton && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect && onSelect(cotacao);
                        }}
                        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                                ? 'bg-primary dark:bg-primary-dark text-white'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary-dark/10 hover:text-primary dark:hover:text-primary-dark'
                        }`}
                    >
                        {isSelected ? 'Selecionado' : 'Selecionar'}
                    </button>
                </div>
            )}
        </div>
    );
};
