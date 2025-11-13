import type { ICotacaoMinimaResponse } from "../../../types/ICotacao";
import { getTransportadoraImage, getTransportadoraAltText } from "../../../utils/imageHelper";

interface ListaFretesDisponiveisProps {
    data: ICotacaoMinimaResponse[]
    onSelected: (frete: ICotacaoMinimaResponse) => void
    selected: ICotacaoMinimaResponse | null
}

export const ListaFretesDisponiveis = ({ onSelected, data, selected }: ListaFretesDisponiveisProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {data.map((frete: ICotacaoMinimaResponse, index) => {

                const isSelected = selected?.nomeServico === frete.nomeServico;

                return (
                    <label
                        key={index}
                        className={`relative flex flex-col items-center gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 
                        ${isSelected 
                            ? 'border-secondary bg-secondary/5 dark:border-secondary-dark dark:bg-secondary-dark/10 shadow-lg transform scale-105' 
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-gray-500'
                        } 
                        hover:shadow-md hover:-translate-y-1`}
                    >
                        <input
                            type="radio"
                            name="frete-selecionado"
                            checked={isSelected}
                            onChange={() => onSelected(frete)}
                            className="hidden"
                        />

                        {/* Bolinha de seleção maior no canto superior esquerdo */}
                        {isSelected && (
                            <div className="absolute -top-3 -left-3 w-7 h-7 bg-secondary dark:bg-secondary-dark rounded-full border-3 border-white dark:border-slate-800 flex items-center justify-center shadow-lg">
                                <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                        )}

                        {/* Container da imagem com fundo branco para melhor visibilidade */}
                        <div className="w-full flex justify-center items-center h-16 bg-white dark:bg-white rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-200">
                            <img
                                src={getTransportadoraImage(frete.imagem || '')}
                                alt={getTransportadoraAltText(frete.imagem || '')}
                                className="w-24 h-10 object-contain"
                            />
                        </div>
                        
                        {/* Conteúdo do card */}
                        <div className="text-center w-full space-y-2">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{frete.nomeServico}</h3>
                            <div className="flex justify-between items-center w-full px-2">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prazo</p>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{frete.prazo} {frete.prazo > 1 ? 'dias' : 'dia'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Valor</p>
                                    <p className="text-lg font-bold text-secondary dark:text-secondary-dark">R$ {frete.preco}</p>
                                </div>
                            </div>
                        </div>
                    </label>
                )
            })}
        </div>
    )
}
