import { useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { NotificacaoPagamentoConfirmado } from '../components/NotificacaoPagamentoConfirmado';

interface UseRecargaPixRealtimeProps {
  enabled?: boolean;
  onPaymentConfirmed?: () => void;
}

/**
 * Hook que escuta mudanças em tempo real na tabela recargas_pix
 * e exibe notificações quando pagamentos são confirmados
 */
export const useRecargaPixRealtime = ({ 
  enabled = true,
  onPaymentConfirmed
}: UseRecargaPixRealtimeProps) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
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
          table: 'recargas_pix'
        },
        (payload) => {
          console.log('📥 Atualização recebida na tabela recargas_pix:', payload);

          const novoStatus = payload.new?.status;
          const statusAnterior = payload.old?.status;
          const valor = payload.new?.valor;

          console.log(`Status mudou de ${statusAnterior} para ${novoStatus}`);

          // Detectar quando pagamento é confirmado
          if (statusAnterior === 'pendente_pagamento' && novoStatus === 'pago') {
            console.log('✅ Pagamento confirmado!', {
              txid: payload.new?.txid,
              valor
            });

            // Fechar modal se callback fornecido
            if (onPaymentConfirmed) {
              onPaymentConfirmed();
            }

            // Aguardar um pouco para o modal fechar
            setTimeout(() => {
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
            }, 500);

            // Invalidar queries para atualizar saldo e lista
            queryClient.invalidateQueries({ queryKey: ['cliente-saldo-recarga'] });
            queryClient.invalidateQueries({ queryKey: ['cliente-saldo-disponivel'] });
            queryClient.invalidateQueries({ queryKey: ['cliente-logado'] });
            queryClient.invalidateQueries({ queryKey: ['recargas-historico'] });
            queryClient.invalidateQueries({ queryKey: ['extrato-creditos'] });
            
            console.log('🔄 Queries invalidadas para atualização');
          }
        }
      )
      .subscribe((status) => {
        console.log('Status do canal realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Inscrito no canal de notificações de pagamento');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro no canal de realtime');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout no canal de realtime');
        }
      });

    // Cleanup ao desmontar
    return () => {
      console.log('🔕 Removendo listener de pagamentos PIX');
      supabase.removeChannel(channel);
    };
  }, [enabled, onPaymentConfirmed, queryClient]);
};
