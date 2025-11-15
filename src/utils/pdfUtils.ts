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
 * Inclui fallback para quando pop-ups são bloqueados
 */
export const printPDF = (base64: string, fileName: string = 'documento.pdf') => {
    console.log('🖨️ [printPDF] Iniciando impressão');
    console.log('📄 [printPDF] Nome do arquivo:', fileName);
    console.log('📄 [printPDF] Base64 length:', base64?.length);
    
    if (!base64 || base64.trim() === '') {
        console.error('❌ [printPDF] Base64 do PDF está vazio');
        alert('Erro: PDF vazio. Não é possível imprimir.');
        return;
    }

    // Converte base64 para Blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    console.log('🔄 [printPDF] Blob URL criado:', blobUrl);

    // Tenta abrir em nova janela primeiro
    const windowFeatures = getCenteredWindowFeatures(800, 600);
    const printWindow = window.open(blobUrl, '_blank', windowFeatures);
    
    if (printWindow && !printWindow.closed) {
        console.log('✅ [printPDF] Janela aberta com sucesso');
        
        // Aguarda e dispara impressão
        setTimeout(() => {
            try {
                printWindow.print();
                
                // Limpa o blob URL após um tempo
                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                }, 2000);
            } catch (e) {
                console.error('Erro ao imprimir:', e);
                URL.revokeObjectURL(blobUrl);
            }
        }, 1000);
    } else {
        // Pop-up bloqueado - usa iframe invisível
        console.warn('⚠️ [printPDF] Pop-up bloqueado, usando iframe');
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.src = blobUrl;
        
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Erro ao imprimir via iframe:', e);
                }
                
                // Remove iframe e limpa blob após impressão
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                    URL.revokeObjectURL(blobUrl);
                }, 1000);
            }, 500);
        };
    }
};

/**
 * Abre uma janela centralizada para visualizar o PDF
 * Inclui fallback para quando pop-ups são bloqueados
 */
export const viewPDF = (base64: string, fileName: string = 'documento.pdf') => {
    if (!base64 || base64.trim() === '') {
        console.error('Base64 do PDF está vazio');
        return;
    }

    // Tenta abrir em nova janela
    const windowFeatures = getCenteredWindowFeatures(1000, 800);
    const viewWindow = window.open('', '_blank', windowFeatures);
    
    if (viewWindow && !viewWindow.closed) {
        // Pop-up permitido
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
                            background: #2d3748;
                        }
                        iframe { 
                            width: 100%; 
                            height: 100%; 
                            border: none;
                            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                        }
                    </style>
                </head>
                <body>
                    <iframe src="data:application/pdf;base64,${base64}"></iframe>
                </body>
            </html>
        `);
        viewWindow.document.close();
        viewWindow.focus();
    } else {
        // Pop-up bloqueado - abre em nova aba simples
        console.warn('Pop-up bloqueado, abrindo em nova aba');
        const pdfUrl = `data:application/pdf;base64,${base64}`;
        const newTab = window.open(pdfUrl, '_blank');
        
        if (!newTab) {
            // Completamente bloqueado - mostra alerta e faz download
            alert('Pop-ups estão bloqueados. Baixando o PDF automaticamente.');
            downloadPDF(base64, fileName);
        }
    }
};