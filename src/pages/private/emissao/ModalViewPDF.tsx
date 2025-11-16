import React from "react";
import { ExternalLink, Download, Printer } from "lucide-react";
import { ModalCustom } from "../../../components/modal";
import { ButtonComponent } from "../../../components/button";
import { openPDFInNewTab, downloadPDF, printPDF } from "../../../utils/pdfUtils";

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


    const handleOpenInNewTab = () => {
        openPDFInNewTab(base64, fileName);
    };

    const handleDownload = () => {
        downloadPDF(base64, fileName);
    };

    const handlePrint = () => {
        printPDF(base64, fileName);
    };

    return (
        <ModalCustom
            title="Etiqueta de Envio"
            description="Escolha como deseja visualizar sua etiqueta"
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-4 w-full max-w-[500px]">
                {/* Ações principais em cards */}
                <ButtonComponent
                    variant="secondary"
                    border="outline"
                    onClick={handleOpenInNewTab}
                    className="flex items-center justify-center gap-3 h-16 text-lg"
                >
                    <ExternalLink size={24} />
                    Visualizar em Nova Aba
                </ButtonComponent>

                <ButtonComponent
                    variant="secondary"
                    border="outline"
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-3 h-16 text-lg"
                >
                    <Printer size={24} />
                    Imprimir Diretamente
                </ButtonComponent>

                <ButtonComponent
                    variant="secondary"
                    border="outline"
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-3 h-16 text-lg"
                >
                    <Download size={24} />
                    Baixar PDF
                </ButtonComponent>
            </div>
        </ModalCustom>
    );
};
