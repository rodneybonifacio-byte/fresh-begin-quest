import { supabase } from '../integrations/supabase/client';
import type { IRemetente } from '../types/IRemetente';
import type { IResponse } from '../types/IResponse';

export class RemetenteEdgeService {
    async getAll(): Promise<IResponse<IRemetente[]>> {
        try {
            console.log('🚀 Chamando Edge Function buscar-remetentes...');
            
            const { data, error } = await supabase.functions.invoke('buscar-remetentes', {
                method: 'GET',
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
