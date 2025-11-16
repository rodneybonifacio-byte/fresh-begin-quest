import { supabase } from '../integrations/supabase/client';
import type { IRemetente } from '../types/IRemetente';
import type { IResponse } from '../types/IResponse';

export class RemetenteSupabaseDirectService {
    async getAll(): Promise<IResponse<IRemetente[]>> {
        try {
            console.log('📊 Buscando remetentes direto do Supabase...');
            
            const { data, error } = await supabase
                .from('remetentes')
                .select('*')
                .order('criado_em', { ascending: false });

            if (error) {
                console.error('❌ Erro ao buscar remetentes do Supabase:', error);
                throw new Error(error.message);
            }

            console.log('✅ Remetentes encontrados:', data?.length || 0);

            // Mapear dados do Supabase para o formato IRemetente
            const remetentes: IRemetente[] = (data || []).map(r => ({
                id: r.id,
                nome: r.nome,
                cpfCnpj: r.cpf_cnpj,
                documentoEstrangeiro: r.documento_estrangeiro || '',
                celular: r.celular || '',
                telefone: r.telefone || '',
                email: r.email || '',
                endereco: {
                    cep: r.cep || '',
                    logradouro: r.logradouro || '',
                    numero: r.numero || '',
                    complemento: r.complemento || '',
                    bairro: r.bairro || '',
                    localidade: r.localidade || '',
                    uf: r.uf || '',
                },
                criadoEm: r.criado_em ? new Date(r.criado_em) : undefined,
            }));

            return {
                data: remetentes,
            };
        } catch (error) {
            console.error('❌ Erro ao buscar remetentes:', error);
            throw error;
        }
    }
}
