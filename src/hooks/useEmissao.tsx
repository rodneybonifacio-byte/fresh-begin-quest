import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmissaoService } from "../services/EmissaoService";
import type { IEmissao } from "../types/IEmissao";
import type { IResponse } from "../types/IResponse";
import { useFetchQuery } from "./useFetchQuery";
import { FreteService } from "../services/FreteService";

export const useEmissao = () => {

    const queryClient = useQueryClient();
    const service = new EmissaoService();
    const freteService = new FreteService();

    const mutation = useMutation({
        mutationFn: async (requestData: IEmissao) => {
            return freteService.create(requestData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["emissoes"] });
            toast.success("Emissão cadastrada com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            console.log(error);
        },
    })

    const onEmissaoCadastro = async (data: IEmissao, onIsLoadingCadastro: (isLoading: boolean) => void): Promise<IEmissao> => {
        try {
            onIsLoadingCadastro(true);
            console.log('📤 onEmissaoCadastro: Iniciando criação da emissão');
            const response = await mutation.mutateAsync(data) as IResponse<IEmissao>;
            console.log('📦 onEmissaoCadastro: Resposta completa:', response);
            console.log('📄 onEmissaoCadastro: Dados da emissão:', response?.data);
            onIsLoadingCadastro(false);
            // Retorna a emissão criada com o ID
            return response.data;
        } catch (error) {
            console.error('❌ onEmissaoCadastro: Erro ao criar emissão:', error);
            onIsLoadingCadastro(false);
            throw error;
        }
    }

    // Hook para buscar remetente por ID
    const getRemetenteEnderecoById = (id: string | undefined) => {
        return useFetchQuery<any>(
            ['remetente', id],
            async () => {
                if (!id) throw new Error("ID não informado");
                const response = await service.getRemetenteEnderecoById(id);
                return response.data;
            },
            {
                enabled: !!id // só executa se o ID for válido
            }
        );
    };

    return { onEmissaoCadastro, getRemetenteEnderecoById };
}