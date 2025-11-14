import { useState } from 'react';
import { ButtonComponent } from '../../../../components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../integrations/supabase/client';
import { toastSuccess, toastError } from '../../../../utils/toastNotify';

interface ProcessarPagamentoManualProps {
  txid: string;
  onSuccess?: () => void;
}

export function ProcessarPagamentoManual({ txid, onSuccess }: ProcessarPagamentoManualProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processarPagamento = useMutation({
    mutationFn: async (txid: string) => {
      const { data, error } = await supabase.functions.invoke('processar-pagamento-manual', {
        body: { txid }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao processar pagamento');
      
      return data;
    },
    onSuccess: (data) => {
      toastSuccess(`Pagamento processado! R$ ${data.valor} adicionado aos créditos.`);
      queryClient.invalidateQueries({ queryKey: ['saldo-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['recargas-pix'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toastError(error.message || 'Erro ao processar pagamento');
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleProcessar = () => {
    setIsProcessing(true);
    processarPagamento.mutate(txid);
  };

  return (
    <ButtonComponent
      onClick={handleProcessar}
      disabled={isProcessing}
      variant="primary"
      className="w-full"
    >
      {isProcessing ? 'Processando...' : 'Confirmar Pagamento Manualmente'}
    </ButtonComponent>
  );
}
