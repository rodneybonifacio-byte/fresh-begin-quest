import React from "react";
import { Download } from "lucide-react";
import { ModalCustom } from "../../../components/modal";
import { ButtonComponent } from "../../../components/button";
import { downloadPDF } from "../../../utils/pdfUtils";

interface ModalViewPDFProps {
    isOpen: boolean;
    base64: string;
    fileName?: string;
    onCancel: () => void;
}

export const ModalViewPDF: React.FC<ModalViewPDFProps> = ({ isOpen, base64, fileName = "documento.pdf", onCancel }) => {
    if (!isOpen) return null;
    
    // Se o base64 for nulo, vazio ou undefined, não renderiza o iframe
    if (!base64 || base64.trim() === "") {
        return (
            <ModalCustom
                title="Erro de visualização"
                description="Não foi possível carregar o PDF."
                onCancel={onCancel}
            >
                <div className="flex flex-col gap-4 w-full">
                    <div className="flex justify-center w-full">
                        <p className="text-destructive">Não foi possível carregar o PDF.</p>
                    </div>
                </div>
            </ModalCustom>
        );
    }


    const handleDownload = () => {
        downloadPDF(base64, fileName);
        onCancel(); // Fecha o modal após iniciar o download
    };

    return (
        <ModalCustom
            title="Baixar Etiqueta"
            description="Sua etiqueta será baixada automaticamente"
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-4 w-full max-w-[400px]">
                <ButtonComponent
                    variant="primary"
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-3 h-14 text-lg"
                >
                    <Download size={24} />
                    Baixar PDF
                </ButtonComponent>
            </div>
        </ModalCustom>
    );
};
