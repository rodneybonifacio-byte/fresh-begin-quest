import { useFetchQuery } from "./useFetchQuery";
import { DestinatarioService } from "../services/DestinatarioService";
import type { IDestinatario } from "../types/IDestinatario";

export const useDestinatario = () => {
    const service = new DestinatarioService();

    const { data: destinatarios, isLoading: isLoadingDestinatario, isError: isErrorDestinatario } = useFetchQuery<IDestinatario[]>(
        ['destinatarios'],
        async () => {
            const response = await service.getAll();
            return response.data ?? [];
        }
    );

    return { destinatarios, isLoadingDestinatario, isErrorDestinatario };
}
