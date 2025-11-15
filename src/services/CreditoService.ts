import { CustomHttpClient } from '../utils/http-axios-client';
import { BaseService } from './BaseService';
import { supabase } from '../integrations/supabase/client';

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
     * Obtém o extrato de transações do cliente usando Edge Function
     */
    async obterExtrato(clienteId: string): Promise<ITransacaoCredito[]> {
        try {
            console.log('🔍 Buscando extrato via Edge Function para:', clienteId);
            
            const { data, error } = await supabase.functions.invoke('buscar-extrato', {
                body: { clienteId }
            });

            if (error) {
                console.error('❌ Erro Edge Function:', error);
                return [];
            }
            
            if (!data?.success) {
                console.error('❌ Edge Function retornou erro:', data?.error);
                return [];
            }

            console.log('✅ Edge Function retornou:', data.transacoes?.length || 0, 'transações');
            return (data.transacoes || []) as ITransacaoCredito[];
        } catch (error) {
            console.error('💥 Erro ao buscar extrato:', error);
            return [];
        }
    }

    /**
     * Obtém o resumo de transações usando Edge Function
     */
    async obterResumo(clienteId: string) {
        try {
            console.log('🔍 Buscando resumo via Edge Function para:', clienteId);
            
            const { data, error } = await supabase.functions.invoke('buscar-extrato', {
                body: { clienteId }
            });

            if (error || !data?.success) {
                console.error('❌ Erro ao buscar resumo:', error || data?.error);
                return {
                    totalRecargas: 0,
                    totalConsumos: 0,
                    quantidadeRecargas: 0,
                    quantidadeConsumos: 0,
                    transacoes: []
                };
            }

            console.log('✅ Resumo retornado:', data.resumo);
            
            return {
                ...data.resumo,
                transacoes: data.transacoes || []
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
