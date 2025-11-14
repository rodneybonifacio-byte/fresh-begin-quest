import { useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { NotificacaoPagamentoConfirmado } from '../components/NotificacaoPagamentoConfirmado';

interface UseRecargaPixRealtimeProps {
  clienteId: string;
  enabled?: boolean;
}

/**
 * Hook que escuta mudanças em tempo real na tabela recargas_pix
 * e exibe notificações quando pagamentos são confirmados
 */
export const useRecargaPixRealtime = ({ 
  clienteId, 
  enabled = true 
}: UseRecargaPixRealtimeProps) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !clienteId) {
      return;
    }

    console.log('🔔 Iniciando listener de pagamentos PIX em tempo real...');

    const channel = supabase
      .channel('recargas-pix-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recargas_pix',
          filter: `cliente_id=eq.${clienteId}`
        },
        (payload) => {
          console.log('📥 Atualização recebida:', payload);

          const novoStatus = payload.new?.status;
          const statusAnterior = payload.old?.status;
          const valor = payload.new?.valor;

          // Detectar quando pagamento é confirmado
          if (statusAnterior === 'pendente_pagamento' && novoStatus === 'pago') {
            console.log('✅ Pagamento confirmado!', {
              txid: payload.new?.txid,
              valor
            });

            // Mostrar toast customizado de sucesso
            toast.custom(
              () => <NotificacaoPagamentoConfirmado valor={valor} />,
              {
                duration: 8000,
                position: 'top-center',
              }
            );

            // Reproduzir som de notificação
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVqzn77BdGAg+ltryxnMpBSuBzvPaiTgIG2i57OiaUg8MUKXk8LllHAY5kdXyzHksBSR4yPDcjUEKE16z6eyrWBQKRp/g8r5tIAUxh9Dz04IzBh5uwO/jmVAND1as5++wXRgIPpba8sZzKQUsgc7z2ok4CBtouuzomVIPDFCl5PC5ZRwGOZHV8sx5LAUkeMjw3I1BChNes+nsq1gUCkaf4PK+bSAFMYfQ89OCMwYebsDv45lQDQ9WrOfvsF0YCD6W2vLGcykFLIHO89qJOAgbaLrs6JlSDwxQpeTwuWUcBjmR1fLMeSwFJHjI8NyNQQoTXrPp7KtYFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVqzn77BdGAg+ltryx3MpBSyBzvPaiTgIG2i67OiZUg8MUKXk8LllHAY5kdXyzHksBSR4yPDcjUEKE16z6eyrWBQKRp/g8r5tIAUxh9Dz04IzBh5uwO/jmVAND1as5++wXRgIPpba8sdzKQUsgc7z2ok4CBtouuzomVIPDFCl5PC5ZRwGOZHV8sx5LAUkeMjw3I1BChNes+nsq1gUCkaf4PK+bSAFMYfQ89OCMwYebsDv45lQDQ9WrOfvsF0YCD6W2vLHcykFLIHO89qJOAgbaLrs6JlSD');
              audio.volume = 0.5;
              audio.play().catch(e => console.log('Não foi possível reproduzir som:', e));
            } catch (e) {
              console.log('Audio não disponível');
            }

            // Invalidar queries para atualizar saldo e lista
            queryClient.invalidateQueries({ queryKey: ['cliente-saldo-recarga'] });
            queryClient.invalidateQueries({ queryKey: ['recargas-historico'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('Status do canal realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Inscrito no canal de notificações de pagamento');
        }
      });

    // Cleanup ao desmontar
    return () => {
      console.log('🔕 Removendo listener de pagamentos PIX');
      supabase.removeChannel(channel);
    };
  }, [clienteId, enabled, queryClient]);
};
