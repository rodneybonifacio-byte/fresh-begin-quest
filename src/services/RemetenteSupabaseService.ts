import { supabase } from '../integrations/supabase/client';
import type { IRemetente } from '../types/IRemetente';
import type { IResponse } from '../types/IResponse';

export class RemetenteSupabaseService {
    async getAll(): Promise<IResponse<IRemetente[]>> {
        try {
            console.log('🔍 Buscando remetentes via edge function...');
            
            const apiToken = localStorage.getItem('token');
            if (!apiToken) {
                throw new Error('Token não encontrado');
            }

            // Buscar via edge function que usa o service role
            const { data, error } = await supabase.functions.invoke('buscar-remetentes', {
                body: { apiToken },
            });

            if (error) {
                console.error('❌ Erro ao buscar remetentes:', error);
                throw new Error(error.message);
            }

            console.log('📦 Resposta da edge function:', data);

            // A edge function retorna o mesmo formato da API { data: [...] }
            const remetentesData = data?.data || [];
            
            // Mapear para o formato esperado
            const remetentes: IRemetente[] = remetentesData.map((rem: any) => ({
                id: rem.id,
                nome: rem.nome,
                cpfCnpj: rem.cpfCnpj,
                documentoEstrangeiro: rem.documentoEstrangeiro || '',
                celular: rem.celular || '',
                telefone: rem.telefone || '',
                email: rem.email || '',
                endereco: rem.endereco || {
                    cep: '',
                    logradouro: '',
                    numero: '',
                    complemento: '',
                    bairro: '',
                    localidade: '',
                    uf: '',
                },
                criadoEm: rem.criadoEm ? new Date(rem.criadoEm) : undefined,
            }));

            console.log('✅ Remetentes encontrados:', remetentes.length);

            return { data: remetentes };
        } catch (error) {
            console.error('❌ Erro ao buscar remetentes:', error);
            throw error;
        }
    }

    async sincronizar(): Promise<void> {
        try {
            console.log('🔄 Iniciando sincronização...');
            
            const apiToken = localStorage.getItem('token');
            if (!apiToken) {
                throw new Error('Token não encontrado');
            }

            const { data, error } = await supabase.functions.invoke('sincronizar-remetentes', {
                body: { apiToken },
            });

            if (error) {
                console.error('❌ Erro na sincronização:', error);
                throw error;
            }

            console.log('✅ Sincronização concluída:', data);
        } catch (error) {
            console.error('❌ Erro ao sincronizar:', error);
            throw error;
        }
    }
}
