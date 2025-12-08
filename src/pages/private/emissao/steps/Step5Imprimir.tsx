import { Printer, Download, Eye, CheckCircle, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { printPDF, downloadPDF, viewPDF } from '../../../../utils/pdfUtils';
import type { IEmissao } from '../../../../types/IEmissao';

interface Step5ImprimirProps {
  onBack: () => void;
  onFinish: () => void;
  emissaoGerada: IEmissao;
  pdfData: { nome: string; dados: string; linkEtiqueta?: string } | null;
}

export const Step5Imprimir = ({ onBack, onFinish, emissaoGerada, pdfData }: Step5ImprimirProps) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Determina se temos PDF base64 ou apenas link direto
  const hasPdfBase64 = pdfData?.dados && pdfData.dados.length > 0;
  const linkEtiqueta = pdfData?.linkEtiqueta || (emissaoGerada as any)?.link_etiqueta;

  // Converte base64 para blob URL que o Chrome não bloqueia
  useEffect(() => {
    if (hasPdfBase64 && pdfData?.dados) {
      try {
        const base64Data = pdfData.dados;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        // Cleanup: revoga a URL quando o componente for desmontado
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error('Erro ao converter PDF:', error);
      }
    }
  }, [pdfData, hasPdfBase64]);

  const handlePrint = () => {
    if (hasPdfBase64 && pdfData?.dados) {
      printPDF(pdfData.dados, pdfData.nome);
    } else if (linkEtiqueta) {
      window.open(linkEtiqueta, '_blank');
    }
  };

  const handleDownload = () => {
    if (hasPdfBase64 && pdfData?.dados) {
      downloadPDF(pdfData.dados, pdfData.nome);
    } else if (linkEtiqueta) {
      window.open(linkEtiqueta, '_blank');
    }
  };

  const handleView = () => {
    if (hasPdfBase64 && pdfData?.dados) {
      viewPDF(pdfData.dados, pdfData.nome);
    } else if (linkEtiqueta) {
      window.open(linkEtiqueta, '_blank');
    }
  };

  // Verifica se temos alguma forma de acessar o PDF
  const canAccessPdf = hasPdfBase64 || linkEtiqueta;

  return (
    <FormCard 
      icon={Printer} 
      title="Etiqueta Gerada com Sucesso! 🎉" 
      description="Sua etiqueta está pronta. Escolha uma ação abaixo:"
    >
      <div className="space-y-6">
        {/* Success Message */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-green-900 dark:text-green-100 mb-2">
                Etiqueta Gerada! 🎉
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Código do Objeto: <span className="font-mono font-bold">{emissaoGerada.codigoObjeto || 'Processando...'}</span>
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3 border-l-4 border-green-500">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  Já enviamos o código de rastreio para o destinatário! 😉
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Pode ficar tranquilo, o cliente já está informado e pode acompanhar tudo! 📦✨
                </p>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Agora você pode imprimir, visualizar ou baixar sua etiqueta.
              </p>
            </div>
          </div>
        </div>

        {/* PDF Preview com Blob URL ou iframe para link externo */}
        {(pdfUrl || linkEtiqueta) && (
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pré-visualização da Etiqueta 👀
            </h4>
            <div className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md" style={{ height: '500px' }}>
              {pdfUrl ? (
                <object
                  data={pdfUrl}
                  type="application/pdf"
                  className="w-full h-full"
                  aria-label="Pré-visualização da Etiqueta PDF"
                >
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Eye className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Não foi possível carregar a pré-visualização do PDF no navegador.
                    </p>
                    <ButtonComponent
                      type="button"
                      onClick={handleView}
                      className="bg-primary text-primary-foreground"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Abrir PDF em Nova Janela
                    </ButtonComponent>
                  </div>
                </object>
              ) : linkEtiqueta ? (
                <iframe
                  src={linkEtiqueta}
                  className="w-full h-full border-0"
                  title="Pré-visualização da Etiqueta"
                />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              💡 Dica: Use os botões abaixo para visualizar em tela cheia, imprimir ou baixar
            </p>
          </div>
        )}

        {/* Link direto se não houver preview */}
        {!pdfUrl && linkEtiqueta && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Acesse sua etiqueta diretamente
                </p>
                <a 
                  href={linkEtiqueta} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {linkEtiqueta}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ButtonComponent
            type="button"
            onClick={handlePrint}
            disabled={!canAccessPdf}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 py-6"
          >
            <Printer className="h-5 w-5" />
            <span className="font-semibold">Imprimir</span>
          </ButtonComponent>

          <ButtonComponent
            type="button"
            onClick={handleView}
            disabled={!canAccessPdf}
            border="outline"
            className="w-full flex items-center justify-center gap-2 py-6"
          >
            <Eye className="h-5 w-5" />
            <span className="font-semibold">Visualizar</span>
          </ButtonComponent>

          <ButtonComponent
            type="button"
            onClick={handleDownload}
            disabled={!canAccessPdf}
            border="outline"
            className="w-full flex items-center justify-center gap-2 py-6"
          >
            <Download className="h-5 w-5" />
            <span className="font-semibold">Baixar PDF</span>
          </ButtonComponent>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Importante
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Cole a etiqueta impressa no pacote antes de entregar para a transportadora.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-border">
          <ButtonComponent
            type="button"
            onClick={onBack}
            border="outline"
            className="px-6"
          >
            Voltar
          </ButtonComponent>

          <ButtonComponent
            type="button"
            onClick={onFinish}
            className="px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            Finalizar e Ver Listagem
          </ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};