import React from 'react';
import { X, Download } from 'lucide-react';
import { ButtonComponent } from './button';

interface ModalVisualizarFechamentoProps {
    isOpen: boolean;
    onClose: () => void;
    pdfBase64: string;
    codigoFatura: string;
}

export const ModalVisualizarFechamento: React.FC<ModalVisualizarFechamentoProps> = ({
    isOpen,
    onClose,
    pdfBase64,
    codigoFatura,
}) => {
    if (!isOpen) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdfBase64}`;
        link.download = `fatura_${codigoFatura}_completa.pdf`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-6xl h-[90vh] bg-background rounded-lg shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">
                            Fatura #{codigoFatura} - Fechamento Completo
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Fatura + Boleto concatenados
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ButtonComponent
                            variant="primary"
                            onClick={handleDownload}
                            className="gap-2"
                        >
                            <Download size={18} />
                            Baixar PDF
                        </ButtonComponent>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                        >
                            <X size={24} className="text-foreground" />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 overflow-hidden">
                    <iframe
                        src={`data:application/pdf;base64,${pdfBase64}`}
                        className="w-full h-full"
                        title="Visualização do PDF"
                    />
                </div>
            </div>
        </div>
    );
};
