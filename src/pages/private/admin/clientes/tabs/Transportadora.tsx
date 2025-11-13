import { useFormContext } from 'react-hook-form';
import type { FormDataCliente } from '../../../../../utils/schames/clientes';
import { ConfiguracaoTransportadoraCompleta, type TransportadoraConfig } from '../../../../../components/ConfiguracaoTransportadora';

export const Transportadora = () => {
    const { setValue, watch } = useFormContext<FormDataCliente>();
    
    // Carrega configurações do formulário
    const transportadoraConfigs = watch('transportadoraConfiguracoes') || [];

    const handleSalvarConfiguracoes = (configuracoes: TransportadoraConfig[]) => {
        
        // Filtra APENAS configurações ATIVAS com configuração válida
        // Remove completamente as desativadas e as que não têm configuração
        const configsAtivas = configuracoes
            .filter(config => {
                return config.ativo === true; // Mudança: não filtra por valorAcrescimo aqui
            })
            .map(config => ({
                id: config.id || Date.now().toString(),
                transportadora: config.transportadoraNome,
                transportadoraId: config.transportadoraId,
                ativo: true, // Sempre true pois já filtrou apenas os ativos
                tipoAcrescimo: config.tipoAcrescimo,
                valorAcrescimo: Number(config.valorAcrescimo) || 0,
                porcentagem: config.tipoAcrescimo === 'PERCENTUAL' ? Number(config.valorAcrescimo) : undefined,
                alturaMaxima: config.alturaMaxima ? Number(config.alturaMaxima) : undefined,
                larguraMaxima: config.larguraMaxima ? Number(config.larguraMaxima) : undefined,
                comprimentoMaximo: config.comprimentoMaximo ? Number(config.comprimentoMaximo) : undefined,
                pesoMaximo: config.pesoMaximo ? Number(config.pesoMaximo) : undefined,
            }));
        setValue('transportadoraConfiguracoes', configsAtivas, { shouldValidate: true });
    };

    // Converte dados do formulário para o formato do componente
    // Aqui carregamos TODAS as configurações (ativas e inativas) para exibição
    const initialConfiguracoes: TransportadoraConfig[] = transportadoraConfigs.map(config => ({
        id: config.id,
        transportadoraId: config.transportadoraId || '',
        transportadoraNome: config.transportadora || '',
        ativo: config.ativo ?? true, // Mantém o estado atual (ativo/inativo)
        tipoAcrescimo: (config.tipoAcrescimo || 'PERCENTUAL') as 'VALOR' | 'PERCENTUAL',
        valorAcrescimo: config.valorAcrescimo || config.porcentagem || 0,
        alturaMaxima: config.alturaMaxima,
        larguraMaxima: config.larguraMaxima,
        comprimentoMaximo: config.comprimentoMaximo,
        pesoMaximo: config.pesoMaximo,
    }));

    return (
        <ConfiguracaoTransportadoraCompleta
            onSave={handleSalvarConfiguracoes}
            initialConfiguracoes={initialConfiguracoes}
            showDimensions={true}
            requireDimensions={false}
            title="Configuração de Transportadoras"
            showSaveButton={false}
            autoSaveOnApply={true}
        />
    );
};
