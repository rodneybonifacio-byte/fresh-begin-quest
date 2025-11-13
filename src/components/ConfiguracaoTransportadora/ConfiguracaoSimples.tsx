import { useEffect, useState } from 'react';
import { InputLabel } from '../input-label';
import { ButtonComponent } from '../button';
import { formatCurrency, formatNumberString } from '../../utils/formatCurrency';
import { toastError, toastSuccess } from '../../utils/toastNotify';

export interface ConfiguracaoTransportadoraData {
    alturaMaxima?: number;
    larguraMaxima?: number;
    comprimentoMaximo?: number;
    pesoMaximo?: number;
    tipoAcrescimo: 'VALOR' | 'PERCENTUAL';
    valorAcrescimo: number;
    clienteId: string;
    remetenteId?: string | null;
}

interface ConfiguracaoTransportadoraProps {
    // Dados iniciais para carregar no formulário
    initialData?: ConfiguracaoTransportadoraData;
    
    // IDs necessários
    clienteId: string;
    remetenteId?: string | null;
    
    // Callbacks
    onSave: (data: ConfiguracaoTransportadoraData) => Promise<void>;
    onCancel?: () => void;
    
    // Customização
    isLoading?: boolean;
    title?: string;
    showDimensions?: boolean;
    requireDimensions?: boolean;
}

export const ConfiguracaoTransportadora = ({
    initialData,
    clienteId,
    remetenteId = null,
    onSave,
    onCancel,
    isLoading = false,
    title = "Configuração de Acréscimo",
    showDimensions = true,
    requireDimensions = false
}: ConfiguracaoTransportadoraProps) => {
    // Estados do formulário
    const [tipoAcrescimo, setTipoAcrescimo] = useState<'VALOR' | 'PERCENTUAL'>('PERCENTUAL');
    const [valorAcrescimo, setValorAcrescimo] = useState<string>('');
    const [porcentagemAcrescimo, setPorcentagemAcrescimo] = useState<string>('');
    const [alturaMaxima, setAlturaMaxima] = useState<string>('');
    const [larguraMaxima, setLarguraMaxima] = useState<string>('');
    const [comprimentoMaximo, setComprimentoMaximo] = useState<string>('');
    const [pesoMaximo, setPesoMaximo] = useState<string>('');

    // Carrega dados iniciais
    useEffect(() => {
        if (initialData) {
            setTipoAcrescimo(initialData.tipoAcrescimo);
            if (initialData.tipoAcrescimo === 'VALOR') {
                setValorAcrescimo(formatCurrency(initialData.valorAcrescimo.toString()));
                setPorcentagemAcrescimo('');
            } else {
                setPorcentagemAcrescimo(initialData.valorAcrescimo.toString());
                setValorAcrescimo('');
            }
            setAlturaMaxima(initialData.alturaMaxima ? initialData.alturaMaxima.toString() : '');
            setLarguraMaxima(initialData.larguraMaxima ? initialData.larguraMaxima.toString() : '');
            setComprimentoMaximo(initialData.comprimentoMaximo ? initialData.comprimentoMaximo.toString() : '');
            setPesoMaximo(initialData.pesoMaximo ? initialData.pesoMaximo.toString() : '');
        }
    }, [initialData]);

    const handleSalvar = async () => {
        // Validações
        let valorFinal = 0;
        
        if (tipoAcrescimo === 'VALOR') {
            if (!valorAcrescimo) {
                toastError('Informe o valor do acréscimo');
                return;
            }
            valorFinal = parseFloat(formatNumberString(valorAcrescimo));
            if (isNaN(valorFinal) || valorFinal <= 0) {
                toastError('Valor do acréscimo deve ser maior que zero');
                return;
            }
        } else {
            if (!porcentagemAcrescimo) {
                toastError('Informe a porcentagem do acréscimo');
                return;
            }
            valorFinal = parseFloat(porcentagemAcrescimo);
            if (isNaN(valorFinal) || valorFinal <= 0 || valorFinal > 100) {
                toastError('Porcentagem deve ser entre 1 e 100');
                return;
            }
        }

        // Validações de dimensões se obrigatórias
        if (requireDimensions) {
            if (!alturaMaxima || parseFloat(alturaMaxima) < 2) {
                toastError('Altura máxima deve ser pelo menos 2 cm');
                return;
            }
            if (!larguraMaxima || parseFloat(larguraMaxima) < 2) {
                toastError('Largura máxima deve ser pelo menos 2 cm');
                return;
            }
            if (!comprimentoMaximo || parseFloat(comprimentoMaximo) < 2) {
                toastError('Comprimento máximo deve ser pelo menos 2 cm');
                return;
            }
            if (!pesoMaximo || parseFloat(pesoMaximo) < 100) {
                toastError('Peso máximo deve ser pelo menos 100 gramas');
                return;
            }
        }

        // Prepara dados para envio
        const data: ConfiguracaoTransportadoraData = {
            clienteId,
            remetenteId,
            tipoAcrescimo,
            valorAcrescimo: valorFinal,
            alturaMaxima: alturaMaxima ? parseFloat(alturaMaxima) : undefined,
            larguraMaxima: larguraMaxima ? parseFloat(larguraMaxima) : undefined,
            comprimentoMaximo: comprimentoMaximo ? parseFloat(comprimentoMaximo) : undefined,
            pesoMaximo: pesoMaximo ? parseFloat(pesoMaximo) : undefined,
        };

        try {
            await onSave(data);
            toastSuccess('Configuração salva com sucesso!');
        } catch (error) {
            toastError('Erro ao salvar configuração. Tente novamente.');
            console.error('Erro ao salvar:', error);
        }
    };

    const handleCancelar = () => {
        // Limpa o formulário
        setTipoAcrescimo('PERCENTUAL');
        setValorAcrescimo('');
        setPorcentagemAcrescimo('');
        setAlturaMaxima('');
        setLarguraMaxima('');
        setComprimentoMaximo('');
        setPesoMaximo('');
        
        onCancel?.();
    };

    return (
        <div className="bg-white dark:bg-slate-800 w-full p-6 gap-4 space-y-4 rounded-xl border dark:border-slate-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
            
            <div className="space-y-4">
                {/* Configuração de Acréscimo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                        Tipo de Acréscimo
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="VALOR"
                                checked={tipoAcrescimo === 'VALOR'}
                                onChange={(e) => setTipoAcrescimo(e.target.value as 'VALOR' | 'PERCENTUAL')}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-slate-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-slate-300">Valor Fixo (R$)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="PERCENTUAL"
                                checked={tipoAcrescimo === 'PERCENTUAL'}
                                onChange={(e) => setTipoAcrescimo(e.target.value as 'VALOR' | 'PERCENTUAL')}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-slate-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-slate-300">Porcentagem (%)</span>
                        </label>
                    </div>
                </div>

                {/* Campo de Valor */}
                {tipoAcrescimo === 'VALOR' ? (
                    <InputLabel
                        labelTitulo="Valor do Acréscimo (R$)"
                        type="text"
                        placeholder="0,00"
                        value={valorAcrescimo}
                        onChange={(e) => {
                            const valor = formatCurrency(e.target.value);
                            setValorAcrescimo(valor);
                        }}
                    />
                ) : (
                    <InputLabel
                        labelTitulo="Porcentagem do Acréscimo (%)"
                        type="number"
                        placeholder="0"
                        min="1"
                        max="100"
                        value={porcentagemAcrescimo}
                        onChange={(e) => setPorcentagemAcrescimo(e.target.value)}
                    />
                )}

                {/* Dimensões (se habilitado) */}
                {showDimensions && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                            Dimensões Máximas{requireDimensions ? ' *' : ' (opcional)'}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <InputLabel
                                labelTitulo="Altura (cm)"
                                type="number"
                                placeholder="0"
                                value={alturaMaxima}
                                onChange={(e) => setAlturaMaxima(e.target.value)}
                            />
                            <InputLabel
                                labelTitulo="Largura (cm)"
                                type="number"
                                placeholder="0"
                                value={larguraMaxima}
                                onChange={(e) => setLarguraMaxima(e.target.value)}
                            />
                            <InputLabel
                                labelTitulo="Comprimento (cm)"
                                type="number"
                                placeholder="0"
                                value={comprimentoMaximo}
                                onChange={(e) => setComprimentoMaximo(e.target.value)}
                            />
                            <InputLabel
                                labelTitulo="Peso (g)"
                                type="number"
                                placeholder="0"
                                value={pesoMaximo}
                                onChange={(e) => setPesoMaximo(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                            Peso deve ser em gramas. Ex: 100 gramas = 100
                        </p>
                    </div>
                )}

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                    <ButtonComponent 
                        onClick={handleSalvar}
                        disabled={isLoading}
                    >
                        Salvar
                    </ButtonComponent>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={handleCancelar}
                            className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};