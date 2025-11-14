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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
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
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-500 font-medium">
              Aguardando pagamento
            </span>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-lg border-2 border-border">
              <img
                src={chargeData.qr_code}
                alt="QR Code PIX"
                className="w-40 h-40"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Escaneie o QR Code com o app do seu banco
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OU</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Pix Copia e Cola */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Código Pix Copia e Cola
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-muted rounded-md border border-border overflow-x-auto max-h-20 overflow-y-auto">
                <code className="text-[10px] text-foreground font-mono break-all leading-tight">
                  {chargeData.pix_copia_cola}
                </code>
              </div>
              <button
                onClick={handleCopyPix}
                className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors shrink-0"
                title="Copiar código"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-muted/50 rounded-md border border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Como pagar:</h3>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-1.5">
                <span className="font-semibold text-foreground">1.</span>
                <span>Abra o app do seu banco</span>
              </li>
              <li className="flex gap-1.5">
                <span className="font-semibold text-foreground">2.</span>
                <span>Escolha pagar com Pix</span>
              </li>
              <li className="flex gap-1.5">
                <span className="font-semibold text-foreground">3.</span>
                <span>Escaneie o QR Code ou cole o código</span>
              </li>
              <li className="flex gap-1.5">
                <span className="font-semibold text-foreground">4.</span>
                <span>Confirme o pagamento</span>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Após o pagamento, seus créditos serão adicionados automaticamente.
            </p>

            <div className="border-t pt-3 space-y-2">
              <ConfigurarWebhook />
              <ProcessarPagamentoManual txid={chargeData.txid} onSuccess={handleClose} />
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Válido até:</p>
                <p className="text-muted-foreground">
                  {new Date(chargeData.expiracao).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
