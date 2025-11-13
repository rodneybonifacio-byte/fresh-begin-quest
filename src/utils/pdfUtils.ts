// Utilitários para manipulação de PDFs

export interface PDFData {
    base64: string;
    fileName: string;
}

/**
 * Calcula as configurações da janela centralizada
 */
const getCenteredWindowFeatures = (width: number, height: number): string => {
    const left = Math.max(0, (screen.width - width) / 2);
    const top = Math.max(0, (screen.height - height) / 2);
    
    return `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no`;
};

/**
 * Abre um PDF em uma nova aba do navegador
 */
export const openPDFInNewTab = (base64: string, fileName: string = 'documento.pdf') => {
    if (!base64 || base64.trim() === '') {
        console.error('Base64 do PDF está vazio');
        return;
    }

    const pdfUrl = `data:application/pdf;base64,${base64}`;
    const newWindow = window.open(pdfUrl, '_blank');
    
    if (newWindow) {
        newWindow.document.title = fileName;
    } else {
        console.error('Não foi possível abrir a nova aba. Verifique se o bloqueador de pop-ups está desabilitado.');
    }
};

/**
 * Abre PDF em uma página dedicada da aplicação
 */
export const openPDFInDedicatedPage = (base64: string, fileName: string = 'documento.pdf') => {
    if (!base64 || base64.trim() === '') {
        console.error('Base64 do PDF está vazio');
        return;
    }

    const pdfData: PDFData = {
        base64,
        fileName
    };

    // Codifica os dados para passar na URL
    const encodedData = encodeURIComponent(JSON.stringify(pdfData));
    const url = `/pdf-viewer/${encodedData}`;
    
    // Tenta abrir em nova aba centralizada
    const windowFeatures = getCenteredWindowFeatures(1200, 800);
    const newWindow = window.open(url, '_blank', windowFeatures);
    
    if (newWindow) {
        newWindow.focus();
    } else {
        // Fallback para nova aba padrão se não conseguir abrir janela personalizada
        window.open(url, '_blank');
    }
};

/**
 * Faz download do PDF
 */
export const downloadPDF = (base64: string, fileName: string = 'documento.pdf') => {
    if (!base64 || base64.trim() === '') {
        console.error('Base64 do PDF está vazio');
        return;
    }

    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Abre janela de impressão centralizada para o PDF
 */
export const printPDF = (base64: string, fileName: string = 'documento.pdf') => {
    if (!base64 || base64.trim() === '') {
        console.error('Base64 do PDF está vazio');
        return;
    }

    // Configurações da janela centralizada para impressão
    const windowFeatures = getCenteredWindowFeatures(800, 600);

    const printWindow = window.open('', '_blank', windowFeatures);
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir ${fileName}</title>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 0; 
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            background: #f0f0f0;
                        }
                        iframe { 
                            width: 100%; 
                            height: 100%; 
                            border: none;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }
                        @media print {
                            body { background: white; }
                            iframe { box-shadow: none; }
                        }
                    </style>
                </head>
                <body>
                    <iframe src="data:application/pdf;base64,${base64}"></iframe>
                    <script>
                        window.addEventListener('load', function() {
                            setTimeout(function() {
                                window.print();
                            }, 1000);
                        });
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        
        // Foca na janela de impressão
        printWindow.focus();
    }
};

/**
 * Abre PDF para visualização em nova janela/aba centralizada (igual ao imprimir, mas sem o print())
 */
export const viewPDF = (base64: string, fileName: string = 'documento.pdf') => {
    if (!base64 || base64.trim() === '') {
        console.error('Base64 do PDF está vazio');
        return;
    }

    // Configurações da janela centralizada para visualização
    const windowFeatures = getCenteredWindowFeatures(1000, 700);

    const viewWindow = window.open('', '_blank', windowFeatures);
    if (viewWindow) {
        viewWindow.document.write(`
            <html>
                <head>
                    <title>${fileName}</title>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 0; 
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            background: #f0f0f0;
                        }
                        iframe { 
                            width: 100%; 
                            height: 100%; 
                            border: none;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }
                    </style>
                </head>
                <body>
                    <iframe src="data:application/pdf;base64,${base64}"></iframe>
                </body>
            </html>
        `);
        viewWindow.document.close();
        
        // Foca na nova janela
        viewWindow.focus();
    }
};