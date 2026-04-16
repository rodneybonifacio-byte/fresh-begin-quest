import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmissaoService } from "../services/EmissaoService";
import type { IResponse } from "../types/IResponse";
import { useEffect, useState } from "react";
import type { IEmissao } from "../types/IEmissao";
import { openPDFInNewTab } from "../utils/pdfUtils";

type TipoEtiqueta = 'etiqueta' | 'declaracao' | 'merge';

export const useImprimirEtiquetaPDF = () => {

    const service = new EmissaoService();
    const [etiqueta, setEtiqueta] = useState<IResponse<{ nome: string, dados: string }>>();

    useEffect(() => {
        setEtiqueta(undefined);
    }, []);

    const mutationEtiqueta = useMutation({
        mutationFn: async (emissao: IEmissao) => {
            console.log('🔄 [API] Chamando imprimirEtiquetaCorreios com ID:', emissao.id);
            if (!emissao.id) {
                throw new Error('ID da emissão não encontrado');
            }
            return service.imprimirEtiquetaCorreios(emissao);
        },
        onSuccess: () => {
            import('@/components/EtiquetaGeradaToast').then(({ showEtiquetaGeradaToast }) => showEtiquetaGeradaToast());
        },
        onError: (error) => {
            console.error('❌ [API] Erro ao gerar etiqueta:', error);
            toast.error('Erro ao gerar etiqueta', { duration: 5000, position: "top-center" });
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
            console.log('🔄 [API] Chamando imprimirMergePDF com ID:', emissao.id);
            if (!emissao.id) {
                throw new Error('ID da emissão não encontrado');
            }
            return service.imprimirMergePDF(emissao);
        },
        onSuccess: () => {
            toast.success("Impressão gerada com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            console.error('❌ [API] Erro ao gerar merge PDF:', error);
            toast.error('Erro ao gerar PDF completo', { duration: 5000, position: "top-center" });
        },
    })

    const onEmissaoImprimir = async (
        data: IEmissao,
        typeEtiqueta: TipoEtiqueta,
        onIsLoadingCadastro: (isLoading: boolean) => void,
        onIsModalViewPDF?: (isOpen: boolean) => void // Agora é opcional
    ): Promise<IResponse<{ nome: string, dados: string }>> => {
        try {
            console.log('🖨️ onEmissaoImprimir: Iniciando impressão');
            console.log('📦 Dados da emissão recebida:', data);
            console.log('🆔 ID da emissão:', data?.id);
            console.log('📝 Tipo de etiqueta:', typeEtiqueta);
            
            onIsLoadingCadastro(true);
            let etiquetaResponse: IResponse<{ nome: string, dados: string }> = {} as IResponse<{ nome: string, dados: string }>;

            if (typeEtiqueta === 'etiqueta') {
                console.log('🔄 Chamando mutationEtiqueta.mutateAsync...');
                etiquetaResponse = await mutationEtiqueta.mutateAsync(data);
                console.log('✅ Resposta da etiqueta:', etiquetaResponse);
            }
            if (typeEtiqueta === 'declaracao') {
                console.log('🔄 Chamando mutationDeclaracao.mutateAsync...');
                etiquetaResponse = await mutationDeclaracao.mutateAsync(data);
                console.log('✅ Resposta da declaração:', etiquetaResponse);
            }
            if (typeEtiqueta === 'merge') {
                console.log('🔄 Chamando mutationMerge.mutateAsync...');
                etiquetaResponse = await mutationMerge.mutateAsync(data);
                console.log('✅ Resposta do merge:', etiquetaResponse);
            }

            // Não abre PDF automaticamente aqui - será aberto no Step5
            console.log('✅ PDF gerado com sucesso');

            onIsLoadingCadastro(false);
            setEtiqueta(etiquetaResponse);
            
            // Mantém compatibilidade com código existente, mas não é mais necessário
            onIsModalViewPDF?.(false);
            
            return etiquetaResponse;
        } catch (error) {
            console.error('❌ Erro ao imprimir etiqueta:', error);
            console.error('Stack:', (error as Error)?.stack);
            onIsLoadingCadastro(false);
            onIsModalViewPDF?.(false);
            throw error;
        }
    };

    // Função que abre automaticamente para impressão
    const onEmissaoVisualizarPDF = async (
        data: IEmissao,
        typeEtiqueta: TipoEtiqueta,
        onIsLoadingCadastro: (isLoading: boolean) => void
    ): Promise<void> => {
        try {
            console.log('🖨️ [IMPRESSÃO] Iniciando processo de impressão');
            console.log('📦 [IMPRESSÃO] Emissão:', data);
            console.log('🏷️ [IMPRESSÃO] Tipo:', typeEtiqueta);
            
            onIsLoadingCadastro(true);
            let etiquetaResponse: IResponse<{ nome: string, dados: string }> = {} as IResponse<{ nome: string, dados: string }>;

            console.log('🔄 [IMPRESSÃO] Chamando API...');
            if (typeEtiqueta === 'etiqueta')
                etiquetaResponse = await mutationEtiqueta.mutateAsync(data);
            if (typeEtiqueta === 'declaracao')
                etiquetaResponse = await mutationDeclaracao.mutateAsync(data);
            if (typeEtiqueta === 'merge')
                etiquetaResponse = await mutationMerge.mutateAsync(data);

            console.log('📄 [IMPRESSÃO] Resposta da API:', etiquetaResponse);
            console.log('📄 [IMPRESSÃO] Dados do PDF:', etiquetaResponse.data);
            console.log('📄 [IMPRESSÃO] Base64 length:', etiquetaResponse.data?.dados?.length);

            // Valida se o PDF foi gerado
            if (!etiquetaResponse.data?.dados || etiquetaResponse.data.dados.trim() === '') {
                console.error('❌ [IMPRESSÃO] PDF vazio ou não gerado!');
                toast.error('Erro ao gerar PDF. O arquivo está vazio.', { 
                    duration: 5000, 
                    position: "top-center" 
                });
                onIsLoadingCadastro(false);
                return;
            }

            // Abre o PDF em nova aba para visualização
            console.log('📄 [VISUALIZAR] Abrindo PDF em nova aba...');
            const fileName = etiquetaResponse.data.nome || `${typeEtiqueta}.pdf`;
            openPDFInNewTab(etiquetaResponse.data.dados, fileName);
            console.log('✅ [VISUALIZAR] PDF aberto em nova aba!');

            onIsLoadingCadastro(false);
        } catch (error) {
            console.error('❌ [IMPRESSÃO] Erro ao processar impressão:', error);
            console.error('Stack:', (error as Error)?.stack);
            toast.error('Erro ao gerar etiqueta para impressão', { 
                duration: 5000, 
                position: "top-center" 
            });
            onIsLoadingCadastro(false);
        }
    };

    return { onEmissaoImprimir, onEmissaoVisualizarPDF, etiqueta };
}