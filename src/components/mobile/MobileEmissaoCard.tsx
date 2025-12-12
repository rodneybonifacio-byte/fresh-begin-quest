import { 
  Printer, 
  ReceiptText, 
  XCircle, 
  MapPinned,
  PackageOpen,
  Truck,
  Calendar
} from "lucide-react";
import { StatusBadgeEmissao } from "../StatusBadgeEmissao";
import { formatDateTime } from "../../utils/date-utils";
import type { IEmissao } from "../../types/IEmissao";

interface MobileEmissaoCardProps {
  emissao: IEmissao;
  onViewDetails: (emissao: IEmissao) => void;
  onPrint: (emissao: IEmissao) => void;
  onCancel: (emissao: IEmissao) => void;
  onViewError: (msg?: string) => void;
}

export const MobileEmissaoCard = ({ 
  emissao, 
  onViewDetails, 
  onPrint, 
  onCancel,
  onViewError 
}: MobileEmissaoCardProps) => {
  const canPrint = !emissao.mensagensErrorPostagem && emissao.status === 'PRE_POSTADO';
  
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header com código e status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-xl">
            <PackageOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="font-mono text-sm font-bold text-primary block">
              {emissao.codigoObjeto || 'Sem código'}
            </span>
            <span className="text-xs text-muted-foreground">{emissao.servico}</span>
          </div>
        </div>
        <StatusBadgeEmissao 
          status={emissao.status} 
          mensagensErrorPostagem={emissao.mensagensErrorPostagem}
          handleOnViewErroPostagem={onViewError}
        />
      </div>

      {/* Transportadora */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <Truck className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-foreground">{emissao.transportadora}</span>
      </div>

      {/* Destinatário */}
      <div className="bg-muted/30 rounded-xl p-3 mb-3">
        <div className="flex items-start gap-2">
          <MapPinned className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {emissao.destinatario?.nome || 'Destinatário não informado'}
            </p>
            <p className="text-xs text-muted-foreground">
              {emissao.destinatario?.endereco?.localidade} - {emissao.destinatario?.endereco?.uf}
            </p>
          </div>
        </div>
      </div>

      {/* Valor e Data */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-bold">
            R$ {emissao.valor}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDateTime(emissao.criadoEm)}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
        <button 
          onClick={() => onViewDetails(emissao)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
        >
          <ReceiptText className="w-4 h-4" />
          Detalhes
        </button>
        
        {canPrint && (
          <>
            <button 
              onClick={() => onPrint(emissao)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button 
              onClick={() => onCancel(emissao)}
              className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title="Cancelar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
