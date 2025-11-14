import { CheckCircle2, Sparkles } from 'lucide-react';
import { formatCurrencyWithCents } from '../utils/formatCurrency';

interface NotificacaoPagamentoConfirmadoProps {
  valor: number;
}

export const NotificacaoPagamentoConfirmado = ({ valor }: NotificacaoPagamentoConfirmadoProps) => {
  const valorFormatado = formatCurrencyWithCents(valor.toString());
  
  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg shadow-2xl animate-in slide-in-from-top-5 duration-300">
      <div className="relative">
        <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
        <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300 animate-pulse" />
      </div>
      
      <div className="flex-1">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          💰 Pagamento Confirmado!
        </h3>
        <p className="text-white/90 text-sm font-medium">
          Recarga de {valorFormatado} creditada
        </p>
      </div>

      <div className="flex flex-col items-center justify-center bg-white/20 rounded-full px-3 py-2">
        <span className="text-white font-bold text-xs">PAGO</span>
      </div>
    </div>
  );
};
