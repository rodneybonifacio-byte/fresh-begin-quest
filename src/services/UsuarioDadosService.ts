import { supabase } from '../integrations/supabase/client';

export interface DadosUsuarioCompletos {
    cliente: any;
    remetentes: any[];
    destinatarios: any[];
}

export class UsuarioDadosService {
    async buscarDadosCompletos(): Promise<DadosUsuarioCompletos> {
        try {
            console.log('🔍 Buscando dados completos do usuário via edge function...');
            
            const apiToken = localStorage.getItem('token');
            if (!apiToken) {
                throw new Error('Token não encontrado');
            }

            const { data, error } = await supabase.functions.invoke('buscar-dados-usuario', {
                body: { apiToken },
            });

            if (error) {
                console.error('❌ Erro ao buscar dados do usuário:', error);
                throw new Error(error.message);
            }

            console.log('✅ Dados completos do usuário:', data);

            return {
                cliente: data.cliente || null,
                remetentes: data.remetentes || [],
                destinatarios: data.destinatarios || [],
            };
        } catch (error) {
            console.error('❌ Erro ao buscar dados completos:', error);
            throw error;
        }
    }
}
