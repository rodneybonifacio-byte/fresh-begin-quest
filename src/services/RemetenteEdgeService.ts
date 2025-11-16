import { supabase } from '../integrations/supabase/client';
import type { IRemetente } from '../types/IRemetente';
import type { IResponse } from '../types/IResponse';

export class RemetenteEdgeService {
    async getAll(): Promise<IResponse<IRemetente[]>> {
        try {
            console.log('🚀 Chamando Edge Function buscar-remetentes...');
            
            // Pegar o token da API externa do localStorage
            const apiToken = localStorage.getItem('token');
            
            if (!apiToken) {
                throw new Error('Token de autenticação não encontrado');
            }

            const { data, error } = await supabase.functions.invoke('buscar-remetentes', {
                body: { apiToken },
            });

            console.log('📊 Resposta da Edge Function:', { data, error });

            if (error) {
                console.error('❌ Erro ao buscar remetentes:', error);
                throw new Error(error.message || 'Erro ao buscar remetentes');
            }

            return data as IResponse<IRemetente[]>;
        } catch (error) {
            console.error('❌ Erro ao chamar Edge Function:', error);
            throw error;
        }
    }
}
