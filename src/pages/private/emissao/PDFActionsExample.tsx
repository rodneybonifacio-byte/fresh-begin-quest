import React, { useState } from 'react';
import { ModalViewPDF } from './ModalViewPDF';
import { openPDFInNewTab, openPDFInDedicatedPage, downloadPDF, printPDF } from '../../../utils/pdfUtils';
import { ButtonComponent } from '../../../components/button';
import { FileText, Eye, ExternalLink, Download, Printer } from 'lucide-react';

interface PDFExampleProps {
    base64PDF: string;
    fileName?: string;
}

/**
 * Componente de exemplo mostrando todas as opções de visualização de PDF
 */
export const PDFActionsExample: React.FC<PDFExampleProps> = ({ 
    base64PDF, 
    fileName = "documento.pdf" 
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="flex flex-wrap gap-2">
            {/* Botão para abrir o modal com opções */}
            <ButtonComponent
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2"
            >
                <FileText size={20} />
                Ver PDF
            </ButtonComponent>

            {/* Botões de ação direta */}
            <ButtonComponent
                variant="secondary"
                border="outline"
                onClick={() => openPDFInDedicatedPage(base64PDF, fileName)}
                className="flex items-center gap-2"
            >
                <Eye size={20} />
                Página Cheia
            </ButtonComponent>

            <ButtonComponent
                variant="secondary"
                border="outline"
                onClick={() => openPDFInNewTab(base64PDF, fileName)}
                className="flex items-center gap-2"
            >
                <ExternalLink size={20} />
                Nova Aba
            </ButtonComponent>

            <ButtonComponent
                variant="secondary"
                border="outline"
                onClick={() => downloadPDF(base64PDF, fileName)}
                className="flex items-center gap-2"
            >
                <Download size={20} />
                Download
            </ButtonComponent>

            <ButtonComponent
                variant="secondary"
                border="outline"
                onClick={() => printPDF(base64PDF, fileName)}
                className="flex items-center gap-2"
            >
                <Printer size={20} />
                Imprimir
            </ButtonComponent>

            {/* Modal de visualização */}
            <ModalViewPDF
                isOpen={isModalOpen}
                base64={base64PDF}
                fileName={fileName}
                onCancel={() => setIsModalOpen(false)}
            />
        </div>
    );
};

/**
 * Hook para facilitar o uso das funções de PDF
 */
export const usePDFActions = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPDF, setCurrentPDF] = useState<{base64: string, fileName: string} | null>(null);

    const showPDFModal = (base64: string, fileName: string = "documento.pdf") => {
        setCurrentPDF({ base64, fileName });
        setIsModalOpen(true);
    };

    const closePDFModal = () => {
        setIsModalOpen(false);
        setCurrentPDF(null);
    };

    const PDFModal = () => (
        <ModalViewPDF
            isOpen={isModalOpen}
            base64={currentPDF?.base64 || ''}
            fileName={currentPDF?.fileName}
            onCancel={closePDFModal}
        />
    );

    return {
        showPDFModal,
        closePDFModal,
        PDFModal,
        // Funções diretas
        openInNewTab: openPDFInNewTab,
        openInDedicatedPage: openPDFInDedicatedPage,
        download: downloadPDF,
        print: printPDF
    };
};