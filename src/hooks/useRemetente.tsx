import { useFetchQuery } from "../hooks/useFetchQuery";
import { RemetenteService } from "../services/RemetenteService";
import type { IRemetente } from "../types/IRemetente";
import type { IResponse } from "../types/IResponse";

interface UseRemetentesProps {
    clienteId?: string;
    page: number;
    perPage: number;
    service?: RemetenteService;
}

export function useRemetentes({
    clienteId,
    page,
    perPage,
    service = new RemetenteService(),
}: UseRemetentesProps) {
    return useFetchQuery<IResponse<IRemetente[]> | null>(
        ['remetentes', page, clienteId],
        async () => {
            if (!clienteId) return null;

            const params = {
                limit: perPage,
                offset: (page - 1) * perPage,
                clienteId,
            };

            const response = await service.getAll(params);
            return response ?? { data: [] };
        },
        {
            enabled: !!clienteId,
        }
    );
}
