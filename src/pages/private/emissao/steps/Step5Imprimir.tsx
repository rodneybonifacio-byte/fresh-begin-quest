import { Printer, Download, Eye, CheckCircle } from 'lucide-react';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { printPDF, downloadPDF, viewPDF } from '../../../../utils/pdfUtils';
import type { IEmissao } from '../../../../types/IEmissao';

interface Step5ImprimirProps {
  onBack: () => void;
  onFinish: () => void;
  emissaoGerada: IEmissao;
  pdfData: { nome: string; dados: string } | null;
}

export const Step5Imprimir = ({ onBack, onFinish, emissaoGerada, pdfData }: Step5ImprimirProps) => {
  const handlePrint = () => {
    if (pdfData?.dados) {
      printPDF(pdfData.dados, pdfData.nome);
    }
  };

  const handleDownload = () => {
    if (pdfData?.dados) {
      downloadPDF(pdfData.dados, pdfData.nome);
    }
  };

  const handleView = () => {
    if (pdfData?.dados) {
      viewPDF(pdfData.dados, pdfData.nome);
    }
  };

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

        {/* PDF Preview */}
        {pdfData?.dados && (
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pré-visualização da Etiqueta
            </h4>
            <div className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md" style={{ height: '400px' }}>
              <iframe
                src={`data:application/pdf;base64,${pdfData.dados}`}
                className="w-full h-full border-0"
                title="Preview da Etiqueta"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ButtonComponent
            type="button"
            onClick={handlePrint}
            disabled={!pdfData?.dados}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 py-6"
          >
            <Printer className="h-5 w-5" />
            <span className="font-semibold">Imprimir</span>
          </ButtonComponent>

          <ButtonComponent
            type="button"
            onClick={handleView}
            disabled={!pdfData?.dados}
            border="outline"
            className="w-full flex items-center justify-center gap-2 py-6"
          >
            <Eye className="h-5 w-5" />
            <span className="font-semibold">Visualizar</span>
          </ButtonComponent>

          <ButtonComponent
            type="button"
            onClick={handleDownload}
            disabled={!pdfData?.dados}
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
