import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { ButtonComponent } from './button';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

interface ModalVisualizarFechamentoProps {
    isOpen: boolean;
    onClose: () => void;
    faturaPdf: string; // base64
    boletoPdf?: string | null; // base64
    codigoFatura: string;
    nomeCliente?: string;
    boletoInfo?: {
        nossoNumero: string;
        linhaDigitavel: string;
        codigoBarras: string;
        dataVencimento: string;
        valor: number;
    };
}

export const ModalVisualizarFechamento: React.FC<ModalVisualizarFechamentoProps> = ({
    isOpen,
    onClose,
    faturaPdf,
    boletoPdf,
    codigoFatura,
    nomeCliente,
    boletoInfo
}) => {
    const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfImages, setPdfImages] = useState<string[]>([]);

    useEffect(() => {
        // Configurar worker do pdf.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        if (isOpen && faturaPdf) {
            mergePdfs();
        }
        
        return () => {
            if (mergedPdfUrl) {
                URL.revokeObjectURL(mergedPdfUrl);
            }
        };
    }, [isOpen, faturaPdf, boletoPdf]);

    const convertPdfToImages = async (pdfBase64: string): Promise<string[]> => {
        const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const images: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                const renderContext: any = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;
                images.push(canvas.toDataURL('image/png'));
            }
        }

        return images;
    };

    const mergePdfs = async () => {
        try {
            setIsProcessing(true);
            setError(null);
            setPdfImages([]);

            console.log('🔗 Iniciando merge de PDFs no frontend...');

            // Criar documento PDF final
            const mergedPdf = await PDFDocument.create();
            const allImages: string[] = [];

            // Se houver boleto, adicionar primeiro
            if (boletoPdf) {
                console.log('📄 Carregando boleto PDF...');
                const boletoBytes = Uint8Array.from(atob(boletoPdf), c => c.charCodeAt(0));
                const boletoPdfDoc = await PDFDocument.load(boletoBytes);
                const boletoPages = await mergedPdf.copyPages(boletoPdfDoc, boletoPdfDoc.getPageIndices());
                boletoPages.forEach((page) => mergedPdf.addPage(page));
                
                // Converter boleto para imagens
                const boletoImages = await convertPdfToImages(boletoPdf);
                allImages.push(...boletoImages);
                console.log('✅ Boleto adicionado ao PDF final');
            }

            // Adicionar fatura
            console.log('📄 Carregando fatura PDF...');
            const faturaBytes = Uint8Array.from(atob(faturaPdf), c => c.charCodeAt(0));
            const faturaPdfDoc = await PDFDocument.load(faturaBytes);
            const faturaPages = await mergedPdf.copyPages(faturaPdfDoc, faturaPdfDoc.getPageIndices());
            faturaPages.forEach((page) => mergedPdf.addPage(page));
            
            // Converter fatura para imagens
            const faturaImages = await convertPdfToImages(faturaPdf);
            allImages.push(...faturaImages);
            console.log('✅ Fatura adicionada ao PDF final');

            // Salvar PDF final
            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            setMergedPdfUrl(url);
            setPdfImages(allImages);
            console.log('✅ PDF mesclado e convertido para imagens com sucesso!');
            toast.success('PDF gerado com sucesso!');
            
        } catch (err) {
            console.error('❌ Erro ao mesclar PDFs:', err);
            setError('Erro ao processar PDFs. Tente baixar individualmente.');
            toast.error('Erro ao processar PDFs');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!mergedPdfUrl) return;

        const link = document.createElement('a');
        link.href = mergedPdfUrl;
        link.download = `FECHAMENTO_${codigoFatura}${nomeCliente ? '_' + nomeCliente.replace(/\s+/g, '_') : ''}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Download iniciado!');
    };

    const handleDownloadIndividual = (type: 'boleto' | 'fatura') => {
        const pdfBase64 = type === 'boleto' ? boletoPdf : faturaPdf;
        if (!pdfBase64) return;

        const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = type === 'boleto' 
            ? `BOLETO_${codigoFatura}.pdf`
            : `FATURA_${codigoFatura}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(`${type === 'boleto' ? 'Boleto' : 'Fatura'} baixado!`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-6xl h-[90vh] bg-background rounded-lg shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex flex-col gap-4 p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                Fechamento da Fatura #{codigoFatura}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {nomeCliente && `Cliente: ${nomeCliente}`}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                        >
                            <X size={24} className="text-foreground" />
                        </button>
                    </div>

                    {/* Informações do boleto */}
                    {boletoInfo && (
                        <div className="bg-muted p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Informações do Boleto</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Nosso Número:</span>
                                    <p className="font-mono">{boletoInfo.nossoNumero}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Vencimento:</span>
                                    <p>{boletoInfo.dataVencimento}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Linha Digitável:</span>
                                    <p className="font-mono text-xs break-all">{boletoInfo.linhaDigitavel}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Área de visualização do PDF */}
                <div className="flex-1 overflow-auto bg-muted/20">
                    {isProcessing ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                <p className="text-muted-foreground">Processando PDFs...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center text-destructive">
                                <FileText className="h-8 w-8 mx-auto mb-2" />
                                <p>{error}</p>
                            </div>
                        </div>
                    ) : pdfImages.length > 0 ? (
                        <div className="flex flex-col items-center gap-4 p-4">
                            {pdfImages.map((image, index) => (
                                <div key={index} className="w-full max-w-3xl border border-border rounded-lg overflow-hidden shadow-sm">
                                    <img 
                                        src={image} 
                                        alt={`Página ${index + 1}`}
                                        className="w-full h-auto"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2 justify-end p-4 border-t border-border">
                    {mergedPdfUrl && !error && (
                        <ButtonComponent variant="primary" onClick={handleDownload} className="gap-2">
                            <Download size={18} />
                            Baixar PDF Completo
                        </ButtonComponent>
                    )}
                    
                    {boletoPdf && (
                        <ButtonComponent 
                            variant="secondary"
                            onClick={() => handleDownloadIndividual('boleto')} 
                            className="gap-2"
                        >
                            <Download size={18} />
                            Baixar Boleto
                        </ButtonComponent>
                    )}
                    
                    <ButtonComponent 
                        variant="secondary"
                        onClick={() => handleDownloadIndividual('fatura')} 
                        className="gap-2"
                    >
                        <Download size={18} />
                        Baixar Fatura
                    </ButtonComponent>
                </div>
            </div>
        </div>
    );
};
