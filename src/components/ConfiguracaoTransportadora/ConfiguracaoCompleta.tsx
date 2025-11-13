import { Check, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTransportadora } from '../../hooks/useTransportadora';
import { formatCurrency, formatNumberString } from '../../utils/formatCurrency';
import { toastError, toastSuccess } from '../../utils/toastNotify';
import { ButtonComponent } from '../button';
import { InputLabel } from '../input-label';

export interface TransportadoraConfig {
    id?: string;
    transportadoraId: string;
    transportadoraNome: string;
    ativo: boolean;
    tipoAcrescimo: 'VALOR' | 'PERCENTUAL';
    valorAcrescimo: number;
    alturaMaxima?: number;
    larguraMaxima?: number;
    comprimentoMaximo?: number;
    pesoMaximo?: number;
}

interface ConfiguracaoTransportadoraCompletaProps {
    // IDs necessários
    clienteId?: string;
    remetenteId?: string | null;
    
    // Callbacks
    onSave?: (configuracoes: TransportadoraConfig[]) => void;
    
    // Configurações iniciais (para carregar dados existentes)
    initialConfiguracoes?: TransportadoraConfig[];
    
    // Customização
    isLoading?: boolean;
    title?: string;
    showDimensions?: boolean;
    requireDimensions?: boolean;
    showSaveButton?: boolean; // Controla se mostra o botão "Salvar Todas as Configurações"
    autoSaveOnApply?: boolean; // Controla se chama onSave automaticamente ao aplicar configuração
}

export const ConfiguracaoTransportadoraCompleta = ({
    onSave,
    initialConfiguracoes = [],
    isLoading = false,
    title = "Configuração de Transportadoras",
    showDimensions = true,
    requireDimensions = false,
    showSaveButton = false,
    autoSaveOnApply = false
}: ConfiguracaoTransportadoraCompletaProps) => {
    // Estados principais
    const [configuracoes, setConfiguracoes] = useState<TransportadoraConfig[]>([]);
    const [transportadoraExpandida, setTransportadoraExpandida] = useState<string>('');
    const inicializadoRef = useRef(false);
    
    // Estados do formulário de configuração individual
    const [tipoAcrescimo, setTipoAcrescimo] = useState<'VALOR' | 'PERCENTUAL'>('PERCENTUAL');
    const [valorAcrescimo, setValorAcrescimo] = useState<string>('');
    const [porcentagemAcrescimo, setPorcentagemAcrescimo] = useState<string>('');
    const [alturaMaxima, setAlturaMaxima] = useState<string>('');
    const [larguraMaxima, setLarguraMaxima] = useState<string>('');
    const [comprimentoMaximo, setComprimentoMaximo] = useState<string>('');
    const [pesoMaximo, setPesoMaximo] = useState<string>('');

    // Busca todas as transportadoras disponíveis
    const { data: transportadorasData } = useTransportadora();

    // Inicializa configurações quando transportadoras são carregadas (apenas uma vez por componente)
    useEffect(() => {
        if (transportadorasData && !inicializadoRef.current) {
            const configsCompletas = transportadorasData.map(transportadora => {
                // Procura configuração existente pelo ID da transportadora OU pelo nome
                const configExistente = initialConfiguracoes.find(config => 
                    config.transportadoraId === transportadora.id || 
                    config.transportadoraNome === transportadora.nome
                );

                if (configExistente) {
                    return {
                        ...configExistente,
                        transportadoraId: transportadora.id, // Garante que o ID está correto
                        transportadoraNome: transportadora.nome, // Garante que o nome está correto
                    };
                }

                return {
                    transportadoraId: transportadora.id,
                    transportadoraNome: transportadora.nome,
                    ativo: false,
                    tipoAcrescimo: 'PERCENTUAL' as const,
                    valorAcrescimo: 0,
                    alturaMaxima: undefined,
                    larguraMaxima: undefined,
                    comprimentoMaximo: undefined,
                    pesoMaximo: undefined,
                };
            });

            setConfiguracoes(configsCompletas);
            inicializadoRef.current = true; // Marca como inicializado para evitar re-execuções
        }
    }, [transportadorasData, initialConfiguracoes]);

    // Atualiza o formulário quando uma transportadora é expandida
    useEffect(() => {
        if (transportadoraExpandida) {
            const config = configuracoes.find(c => c.transportadoraId === transportadoraExpandida);
            if (config) {
                setTipoAcrescimo(config.tipoAcrescimo);
                if (config.tipoAcrescimo === 'VALOR') {
                    setValorAcrescimo(formatCurrency(config.valorAcrescimo.toString()));
                    setPorcentagemAcrescimo('');
                } else {
                    setPorcentagemAcrescimo(config.valorAcrescimo.toString());
                    setValorAcrescimo('');
                }
                setAlturaMaxima(config.alturaMaxima ? config.alturaMaxima.toString() : '');
                setLarguraMaxima(config.larguraMaxima ? config.larguraMaxima.toString() : '');
                setComprimentoMaximo(config.comprimentoMaximo ? config.comprimentoMaximo.toString() : '');
                setPesoMaximo(config.pesoMaximo ? config.pesoMaximo.toString() : '');
            }
        } else {
            // Limpa o formulário quando fecha
            setTipoAcrescimo('PERCENTUAL');
            setValorAcrescimo('');
            setPorcentagemAcrescimo('');
            setAlturaMaxima('');
            setLarguraMaxima('');
            setComprimentoMaximo('');
            setPesoMaximo('');
        }
    }, [transportadoraExpandida, configuracoes]);

    const handleToggleTransportadora = (transportadoraId: string) => {
        const novasConfiguracoes = configuracoes.map(config => {
            if (config.transportadoraId === transportadoraId) {
                return { ...config, ativo: !config.ativo };
            }
            return config;
        });

        setConfiguracoes(novasConfiguracoes);
        
        // IMPORTANTE: Chama onSave sempre que há mudança no toggle
        // Isso garante que transportadoras desativadas sejam removidas imediatamente
        if (autoSaveOnApply) {
            onSave?.(novasConfiguracoes);
        }
    };

    const handleConfigurarTransportadora = (transportadoraId: string) => {
        // Só permite configurar se a transportadora estiver ativa
        const config = configuracoes.find(c => c.transportadoraId === transportadoraId);
        if (!config?.ativo) {
            return;
        }

        if (transportadoraExpandida === transportadoraId) {
            setTransportadoraExpandida('');
        } else {
            setTransportadoraExpandida(transportadoraId);
        }
    };

    const handleSalvarConfiguracao = async () => {
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
        if (requireDimensions && showDimensions) {
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

        // Atualiza a configuração da transportadora apenas localmente
        const novasConfiguracoes = configuracoes.map(config => {
            if (config.transportadoraId === transportadoraExpandida) {
                return {
                    ...config,
                    ativo: true,
                    tipoAcrescimo,
                    valorAcrescimo: valorFinal,
                    alturaMaxima: showDimensions ? (alturaMaxima ? parseFloat(alturaMaxima) : (requireDimensions ? 2 : undefined)) : undefined,
                    larguraMaxima: showDimensions ? (larguraMaxima ? parseFloat(larguraMaxima) : (requireDimensions ? 2 : undefined)) : undefined,
                    comprimentoMaximo: showDimensions ? (comprimentoMaximo ? parseFloat(comprimentoMaximo) : (requireDimensions ? 2 : undefined)) : undefined,
                    pesoMaximo: showDimensions ? (pesoMaximo ? parseFloat(pesoMaximo) : (requireDimensions ? 100 : undefined)) : undefined,
                };
            }
            return config;
        });

        setConfiguracoes(novasConfiguracoes);
        
        // Se autoSaveOnApply estiver habilitado, chama onSave para atualizar o formulário pai
        if (autoSaveOnApply) {
            onSave?.(novasConfiguracoes);
        }
        
        // Não fecha mais o formulário automaticamente - mantém os dados
        toastSuccess(showSaveButton 
            ? 'Configuração aplicada! Continue configurando outras transportadoras ou use "Salvar Todas as Configurações".'
            : 'Configuração aplicada! Use o botão "Salvar" do formulário para confirmar todas as alterações.'
        );
    };

    const handleSalvarTodasConfiguracoes = async () => {
        // Filtra apenas configurações ativas e configuradas
        const configuracoesValidas = configuracoes.filter(config => 
            config.ativo && config.valorAcrescimo > 0
        );

        if (configuracoesValidas.length === 0) {
            toastError('Configure pelo menos uma transportadora antes de salvar');
            return;
        }

        // Valida se todas as configurações ativas estão completas
        for (const config of configuracoesValidas) {
            if (requireDimensions && showDimensions) {
                if (!config.alturaMaxima || config.alturaMaxima < 2) {
                    toastError(`Altura máxima da ${config.transportadoraNome} deve ser pelo menos 2 cm`);
                    return;
                }
                if (!config.larguraMaxima || config.larguraMaxima < 2) {
                    toastError(`Largura máxima da ${config.transportadoraNome} deve ser pelo menos 2 cm`);
                    return;
                }
                if (!config.comprimentoMaximo || config.comprimentoMaximo < 2) {
                    toastError(`Comprimento máximo da ${config.transportadoraNome} deve ser pelo menos 2 cm`);
                    return;
                }
                if (!config.pesoMaximo || config.pesoMaximo < 100) {
                    toastError(`Peso máximo da ${config.transportadoraNome} deve ser pelo menos 100 gramas`);
                    return;
                }
            }
        }

        // Chama o callback com todas as configurações
        onSave?.(configuracoes);
    };

    const handleCancelar = () => {
        setTransportadoraExpandida('');
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header com informações */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Truck className="text-blue-600 dark:text-blue-400" size={20} />
                    <h4 className="text-blue-800 dark:text-blue-300 font-medium">{title}</h4>
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Habilite as transportadoras desejadas, configure os parâmetros de acréscimo no frete{showDimensions && ' e dimensões máximas'}. {showSaveButton ? 'Use "Salvar Todas as Configurações" ao final para confirmar todas as alterações.' : 'Use o botão "Salvar" do formulário para confirmar todas as alterações.'}
                </p>
            </div>

            {/* Lista de transportadoras com toggles */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">Transportadoras Disponíveis</h4>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-slate-600">
                    {configuracoes.map((config) => (
                        <div key={config.transportadoraId} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Truck className="text-gray-400 dark:text-slate-500" size={18} />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {config.transportadoraNome}
                                        </span>
                                    </div>
                                    
                                    {config.ativo && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                            <Check size={12} />
                                            Ativo
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleConfigurarTransportadora(config.transportadoraId)}
                                        disabled={!config.ativo}
                                        className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors text-sm font-medium ${
                                            config.ativo 
                                                ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700'
                                                : 'text-gray-400 dark:text-slate-600 cursor-not-allowed'
                                        }`}
                                    >
                                        {transportadoraExpandida === config.transportadoraId ? (
                                            <>
                                                <ChevronUp size={14} />
                                                Fechar
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown size={14} />
                                                {config.ativo ? 'Configurar' : 'Habilite para configurar'}
                                            </>
                                        )}
                                    </button>
                                    
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.ativo}
                                            onChange={() => handleToggleTransportadora(config.transportadoraId)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Preview das configurações quando ativo mas não expandido */}
                            {config.ativo && config.valorAcrescimo > 0 && transportadoraExpandida !== config.transportadoraId && (
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600 dark:text-slate-400">Acréscimo:</span>
                                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                                {config.tipoAcrescimo === 'VALOR' 
                                                    ? formatCurrency(config.valorAcrescimo.toString())
                                                    : `${config.valorAcrescimo}%`
                                                }
                                            </span>
                                        </div>
                                        
                                        {showDimensions && (config.alturaMaxima || config.larguraMaxima || config.comprimentoMaximo || config.pesoMaximo) && (
                                            <div>
                                                <span className="text-gray-600 dark:text-slate-400">Dimensões máx:</span>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                                    {config.alturaMaxima && `A: ${config.alturaMaxima}cm `}
                                                    {config.larguraMaxima && `L: ${config.larguraMaxima}cm `}
                                                    {config.comprimentoMaximo && `C: ${config.comprimentoMaximo}cm `}
                                                    {config.pesoMaximo && `P: ${config.pesoMaximo}g`}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Aviso para configurar quando ativo mas sem configuração */}
                            {config.ativo && config.valorAcrescimo === 0 && transportadoraExpandida !== config.transportadoraId && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                                        ⚠️ Transportadora ativa mas não configurada. Clique em "Configurar" para definir os parâmetros{showSaveButton ? ' e depois use "Salvar Todas as Configurações".' : ' e depois use o botão "Salvar" do formulário.'}
                                    </p>
                                </div>
                            )}

                            {/* Formulário de configuração (collapse) */}
                            {config.ativo && transportadoraExpandida === config.transportadoraId && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border-l-4 border-purple-500">
                                    <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                        Configurar {config.transportadoraNome}
                                    </h5>
                                    
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
                                                    Dimensões Máximas {requireDimensions ? '*' : '(opcional)'}
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
                                                    {requireDimensions 
                                                        ? 'Todas as dimensões são obrigatórias. O peso deve ser em gramas.'
                                                        : 'Peso deve ser em gramas. Ex: 100 gramas = 100'
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {/* Botões */}
                                        <div className="flex gap-3 pt-4">
                                            <ButtonComponent 
                                                type="button"
                                                onClick={handleSalvarConfiguracao}
                                                disabled={isLoading}
                                            >
                                                Aplicar Configuração
                                            </ButtonComponent>
                                            <button
                                                type="button"
                                                onClick={handleCancelar}
                                                className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Botão para salvar todas as configurações */}
            {showSaveButton && configuracoes.filter(c => c.ativo && c.valorAcrescimo > 0).length > 0 && (
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-600">
                    <ButtonComponent 
                        type="button"
                        onClick={handleSalvarTodasConfiguracoes}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        Salvar Todas as Configurações ({configuracoes.filter(c => c.ativo && c.valorAcrescimo > 0).length})
                    </ButtonComponent>
                </div>
            )}

            {/* Estado vazio */}
            {configuracoes.filter(c => c.ativo).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <Truck className="mx-auto mb-3 text-gray-300 dark:text-slate-600" size={48} />
                    <p className="text-lg font-medium mb-1">Nenhuma transportadora ativa</p>
                    <p className="text-sm">Habilite pelo menos uma transportadora usando os toggles acima.</p>
                </div>
            )}
        </div>
    );
};