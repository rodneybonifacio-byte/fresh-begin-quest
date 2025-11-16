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
 * Usa Blob URL para evitar limitações de data URLs e melhorar compatibilidade
 */
export const openPDFInNewTab = (base64: string, fileName: string = 'documento.pdf') => {
    if (!base64 || base64.trim() === '') {
        console.error('Base64 do PDF está vazio');
        return;
    }

    try {
        // Converte base64 para Blob
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        // Tenta abrir em nova aba
        const newWindow = window.open(blobUrl, '_blank');
        
        if (newWindow) {
            newWindow.document.title = fileName;
            console.log('✅ PDF aberto em nova aba com sucesso');
        } else {
            // Se bloqueado, faz download automaticamente
            console.warn('⚠️ Pop-up bloqueado, fazendo download do arquivo...');
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            
            alert('O bloqueador de pop-ups impediu a abertura. O PDF foi baixado automaticamente.');
        }
    } catch (error) {
        console.error('❌ Erro ao abrir PDF:', error);
        alert('Erro ao abrir o PDF. Tente novamente ou verifique o console para mais detalhes.');
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
 * Abre janela de impressão para o PDF
 * Solução robusta que evita problemas de cross-origin
 */
export const printPDF = (base64: string, fileName: string = 'documento.pdf') => {
    console.log('🖨️ [printPDF] Iniciando impressão');
    
    if (!base64 || base64.trim() === '') {
        console.error('❌ [printPDF] Base64 do PDF está vazio');
        alert('Erro: PDF vazio. Não é possível imprimir.');
        return;
    }

    try {
        // Converte base64 para Blob
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        // Cria HTML para abrir em nova janela
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${fileName}</title>
                <style>
                    body { margin: 0; padding: 0; }
                    iframe { border: none; width: 100%; height: 100vh; }
                </style>
            </head>
            <body>
                <iframe src="${blobUrl}" onload="setTimeout(() => window.print(), 500)"></iframe>
            </body>
            </html>
        `;

        const printBlob = new Blob([htmlContent], { type: 'text/html' });
        const printUrl = URL.createObjectURL(printBlob);

        // Abre em nova janela
        const windowFeatures = getCenteredWindowFeatures(800, 600);
        const printWindow = window.open(printUrl, '_blank', windowFeatures);

        if (printWindow) {
            console.log('✅ [printPDF] Janela de impressão aberta');
            
            // Limpa URLs após um tempo
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
                URL.revokeObjectURL(printUrl);
            }, 5000);
        } else {
            console.warn('⚠️ [printPDF] Pop-up bloqueado');
            
            // Fallback: faz download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert('Bloqueador de pop-ups ativo. O arquivo foi baixado - abra e imprima manualmente.');
            
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }
    } catch (error) {
        console.error('❌ [printPDF] Erro:', error);
        alert('Erro ao preparar impressão. Tente novamente.');
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