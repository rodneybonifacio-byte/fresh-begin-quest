import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle, DollarSign } from 'lucide-react';

interface PagamentoRealtimeToastProps {
  faturaId: string;
  clienteNome: string;
  valor: string;
  onShow: () => void;
}

export const showPagamentoToast = (props: PagamentoRealtimeToastProps) => {
  const { clienteNome, valor } = props;
  
  toast.custom(
    (t) => (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl p-4 max-w-md animate-in slide-in-from-top">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">💰 Pagamento Confirmado!</h3>
            <p className="text-sm opacity-95 mb-2">
              <strong>{clienteNome}</strong> realizou o pagamento
            </p>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm">
              <DollarSign className="w-4 h-4" />
              <span className="font-bold text-lg">{valor}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 8000,
      position: 'top-right',
    }
  );

  // Tocar som de notificação (opcional)
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQQ0RPJ/i8bllHAU2jtL02H0pBSl+zPLaizsIGGS66OihUQ4N');
  audio.volume = 0.3;
  audio.play().catch(() => {}); // Ignorar erros de autoplay
  
  props.onShow();
};
