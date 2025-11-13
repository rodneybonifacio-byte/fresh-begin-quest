import { Content } from "../../../Content";
import { useNavigate, useParams } from "react-router-dom";
import { RemetenteService } from "../../../../../services/RemetenteService";
import { toastError, toastSuccess } from "../../../../../utils/toastNotify";
import { useFetchQuery } from "../../../../../hooks/useFetchQuery";
import { LoadSpinner } from "../../../../../components/loading";
import { useLoadingSpinner } from "../../../../../providers/LoadingSpinnerContext";
import { ConfiguracaoTransportadoraCompleta, type TransportadoraConfig } from "../../../../../components/ConfiguracaoTransportadora";
import { useMemo } from "react";

// Tipo para o retorno da API que inclui as configurações de transportadoras
interface IRemetenteComConfiguracoes {
    id: string;
    nome: string;
    cpfCnpj: string;
    telefone: string;
    email: string;
    criadoEm: string;
    endereco: {
        id: string;
        cep: string;
        logradouro: string;
        numero: string;
        complemento: string;
        bairro: string;
        localidade: string;
        uf: string;
    };
    transportadoraConfiguracoes: {
        id: string;
        transportadora: string;
        clienteId: string;
        remetenteId: string;
        status: string;
        porcentagem: string;
        alturaMaxima: number;
        larguraMaxima: number;
        comprimentoMaximo: number;
        pesoMaximo: number;
        tipoAcrescimo: "VALOR" | "PERCENTUAL";
        valorAcrescimo: string;
    }[];
}

const ConfiguracoesRemetente = () => {
    const { setIsLoading } = useLoadingSpinner();
    const navigate = useNavigate();
    const service = new RemetenteService();

    // pegar o parametro do clienteId da URL
    const { clienteId, remetenteId } = useParams<{ clienteId: string, remetenteId: string }>();

    const { data: configuracao, isLoading } = useFetchQuery<IRemetenteComConfiguracoes | undefined>(
        ['configuracao', remetenteId, clienteId],
        async () => {
            if (!remetenteId || !clienteId) {
                navigate(-1);
                return;
            }
            return (await service.obterConfiguracaoPorId(remetenteId)) as unknown as IRemetenteComConfiguracoes;
        }
    );

    const handleSalvarConfiguracoes = async (configuracoes: TransportadoraConfig[]) => {
        // Filtra apenas configurações ativas e configuradas
        const configuracaoesSalvar = configuracoes.filter(c => c.ativo && c.valorAcrescimo > 0);
        
        if (configuracaoesSalvar.length === 0) {
            toastError("Configure pelo menos uma transportadora antes de salvar.");
            return; // Sai sem alterar loading para não re-renderizar
        }

        try {
            setIsLoading(true);

            // Prepara array de configurações para enviar para API
            const configsParaAPI = configuracaoesSalvar.map(config => ({
                remetenteId: remetenteId,
                clienteId: clienteId,
                transportadoraId: config.transportadoraId,
                alturaMaxima: config.alturaMaxima || 2,
                larguraMaxima: config.larguraMaxima || 2,
                comprimentoMaximo: config.comprimentoMaximo || 2,
                pesoMaximo: config.pesoMaximo || 100,
                tipoAcrescimo: config.tipoAcrescimo,
                valorAcrescimo: config.valorAcrescimo,
                porcentagem: config.tipoAcrescimo === 'PERCENTUAL' ? config.valorAcrescimo : undefined,
            }));

            // Envia todas as configurações em uma única chamada
            await service.createMultipleConfigs(configsParaAPI);

            // Não recarrega os dados para manter o formulário preenchido
            toastSuccess("Configurações do remetente salvas com sucesso!");
        } catch (error) {
            toastError("Erro ao salvar configurações do remetente. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    // Converte configuração existente para o formato do componente (memoizado para evitar re-renders)
    const initialConfiguracoes: TransportadoraConfig[] = useMemo(() => {
        if (!configuracao?.transportadoraConfiguracoes) return [];
        
        // Mapeia o array de transportadoraConfiguracoes da API
        const configs = configuracao.transportadoraConfiguracoes.map(config => ({
            id: config.id,
            transportadoraId: config.transportadora, // Será corrigido pelo componente quando carregar as transportadoras reais
            transportadoraNome: config.transportadora,
            ativo: config.status === "ATIVO",
            tipoAcrescimo: config.tipoAcrescimo as "VALOR" | "PERCENTUAL",
            valorAcrescimo: Number(config.valorAcrescimo) || Number(config.porcentagem) || 0,
            alturaMaxima: config.alturaMaxima,
            larguraMaxima: config.larguraMaxima,
            comprimentoMaximo: config.comprimentoMaximo,
            pesoMaximo: config.pesoMaximo,
        }));
        
        return configs;
    }, [configuracao]);

    return (
        <Content
            titulo="Configurações do Remetente"
            subTitulo="Gerencie as configurações de transportadoras do remetente selecionado"
            isToBack
        >
            {isLoading && <LoadSpinner mensagem="Carregando configurações..." />}
            {!isLoading && (
                <ConfiguracaoTransportadoraCompleta
                    onSave={handleSalvarConfiguracoes}
                    initialConfiguracoes={initialConfiguracoes}
                    showDimensions={true}
                    requireDimensions={true}
                    title="Configuração de Transportadoras do Remetente"
                    isLoading={isLoading}
                    showSaveButton={true}
                />
            )}
        </Content>
    );
};

export default ConfiguracoesRemetente;
