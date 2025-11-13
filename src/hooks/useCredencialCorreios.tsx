import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CorreriosService } from "../services/CorreriosService";
import { toast } from "sonner";
import type { ICorreiosCredencial } from "../types/ICorreiosCredencial";

export const useCredencialCorreios = () => {

    const queryClient = useQueryClient();
    const service = new CorreriosService();
    const mutation = useMutation({
        mutationFn: async (id: any) => {
            return await service.updateCredencialAtivar(id!);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["credenciais"] });
            toast.success("Credencial ativada com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            console.log(error);
        },
    })

    const onAtivaCredencial = async (credencial: ICorreiosCredencial, setIsLoading: (isLoading: boolean) => void) => {
        try {
            setIsLoading(true);
            await mutation.mutateAsync(credencial.id!);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            console.error(error);
        }
    }

    return { onAtivaCredencial };
}