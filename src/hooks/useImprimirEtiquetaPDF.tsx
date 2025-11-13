import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmissaoService } from "../services/EmissaoService";
import type { IResponse } from "../types/IResponse";
import { useEffect, useState } from "react";
import type { IEmissao } from "../types/IEmissao";
import { viewPDF } from "../utils/pdfUtils";

type TipoEtiqueta = 'etiqueta' | 'declaracao' | 'merge';

export const useImprimirEtiquetaPDF = () => {

    const service = new EmissaoService();
    const [etiqueta, setEtiqueta] = useState<IResponse<{ nome: string, dados: string }>>();

    useEffect(() => {
        setEtiqueta(undefined);
    }, []);

    const mutationEtiqueta = useMutation({
        mutationFn: async (emissao: IEmissao) => {
            return service.imprimirEtiquetaCorreios(emissao);
        },
        onSuccess: () => {
            toast.success("Etiqueta gerada com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            console.log(error);
        },
    })

    const mutationDeclaracao = useMutation({
        mutationFn: async (emissao: IEmissao) => {
            return service.imprimirDeclaracaoConteudoPDF(emissao);
        },
        onSuccess: () => {
            toast.success("Declaração gerada com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            console.log(error);
        },
    })

    const mutationMerge = useMutation({
        mutationFn: async (emissao: IEmissao) => {
            return service.imprimirMergePDF(emissao);
        },
        onSuccess: () => {
            toast.success("Impressão gerada com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            console.log(error);
        },
    })

    const onEmissaoImprimir = async (
        data: IEmissao,
        typeEtiqueta: TipoEtiqueta,
        onIsLoadingCadastro: (isLoading: boolean) => void,
        onIsModalViewPDF?: (isOpen: boolean) => void // Agora é opcional
    ): Promise<IResponse<{ nome: string, dados: string }>> => {
        try {
            onIsLoadingCadastro(true);
            let etiquetaResponse: IResponse<{ nome: string, dados: string }> = {} as IResponse<{ nome: string, dados: string }>;

            if (typeEtiqueta === 'etiqueta')
                etiquetaResponse = await mutationEtiqueta.mutateAsync(data);
            if (typeEtiqueta === 'declaracao')
                etiquetaResponse = await mutationDeclaracao.mutateAsync(data);
            if (typeEtiqueta === 'merge')
                etiquetaResponse = await mutationMerge.mutateAsync(data);

            // Abre o PDF automaticamente em nova janela (igual ao imprimir)
            if (etiquetaResponse.data?.dados) {
                const fileName = etiquetaResponse.data.nome || `${typeEtiqueta}.pdf`;
                viewPDF(etiquetaResponse.data.dados, fileName);
            }

            onIsLoadingCadastro(false);
            setEtiqueta(etiquetaResponse);
            
            // Mantém compatibilidade com código existente, mas não é mais necessário
            onIsModalViewPDF?.(false);
            
            return etiquetaResponse;
        } catch (error) {
            console.error(error);
            onIsLoadingCadastro(false);
            onIsModalViewPDF?.(false);
            throw error;
        }
    };

    // Nova função simplificada que abre automaticamente
    const onEmissaoVisualizarPDF = async (
        data: IEmissao,
        typeEtiqueta: TipoEtiqueta,
        onIsLoadingCadastro: (isLoading: boolean) => void
    ): Promise<void> => {
        try {
            onIsLoadingCadastro(true);
            let etiquetaResponse: IResponse<{ nome: string, dados: string }> = {} as IResponse<{ nome: string, dados: string }>;

            if (typeEtiqueta === 'etiqueta')
                etiquetaResponse = await mutationEtiqueta.mutateAsync(data);
            if (typeEtiqueta === 'declaracao')
                etiquetaResponse = await mutationDeclaracao.mutateAsync(data);
            if (typeEtiqueta === 'merge')
                etiquetaResponse = await mutationMerge.mutateAsync(data);

            // Abre o PDF automaticamente em nova janela
            if (etiquetaResponse.data?.dados) {
                const fileName = etiquetaResponse.data.nome || `${typeEtiqueta}.pdf`;
                viewPDF(etiquetaResponse.data.dados, fileName);
            }

            onIsLoadingCadastro(false);
        } catch (error) {
            console.error(error);
            onIsLoadingCadastro(false);
        }
    };

    return { onEmissaoImprimir, onEmissaoVisualizarPDF, etiqueta };
}