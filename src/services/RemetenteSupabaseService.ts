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

            // Mapear para o formato esperado
            const remetentes: IRemetente[] = (data.remetentes || []).map((rem: any) => ({
                id: rem.id,
                nome: rem.nome,
                cpfCnpj: rem.cpf_cnpj,
                documentoEstrangeiro: rem.documento_estrangeiro || '',
                celular: rem.celular || '',
                telefone: rem.telefone || '',
                email: rem.email || '',
                endereco: {
                    cep: rem.cep || '',
                    logradouro: rem.logradouro || '',
                    numero: rem.numero || '',
                    complemento: rem.complemento || '',
                    bairro: rem.bairro || '',
                    localidade: rem.localidade || '',
                    uf: rem.uf || '',
                },
                criadoEm: rem.criado_em ? new Date(rem.criado_em) : undefined,
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
