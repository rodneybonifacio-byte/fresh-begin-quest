import React from "react";
import { ExternalLink, Download, Printer, Eye } from "lucide-react";
import { ModalCustom } from "../../../components/modal";
import { ButtonComponent } from "../../../components/button";
import { openPDFInNewTab, openPDFInDedicatedPage, downloadPDF, printPDF } from "../../../utils/pdfUtils";
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
                title="Error de visualização"
                description="Não foi possível carregar o PDF."
                onCancel={onCancel}
            >
                <div className="flex flex-col gap-4 xl:w-[600px] ">
                    <div className="flex justify-center w-full">
                        <p className="text-red-500">Não foi possível carregar o PDF.</p>
                    </div>
                </div>
            </ModalCustom>
        );
    }

    const pdfUrl = `data:application/pdf;base64,${base64}`;

    const handleOpenInNewTab = () => {
        openPDFInNewTab(base64, fileName);
        onCancel(); // Fecha o modal
    };

    const handleOpenInDedicatedPage = () => {
        openPDFInDedicatedPage(base64, fileName);
        onCancel(); // Fecha o modal
    };

    const handleDownload = () => {
        downloadPDF(base64, fileName);
    };

    const handlePrint = () => {
        printPDF(base64, fileName);
    };

    return (
        <ModalCustom
            title="Visualizar PDF"
            description="Escolha como deseja visualizar o documento"
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-6 xl:w-[600px]">
                {/* Opções de visualização */}
                <div className="grid grid-cols-2 gap-4">
                    <ButtonComponent
                        variant="primary"
                        border="outline"
                        onClick={handleOpenInDedicatedPage}
                        className="flex flex-col items-center gap-2 p-6 h-auto"
                    >
                        <Eye size={32} />
                        <div className="text-center">
                            <div className="font-semibold">Página Dedicada</div>
                            <div className="text-sm opacity-75">Visualizar em tela cheia</div>
                        </div>
                    </ButtonComponent>

                    <ButtonComponent
                        variant="secondary"
                        border="outline"
                        onClick={handleOpenInNewTab}
                        className="flex flex-col items-center gap-2 p-6 h-auto"
                    >
                        <ExternalLink size={32} />
                        <div className="text-center">
                            <div className="font-semibold">Nova Aba</div>
                            <div className="text-sm opacity-75">Abrir no navegador</div>
                        </div>
                    </ButtonComponent>
                </div>

                {/* Ações */}
                <div className="flex gap-3 justify-center">
                    <ButtonComponent
                        variant="secondary"
                        border="outline"
                        onClick={handleDownload}
                        className="flex items-center gap-2"
                    >
                        <Download size={20} />
                        Download
                    </ButtonComponent>

                    <ButtonComponent
                        variant="secondary"
                        border="outline"
                        onClick={handlePrint}
                        className="flex items-center gap-2"
                    >
                        <Printer size={20} />
                        Imprimir
                    </ButtonComponent>
                </div>

                {/* Preview pequeno (opcional) */}
                <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-slate-700 p-2 text-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Preview</span>
                    </div>
                    <iframe
                        src={pdfUrl}
                        width="100%"
                        height="300px"
                        title="PDF Preview"
                        className="border-none"
                    />
                </div>
            </div>
        </ModalCustom>
    );
};
