import { supabase } from '../integrations/supabase/client';
import type { IEmissao } from '../types/IEmissao';
import type { IResponse } from '../types/IResponse';

export class AdminEmissaoService {
    /**
     * Busca todas as emissões do sistema (todos os clientes) usando credenciais admin
     * @param params Parâmetros de filtro (page, limit, status, transportadora, etc.)
     * @returns Resposta com lista de emissões
     */
    async getAllEmissoes(params?: Record<string, string>): Promise<IResponse<IEmissao[]>> {
        try {
            console.log('🔍 Buscando todas as emissões (admin)...', params);

            const { data, error } = await supabase.functions.invoke('buscar-todas-emissoes-admin', {
                body: { params },
            });

            if (error) {
                console.error('❌ Erro ao buscar emissões admin:', error);
                throw new Error(error.message || 'Erro ao buscar emissões');
            }

            console.log('✅ Emissões carregadas:', data?.data?.length || 0);
            return data as IResponse<IEmissao[]>;
        } catch (error: any) {
            console.error('❌ Erro no AdminEmissaoService:', error);
            throw error;
        }
    }
}
