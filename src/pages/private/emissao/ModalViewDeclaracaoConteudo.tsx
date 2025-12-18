import React, { useEffect, useState } from "react";
import { ModalCustom } from "../../../components/modal";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import DOMPurify from "dompurify";

interface ModalViewDeclaracaoConteudoProps {
    isOpen: boolean;
    htmlContent: string;
    onCancel: () => void;
}

export const ModalViewDeclaracaoConteudo: React.FC<ModalViewDeclaracaoConteudoProps> = ({ isOpen, htmlContent, onCancel }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !htmlContent) return;

        const generatePdf = async () => {
            try {
                // Criar um elemento temporário para renderizar o HTML
                const container = document.createElement("div");
                container.style.position = "absolute";
                container.style.left = "-9999px";
                container.style.width = "190mm"; // Dimensão A4
                // Sanitizar HTML para prevenir XSS
                container.innerHTML = DOMPurify.sanitize(htmlContent, {
                    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'strong', 'b', 'i', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'img', 'hr'],
                    ALLOWED_ATTR: ['style', 'class', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'],
                    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
                    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover']
                });
                document.body.appendChild(container);

                // Gerar imagem do HTML
                const canvas = await html2canvas(container, { scale: 2 });
                const imgData = canvas.toDataURL("image/png");

                // Criar PDF
                const pdf = new jsPDF("p", "mm", [190, 277]);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

                // Remover o container
                document.body.removeChild(container);

                // Criar URL do PDF e atualizar estado
                const pdfBlob = pdf.output("blob");
                const pdfObjectUrl = URL.createObjectURL(pdfBlob);
                setPdfUrl(pdfObjectUrl);
            } catch (error) {
                console.error("Erro ao gerar PDF:", error);
                setPdfUrl(null);
            }
        };

        generatePdf();
    }, [isOpen, htmlContent]);

    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Declaração de Conteúdo"
            description="Visualizar declaração de conteúdo"
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-4 xl:w-[800px]">
                {pdfUrl ? (
                    <iframe className="sm:w-[800px] sm:h-[600px]" src={pdfUrl} width="100%" height="600px" title="PDF Viewer" />
                ) : (
                    <div className="flex justify-center w-full">
                        <p className="text-red-500">Carregando PDF...</p>
                    </div>
                )}
            </div>
        </ModalCustom>
    );
};
