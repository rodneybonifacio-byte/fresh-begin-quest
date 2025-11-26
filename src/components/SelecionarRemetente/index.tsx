import { useState } from 'react';
import { ArrowRightLeft, User, MapPin, RefreshCw } from 'lucide-react';
import { ButtonComponent } from '../button';
import { ModalListaRemetente } from '../../pages/private/remetente/ModalListaRemetente';
import { useUsuarioDados } from '../../hooks/useUsuarioDados';
import { toast } from 'sonner';

interface Remetente {
    id: string;
    nome: string;
    endereco?: {
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        cep?: string;
    };
}

interface SelecionarRemetenteProps {
    remetenteSelecionado: Remetente | null;
    onSelect: (remetente: Remetente) => void;
    titulo?: string;
    showChangeButton?: boolean;
    variant?: 'default' | 'compact';
    className?: string;
}

export const SelecionarRemetente = ({
    remetenteSelecionado,
    onSelect,
    titulo = "Remetente:",
    showChangeButton = true,
    variant = 'default',
    className = ""
}: SelecionarRemetenteProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { refetch, isLoading } = useUsuarioDados(false);

    const handleSyncData = async () => {
        try {
            toast.info('Sincronizando dados do backend...');
            const result = await refetch();
            
            // Se não tem remetente selecionado E existem remetentes, seleciona o primeiro
            if (!remetenteSelecionado && result?.data?.remetentes && result.data.remetentes.length > 0) {
                const primeiroRemetente = result.data.remetentes[0];
                console.log('✅ Auto-selecionando primeiro remetente:', primeiroRemetente.nome);
                onSelect(primeiroRemetente);
                toast.success('Primeiro remetente selecionado automaticamente!');
            } else {
                toast.success('Dados sincronizados com sucesso!');
            }
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
            toast.error('Erro ao sincronizar dados');
        }
    };

    const handleSelectRemetente = (remetente: Remetente) => {
        onSelect(remetente);
        setIsModalOpen(false);
    };

    const formatEndereco = (endereco?: Remetente['endereco']) => {
        if (!endereco) return 'Endereço não informado';
        
        const partes = [
            endereco.logradouro,
            endereco.numero,
            endereco.complemento,
            endereco.bairro,
            `${endereco.localidade}/${endereco.uf}`
        ].filter(Boolean);
        
        return partes.join(', ');
    };

    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg ${className}`}>
                <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <User size={16} />
                    <span className="text-sm font-medium">Origem:</span>
                </div>
                
                {remetenteSelecionado ? (
                    <div className="flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {remetenteSelecionado.nome}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                                {formatEndereco(remetenteSelecionado.endereco)}
                            </span>
                        </div>
                        
                        {showChangeButton && (
                            <ButtonComponent
                                variant="primary"
                                border="outline"
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="p-2"
                            >
                                <ArrowRightLeft size={14} />
                            </ButtonComponent>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-between">
                        <span className="text-gray-500 dark:text-slate-400 text-sm">
                            Selecione um remetente
                        </span>
                        <ButtonComponent
                            variant="primary"
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="text-sm px-3 py-1"
                        >
                            Selecionar
                        </ButtonComponent>
                    </div>
                )}

                <ModalListaRemetente
                    isOpen={isModalOpen}
                    onCancel={() => setIsModalOpen(false)}
                    onSelect={handleSelectRemetente}
                />
            </div>
        );
    }

    // Variant padrão (default)
    return (
        <div className={`flex flex-row w-full gap-2 ${className}`}>
            <div className="flex flex-col w-full gap-2">
                <div className="flex items-center justify-between">
                    <h1 className="font-semibold text-2xl text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <User size={24} className="text-blue-600 dark:text-blue-400" />
                        {titulo}
                    </h1>
                    <ButtonComponent
                        variant="ghost"
                        type="button"
                        onClick={handleSyncData}
                        disabled={isLoading}
                        className="text-xs px-2 py-1 flex items-center gap-1"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        {isLoading ? 'Sincronizando...' : 'Atualizar'}
                    </ButtonComponent>
                </div>
                
                {remetenteSelecionado ? (
                    <div className="flex flex-col w-full p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                                {remetenteSelecionado.nome}
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-slate-300">
                                {formatEndereco(remetenteSelecionado.endereco)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col w-full p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-700 dark:text-yellow-400 text-sm">
                                ⚠️ Nenhum remetente selecionado
                            </span>
                        </div>
                        <span className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                            Clique no botão ao lado para selecionar um remetente
                        </span>
                    </div>
                )}
            </div>
            
            {showChangeButton && (
                <div className="flex flex-col justify-end">
                    <ButtonComponent
                        variant="primary"
                        border="outline"
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="p-3"
                    >
                        <ArrowRightLeft className="w-5 h-5" />
                    </ButtonComponent>
                </div>
            )}

            <ModalListaRemetente
                isOpen={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onSelect={handleSelectRemetente}
            />
        </div>
    );
};