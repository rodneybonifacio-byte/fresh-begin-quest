import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import authStore from '../authentica/authentication.store';

export function useUserAvatar() {
  const user = authStore.getUser() as any;
  const clienteId = user?.clienteId;

  return useQuery({
    queryKey: ['user-avatar', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;

      const { data, error } = await supabase
        .from('user_avatars')
        .select('avatar_url')
        .eq('cliente_id', clienteId)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar avatar:', error);
        return null;
      }

      return data?.avatar_url || null;
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}