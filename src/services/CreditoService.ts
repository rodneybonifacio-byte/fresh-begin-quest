import { CustomHttpClient } from '../utils/http-axios-client';
import { BaseService } from './BaseService';
import { getSupabaseWithAuth } from '../integrations/supabase/custom-auth';

export interface ITransacaoCredito {
    id: string;
    cliente_id: string;
    tipo: 'recarga' | 'consumo';
    valor: number;
    descricao?: string;
    emissao_id?: string;
    created_at: string;
    updated_at: string;
}

export class CreditoService extends BaseService<ITransacaoCredito> {
    protected endpoint = 'transacoes_credito';

    constructor() {
        super(new CustomHttpClient());
    }

    /**
     * Registra uma recarga de créditos usando a função do banco
     */
    async registrarRecarga(clienteId: string, valor: number, descricao?: string): Promise<any> {
        const supabase = getSupabaseWithAuth();
        const { data, error } = await supabase.rpc('registrar_recarga', {
            p_cliente_id: clienteId,
            p_valor: valor,
            p_descricao: descricao || 'Recarga de créditos'
        });

        if (error) throw error;
        return data;
    }

    /**
     * Calcula o saldo atual do cliente
     */
    async calcularSaldo(clienteId: string): Promise<number> {
        const supabase = getSupabaseWithAuth();
        const { data, error } = await supabase.rpc('calcular_saldo_cliente', {
            p_cliente_id: clienteId
        });

        if (error) throw error;
        return data || 0;
    }

    /**
     * Verifica se o cliente tem saldo suficiente
     */
    async verificarSaldoSuficiente(clienteId: string, valor: number): Promise<boolean> {
        const supabase = getSupabaseWithAuth();
        const { data, error } = await supabase.rpc('verificar_saldo_suficiente', {
            p_cliente_id: clienteId,
            p_valor: valor
        });

        if (error) throw error;
        return data || false;
    }

    /**
     * Consome créditos para uma etiqueta (via edge function)
     */
    async consumirCreditosEtiqueta(
        clienteId: string,
        emissaoId: string,
        valor: number,
        status: string
    ): Promise<any> {
        const supabase = getSupabaseWithAuth();
        const { data, error } = await supabase.functions.invoke('consumir-creditos-etiqueta', {
            body: {
                cliente_id: clienteId,
                emissao_id: emissaoId,
                valor: valor,
                status: status
            }
        });

        if (error) throw error;
        return data;
    }

    /**
     * Obtém o extrato de transações do cliente
     */
    async obterExtrato(clienteId: string, limit: number = 50): Promise<ITransacaoCredito[]> {
        try {
            console.log('🔍 Buscando extrato para cliente:', clienteId);
            
            // Usar cliente Supabase padrão (não precisa de autenticação para RPC com SECURITY DEFINER)
            const supabase = getSupabaseWithAuth();
            const { data, error } = await supabase.rpc('buscar_transacoes_cliente', {
                p_cliente_id: clienteId,
                p_limit: limit
            });

            if (error) {
                console.error('❌ Erro RPC:', error);
                return [];
            }
            
            console.log('✅ RPC retornou:', data?.length || 0, 'transações');
            if (data && data.length > 0) {
                console.log('📄 Primeira transação do RPC:', data[0]);
            }
            
            return (data || []) as ITransacaoCredito[];
        } catch (error) {
            console.error('💥 Erro ao buscar extrato:', error);
            return [];
        }
    }

    /**
     * Obtém o resumo de transações por período
     */
    async obterResumo(clienteId: string, dataInicio?: string, dataFim?: string) {
        try {
            console.log('🔍 Buscando resumo para cliente:', clienteId);
            
            const supabase = getSupabaseWithAuth();
            const { data, error } = await supabase.rpc('buscar_resumo_transacoes', {
                p_cliente_id: clienteId,
                p_data_inicio: dataInicio,
                p_data_fim: dataFim
            });

            if (error) {
                console.error('❌ Erro RPC resumo:', error);
                return {
                    totalRecargas: 0,
                    totalConsumos: 0,
                    quantidadeRecargas: 0,
                    quantidadeConsumos: 0,
                    transacoes: []
                };
            }

            console.log('✅ RPC resumo retornou:', data?.length || 0, 'registros');

            // Calcular totais
            const recargas = data?.filter((t: any) => t.tipo === 'recarga') || [];
            const consumos = data?.filter((t: any) => t.tipo === 'consumo') || [];

            const totalRecargas = recargas.reduce((sum: number, t: any) => sum + Number(t.valor), 0);
            const totalConsumos = consumos.reduce((sum: number, t: any) => sum + Math.abs(Number(t.valor)), 0);

            console.log('📈 Resumo:', { 
                totalRecargas, 
                totalConsumos, 
                qtdRecargas: recargas.length, 
                qtdConsumos: consumos.length 
            });

            return {
                totalRecargas,
                totalConsumos,
                quantidadeRecargas: recargas.length,
                quantidadeConsumos: consumos.length,
                transacoes: data
            };
        } catch (error) {
            console.error('💥 Erro ao obter resumo:', error);
            return {
                totalRecargas: 0,
                totalConsumos: 0,
                quantidadeRecargas: 0,
                quantidadeConsumos: 0,
                transacoes: []
            };
        }
    }
}
