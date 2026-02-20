import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FreteService } from "../services/FreteService";
import type { ICotacaoMinimaResponse } from "../types/ICotacao";
import type { IEmbalagem } from "../types/IEmbalagem";
import { formatNumberString } from "../utils/formatCurrency";

export const useCotacao = () => {

    const queryClient = useQueryClient();
    const serviceFrete = new FreteService();

    const [cotacoes, setCotacoes] = useState<ICotacaoMinimaResponse[] | undefined>(undefined);
    const [isLoadingCotacao, setIsLoading] = useState(false);

    const mutation = useMutation({
        mutationFn: async (requestData: any) => {
            setIsLoading(true);
            console.log('🔄 Enviando requisição de cotação para API...');
            return serviceFrete.calculadoraFrete(requestData);
        },
        onSuccess: (response) => {
            setIsLoading(false);
            console.log('✅ Resposta da API recebida:', {
                status: 'success',
                totalCotacoes: response?.data?.length || 0,
                cotacoes: response?.data
            });
            queryClient.invalidateQueries({ queryKey: ["cotacao"] });
            
            if (response?.data && response.data.length > 0) {
                toast.success(`${response.data.length} opção(ões) de frete encontrada(s)`, { 
                    duration: 5000, 
                    position: "top-center" 
                });
            } else {
                toast.warning('Nenhuma opção de frete disponível para esta rota', { 
                    duration: 5000, 
                    position: "top-center" 
                });
            }
        },
        onError: (error: any) => {
            setIsLoading(false);
            console.error('❌ Erro na requisição de cotação:', error);
            
            const errorMessage = error?.message?.toLowerCase() || '';
            
            const isLimitError = errorMessage.includes('nenhum provedor') || 
                                 errorMessage.includes('cotação válida') ||
                                 errorMessage.includes('no freight') ||
                                 errorMessage.includes('non-2xx');
            
            const isDimensionError = errorMessage.includes('comprimento') ||
                                     errorMessage.includes('largura') ||
                                     errorMessage.includes('altura') ||
                                     errorMessage.includes('peso') ||
                                     errorMessage.includes('dimensão') ||
                                     errorMessage.includes('excede');

            if (isDimensionError) {
                toast.error('As dimensões ou peso informados excedem os limites das transportadoras. Correios: máx. 100cm e 30kg. Rodonaves: máx. 200cm e 200kg.', {
                    duration: 8000,
                    position: "top-center"
                });
            } else if (isLimitError) {
                toast.warning('Nenhuma transportadora disponível para esta rota com os dados informados. Verifique o CEP de origem/destino, peso e dimensões.', {
                    duration: 8000,
                    position: "top-center"
                });
            } else {
                toast.error(`Não foi possível calcular o frete. Verifique os dados e tente novamente.`, {
                    duration: 5000,
                    position: "top-center"
                });
            }
        },
    })

    useEffect(() => {
        // Sempre que for necessário resetar (ex: após cadastrar a emissão), atualize a dependência
        setCotacoes(undefined);
    }, []);

    const onGetCotacaoCorreios = async (
        cepOrigem: string, 
        cepDestino: string, 
        embalagem: IEmbalagem, 
        valorDeclarado?: string, 
        logisticaReversa: string = "N",
        remetente?: any
    ) => {
        try {
            // Busca o CPF/CNPJ em diferentes propriedades possíveis
            const cpfCnpj = remetente?.cpfCnpj || remetente?.documento || remetente?.cpf || remetente?.cnpj;
            
            const data: any = {
                cepOrigem,
                cepDestino,
                embalagem: {
                    altura: embalagem.altura.toString(),
                    largura: embalagem.largura.toString(),
                    comprimento: embalagem.comprimento.toString(),
                    peso: embalagem.peso.toString(),
                    diametro: embalagem.diametro.toString()
                },
                logisticaReversa,
                valorDeclarado: Number(formatNumberString(valorDeclarado || "0")),
                // Sempre inclui cpfCnpjLoja quando o remetente existe e tem cpfCnpj
                ...(cpfCnpj && {
                    cpfCnpjLoja: cpfCnpj,
                })
            }
            
            console.log('📦 Cotação enviada com CPF/CNPJ:', cpfCnpj ? 'Sim' : 'Não');
            const response = await mutation.mutateAsync(data);
            
            console.log('✅ Resposta da API de cotação:', response);
            console.log('📊 Quantidade de fretes retornados:', response.data?.length || 0);
            console.log('🚚 Fretes disponíveis:', response.data?.map((f: any) => f.nomeServico).join(', '));
            
            setCotacoes(response.data);
        } catch (error) {
            console.error('❌ Erro na cotação:', error);
            toast.error('Erro ao calcular frete. Tente novamente.');
        }
    }

    return { onGetCotacaoCorreios, cotacoes, setCotacoes, isLoadingCotacao };
}