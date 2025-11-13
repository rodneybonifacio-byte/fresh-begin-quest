import { useMutation } from "@tanstack/react-query";
import { ViacepService } from "../services/viacepService";
import type { ViacepAddress } from "../types/viacepAddress";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const useAddress = () => {

    const service = new ViacepService();
    const [response, setResponse] = useState<ViacepAddress | undefined>(undefined);


    useEffect(() => {
        setResponse(undefined);
    }, []);

    const mutation = useMutation({
        mutationFn: async (cep: string) => {
            return service.consulta(cep);
        },
        onSuccess: () => {
            toast.success("Endereço buscado com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            toast.error("Erro ao buscar endereço!", { duration: 5000, position: "top-center" });
            console.log(error);
        },
    })

    const onBuscaCep = async (
        cep: string,
        onIsLoadingCadastro: (isLoading: boolean) => void,
    ): Promise<ViacepAddress | undefined> => {
        try {
            const cepFormatado = cep.replace(/[^0-9]/g, '');

            if (cepFormatado.length === 8 || /^[0-9]{8}$/.test(cepFormatado)) {
                onIsLoadingCadastro(true);
                const response = await mutation.mutateAsync(cepFormatado);
                setResponse(response);
                onIsLoadingCadastro(false);
                return response;
            }
        } catch (error) {
            console.error(error);
            onIsLoadingCadastro(false);
            throw error;
        }
    };


    return { onBuscaCep, response };
}