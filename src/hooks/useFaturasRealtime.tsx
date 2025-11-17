import { useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseFaturasRealtimeProps {
  enabled: boolean;
  onStatusChange?: (faturaId: string, novoStatus: string) => void;
}

export function useFaturasRealtime({ enabled, onStatusChange }: UseFaturasRealtimeProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    console.log('🔴 Iniciando monitoramento realtime de faturas...');

    // Canal para monitorar mudanças em transacoes_credito (pagamentos PIX)
    const channelRecargas = supabase
      .channel('recargas-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recargas_pix',
          filter: 'status=eq.pago'
        },
        (payload) => {
          console.log('💰 Pagamento PIX detectado:', payload);
          
          // Invalidar queries relacionadas para forçar recarregamento
          queryClient.invalidateQueries({ queryKey: ['faturas'] });
          
          // Notificar componente pai
          if (payload.new && 'id' in payload.new) {
            onStatusChange?.(String(payload.new.id), 'PAGO');
          }
        }
      )
      .subscribe();

    // Canal para monitorar transações de crédito (pode indicar pagamentos)
    const channelTransacoes = supabase
      .channel('transacoes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transacoes_credito',
          filter: 'tipo=eq.recarga'
        },
        (payload) => {
          console.log('💳 Nova transação de recarga detectada:', payload);
          
          // Invalidar queries
          queryClient.invalidateQueries({ queryKey: ['faturas'] });
          
          if (payload.new && 'id' in payload.new) {
            onStatusChange?.(String(payload.new.id), 'PROCESSANDO');
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      console.log('🔴 Encerrando monitoramento realtime');
      supabase.removeChannel(channelRecargas);
      supabase.removeChannel(channelTransacoes);
    };
  }, [enabled, queryClient, onStatusChange]);
}
