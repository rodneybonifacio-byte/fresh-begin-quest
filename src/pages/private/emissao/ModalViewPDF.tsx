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

    const pdfUrl = `data:application/pdf;base64,${base64}`;

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
            description="Visualize, imprima ou baixe sua etiqueta"
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-6 w-full max-w-[900px]">
                {/* Preview do PDF em tamanho grande */}
                <div className="w-full bg-muted rounded-lg overflow-hidden border border-border">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-[600px]"
                        title={fileName}
                    />
                </div>

                {/* Ações principais */}
                <div className="grid grid-cols-3 gap-3">
                    <ButtonComponent
                        variant="secondary"
                        border="outline"
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2"
                    >
                        <Printer size={20} />
                        Imprimir
                    </ButtonComponent>

                    <ButtonComponent
                        variant="secondary"
                        border="outline"
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2"
                    >
                        <Download size={20} />
                        Baixar
                    </ButtonComponent>

                    <ButtonComponent
                        variant="secondary"
                        border="outline"
                        onClick={handleOpenInNewTab}
                        className="flex items-center justify-center gap-2"
                    >
                        <ExternalLink size={20} />
                        Nova Aba
                    </ButtonComponent>
                </div>
            </div>
        </ModalCustom>
    );
};
