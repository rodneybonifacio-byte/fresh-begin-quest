import { useFetchQuery } from "./useFetchQuery";
import { useEffect, useState } from "react";
import { PlanoService } from "../services/PlanoService";
import type { IPlano } from "../types/IPlano";

export const usePlanos = () => {
    const service = new PlanoService();
    const [planos, setPlanos] = useState<IPlano[] | undefined>(undefined);

    const { data, isLoading: isLoadingPlanos, isError: isErrorPlanos } = useFetchQuery<IPlano[]>(
        ['planos'],
        async () => {
            const response = await service.getAll();
            return response.data ?? [];
        }
    );

    useEffect(() => {
        setPlanos(data);
    }, [data]);

    return { planos, isLoadingPlanos, isErrorPlanos };
}
