// src/hooks/useRemetenteById.ts
import { useFetchQuery } from "./useFetchQuery";
import { EmissaoService } from "../services/EmissaoService";

export function useCliente(id?: string) {
    return useFetchQuery<any>(
        ['cliente', id],
        async () => {
            const response = await new EmissaoService().getRemetenteEnderecoById(id!);
            return response.data;
        },
        { enabled: !!id }
    );
}
