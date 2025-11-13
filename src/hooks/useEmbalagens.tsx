import { EmbalagemService } from "../services/EmbalagemService";
import { useFetchQuery } from "./useFetchQuery";
import type { IEmbalagem } from "../types/IEmbalagem";
import { useEffect, useState } from "react";

export const useEmbalagens = () => {
    const service = new EmbalagemService();
    const [embalagens, setEmbalagens] = useState<IEmbalagem[] | undefined>(undefined);

    const { data, isLoading: isLoadingEmbalagens, isError: isErrorEmbalagens } = useFetchQuery<IEmbalagem[]>(
        ['embalagens'],
        async () => {
            const response = await service.getAll();
            return response.data ?? [];
        }
    );

    useEffect(() => {
        setEmbalagens(data);
    }, [data]);

    return { embalagens, isLoadingEmbalagens, isErrorEmbalagens };
}
