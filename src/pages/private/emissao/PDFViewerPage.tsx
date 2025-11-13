import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { ButtonComponent } from '../../../components/button';

interface PDFViewerPageProps {
    base64?: string;
    fileName?: string;
}

const PDFViewerPage: React.FC<PDFViewerPageProps> = () => {
    const { encodedData } = useParams<{ encodedData: string }>();
    const navigate = useNavigate();
    const [pdfData, setPdfData] = useState<string>('');
    const [fileName, setFileName] = useState<string>('documento.pdf');
    const [zoom, setZoom] = useState<number>(100);

    useEffect(() => {
        if (encodedData) {
            try {
                // Decodifica os dados da URL
                const decodedData = decodeURIComponent(encodedData);
                const parsedData = JSON.parse(decodedData);
                
                setPdfData(parsedData.base64 || '');
                setFileName(parsedData.fileName || 'documento.pdf');
            } catch (error) {
                console.error('Erro ao decodificar dados do PDF:', error);
            }
        }
    }, [encodedData]);

    const handleDownload = () => {
        if (pdfData) {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${pdfData}`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handlePrint = () => {
        if (pdfData) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Imprimir ${fileName}</title>
                            <style>
                                body { margin: 0; padding: 0; }
                                iframe { width: 100%; height: 100vh; border: none; }
                            </style>
                        </head>
                        <body>
                            <iframe src="data:application/pdf;base64,${pdfData}"></iframe>
                        </body>
                    </html>
                `);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 1000);
            }
        }
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 25, 50));
    };

    const handleResetZoom = () => {
        setZoom(100);
    };

    if (!pdfData) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        Erro ao carregar PDF
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Não foi possível carregar o documento PDF.
                    </p>
                    <ButtonComponent onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                        Voltar
                    </ButtonComponent>
                </div>
            </div>
        );
    }

    const pdfUrl = `data:application/pdf;base64,${pdfData}`;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
            {/* Header da página */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <ButtonComponent
                                variant="secondary"
                                border="outline"
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft size={20} />
                                Voltar
                            </ButtonComponent>
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {fileName}
                            </h1>
                        </div>

                        {/* Controles do PDF */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                                <ButtonComponent
                                    variant="secondary"
                                    size="small"
                                    onClick={handleZoomOut}
                                    disabled={zoom <= 50}
                                    className="p-2"
                                >
                                    <ZoomOut size={16} />
                                </ButtonComponent>
                                
                                <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                                    {zoom}%
                                </span>
                                
                                <ButtonComponent
                                    variant="secondary"
                                    size="small"
                                    onClick={handleZoomIn}
                                    disabled={zoom >= 200}
                                    className="p-2"
                                >
                                    <ZoomIn size={16} />
                                </ButtonComponent>
                                
                                <ButtonComponent
                                    variant="secondary"
                                    size="small"
                                    onClick={handleResetZoom}
                                    className="p-2 ml-1"
                                >
                                    <RotateCcw size={16} />
                                </ButtonComponent>
                            </div>

                            <ButtonComponent
                                variant="secondary"
                                border="outline"
                                onClick={handlePrint}
                                className="flex items-center gap-2"
                            >
                                <Printer size={20} />
                                Imprimir
                            </ButtonComponent>

                            <ButtonComponent
                                variant="primary"
                                onClick={handleDownload}
                                className="flex items-center gap-2"
                            >
                                <Download size={20} />
                                Download
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visualizador de PDF */}
            <div className="flex-1 p-4">
                <div className="max-w-7xl mx-auto">
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden"
                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                    >
                        <iframe
                            src={pdfUrl}
                            width="100%"
                            height="800px"
                            title={`PDF Viewer - ${fileName}`}
                            className="border-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PDFViewerPage;