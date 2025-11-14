import { useState } from "react";
import { X, Copy, QrCode, Clock, CheckCircle2 } from "lucide-react";
import { ICreatePixChargeResponse } from "../../../../types/IRecargaPix";
import { toastSuccess, toastError } from "../../../../utils/toastNotify";
import { ProcessarPagamentoManual } from './ProcessarPagamentoManual';
import { ConfigurarWebhook } from './ConfigurarWebhook';

interface ModalRecargaPixProps {
  isOpen: boolean;
  onClose: () => void;
  chargeData?: ICreatePixChargeResponse['data'];
}

export function ModalRecargaPix({ isOpen, onClose, chargeData }: ModalRecargaPixProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !chargeData) return null;

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(chargeData.pix_copia_cola);
      setCopied(true);
      toastSuccess("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError("Erro ao copiar código");
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Pagar com PIX</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-yellow-500 font-medium">
              Aguardando pagamento
            </span>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-lg border-4 border-border">
              <img
                src={chargeData.qr_code}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Escaneie o QR Code com o app do seu banco
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OU</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Pix Copia e Cola */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Código Pix Copia e Cola
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg border border-border overflow-x-auto">
                <code className="text-xs text-foreground font-mono break-all">
                  {chargeData.pix_copia_cola}
                </code>
              </div>
              <button
                onClick={handleCopyPix}
                className="p-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors shrink-0"
                title="Copiar código"
              >
                {copied ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-medium text-foreground mb-2">Como pagar:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Abra o app do seu banco</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Escolha pagar com Pix QR Code ou Pix Copia e Cola</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Escaneie o código ou cole o texto acima</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                <span>Confirme o pagamento</span>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Após realizar o pagamento, seus créditos serão adicionados automaticamente em alguns instantes.
            </p>

            <div className="border-t pt-4 space-y-3">
              <ConfigurarWebhook />
              <ProcessarPagamentoManual txid={chargeData.txid} onSuccess={handleClose} />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Configure o webhook para receber notificações automáticas ou processe manualmente
            </p>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border border-border">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Válido até:</p>
                <p className="text-muted-foreground">
                  {new Date(chargeData.expiracao).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
