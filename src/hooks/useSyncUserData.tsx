import { useEffect } from 'react';
import { useUsuarioDados } from './useUsuarioDados';

/**
 * Hook que sincroniza automaticamente os dados do usuário do backend
 * para o Supabase quando o componente é montado
 */
export function useSyncUserData() {
    const { refetch } = useUsuarioDados(false);

    useEffect(() => {
        console.log('🔄 Sincronizando dados do usuário...');
        refetch();
    }, [refetch]);
}
