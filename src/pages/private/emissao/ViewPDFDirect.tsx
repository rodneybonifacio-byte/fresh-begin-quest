import React, { useEffect } from "react";
import { viewPDF } from "../../../utils/pdfUtils";

interface ViewPDFDirectProps {
    base64: string;
    fileName?: string;
    onComplete?: () => void;
}

/**
 * Componente que abre o PDF automaticamente sem modal
 * Funciona igual ao botão imprimir, mas para visualização
 */
export const ViewPDFDirect: React.FC<ViewPDFDirectProps> = ({ 
    base64, 
    fileName = "documento.pdf", 
    onComplete 
}) => {
    useEffect(() => {
        if (base64 && base64.trim() !== "") {
            // Abre o PDF automaticamente
            viewPDF(base64, fileName);
            // Chama callback se fornecido
            onComplete?.();
        } else {
            console.error('Base64 do PDF está vazio');
            onComplete?.();
        }
    }, [base64, fileName, onComplete]);

    // Este componente não renderiza nada visualmente
    return null;
};