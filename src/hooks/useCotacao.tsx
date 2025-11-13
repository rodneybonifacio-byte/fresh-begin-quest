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
            return serviceFrete.calculadoraFrete(requestData);
        },
        onSuccess: () => {
            setIsLoading(false);
            queryClient.invalidateQueries({ queryKey: ["cotacao"] });
            toast.success("Escolha uma opção de frete", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            setIsLoading(false);
            console.log(error);
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
            setCotacoes(response.data);
        } catch (error) {
            console.error('Erro na cotação:', error);
        }
    }

    return { onGetCotacaoCorreios, cotacoes, setCotacoes, isLoadingCotacao };
}