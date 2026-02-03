import { supabase } from '../integrations/supabase/client';

export interface IEmissaoExterna {
    id: string;
    cliente_id: string;
    remetente_id: string | null;
    codigo_objeto: string;
    servico: string | null;
    contrato: string | null;
    destinatario_nome: string;
    destinatario_logradouro: string | null;
    destinatario_numero: string | null;
    destinatario_bairro: string | null;
    destinatario_cidade: string | null;
    destinatario_uf: string | null;
    destinatario_cep: string | null;
    valor_venda: number;
    valor_custo: number;
    status: string;
    origem: string;
    observacao: string | null;
    created_at: string;
    updated_at: string;
    // Campos do join com remetentes
    remetente?: {
        id: string;
        nome: string;
        cpf_cnpj: string;
    };
}

export interface IEmissaoExternaCreate {
    cliente_id: string;
    remetente_id?: string;
    codigo_objeto: string;
    servico?: string;
    contrato?: string;
    destinatario_nome: string;
    destinatario_logradouro?: string;
    destinatario_numero?: string;
    destinatario_bairro?: string;
    destinatario_cidade?: string;
    destinatario_uf?: string;
    destinatario_cep?: string;
    valor_venda: number;
    valor_custo: number;
    status?: string;
    origem?: string;
    observacao?: string;
}

export class EmissoesExternasService {
    
    /**
     * Lista todas as emissões externas com filtros opcionais
     */
    async listar(filtros?: {
        cliente_id?: string;
        remetente_id?: string;
        status?: string;
        codigo_objeto?: string;
        dataInicio?: string;
        dataFim?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: IEmissaoExterna[]; count: number }> {
        let query = supabase
            .from('emissoes_externas')
            .select(`
                *,
                remetente:remetentes(id, nome, cpf_cnpj)
            `, { count: 'exact' });

        if (filtros?.cliente_id) {
            query = query.eq('cliente_id', filtros.cliente_id);
        }
        if (filtros?.remetente_id) {
            query = query.eq('remetente_id', filtros.remetente_id);
        }
        if (filtros?.status) {
            query = query.eq('status', filtros.status);
        }
        if (filtros?.codigo_objeto) {
            query = query.ilike('codigo_objeto', `%${filtros.codigo_objeto}%`);
        }
        if (filtros?.dataInicio) {
            query = query.gte('created_at', filtros.dataInicio);
        }
        if (filtros?.dataFim) {
            query = query.lte('created_at', filtros.dataFim);
        }

        query = query.order('created_at', { ascending: false });

        if (filtros?.limit) {
            query = query.limit(filtros.limit);
        }
        if (filtros?.offset) {
            query = query.range(filtros.offset, filtros.offset + (filtros.limit || 10) - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Erro ao listar emissões externas:', error);
            throw error;
        }

        return { data: (data || []) as IEmissaoExterna[], count: count || 0 };
    }

    /**
     * Busca uma emissão externa por ID
     */
    async buscarPorId(id: string): Promise<IEmissaoExterna | null> {
        const { data, error } = await supabase
            .from('emissoes_externas')
            .select(`
                *,
                remetente:remetentes(id, nome, cpf_cnpj)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar emissão externa:', error);
            throw error;
        }

        return data as IEmissaoExterna;
    }

    /**
     * Busca uma emissão externa por código de objeto
     */
    async buscarPorCodigoObjeto(codigoObjeto: string): Promise<IEmissaoExterna | null> {
        const { data, error } = await supabase
            .from('emissoes_externas')
            .select(`
                *,
                remetente:remetentes(id, nome, cpf_cnpj)
            `)
            .eq('codigo_objeto', codigoObjeto)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Erro ao buscar emissão externa:', error);
            throw error;
        }

        return data as IEmissaoExterna | null;
    }

    /**
     * Cria uma nova emissão externa
     */
    async criar(emissao: IEmissaoExternaCreate): Promise<IEmissaoExterna> {
        const { data, error } = await supabase
            .from('emissoes_externas')
            .insert(emissao)
            .select(`
                *,
                remetente:remetentes(id, nome, cpf_cnpj)
            `)
            .single();

        if (error) {
            console.error('Erro ao criar emissão externa:', error);
            throw error;
        }

        return data as IEmissaoExterna;
    }

    /**
     * Atualiza uma emissão externa
     */
    async atualizar(id: string, emissao: Partial<IEmissaoExternaCreate>): Promise<IEmissaoExterna> {
        const { data, error } = await supabase
            .from('emissoes_externas')
            .update(emissao)
            .eq('id', id)
            .select(`
                *,
                remetente:remetentes(id, nome, cpf_cnpj)
            `)
            .single();

        if (error) {
            console.error('Erro ao atualizar emissão externa:', error);
            throw error;
        }

        return data as IEmissaoExterna;
    }

    /**
     * Remove uma emissão externa
     */
    async remover(id: string): Promise<void> {
        const { error } = await supabase
            .from('emissoes_externas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao remover emissão externa:', error);
            throw error;
        }
    }

    /**
     * Busca totais para dashboard
     */
    async buscarTotais(cliente_id?: string): Promise<{
        total: number;
        totalVenda: number;
        totalCusto: number;
        lucro: number;
    }> {
        let query = supabase
            .from('emissoes_externas')
            .select('valor_venda, valor_custo');

        if (cliente_id) {
            query = query.eq('cliente_id', cliente_id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar totais:', error);
            throw error;
        }

        const totais = (data || []).reduce(
            (acc, item) => ({
                total: acc.total + 1,
                totalVenda: acc.totalVenda + Number(item.valor_venda || 0),
                totalCusto: acc.totalCusto + Number(item.valor_custo || 0),
            }),
            { total: 0, totalVenda: 0, totalCusto: 0 }
        );

        return {
            ...totais,
            lucro: totais.totalVenda - totais.totalCusto,
        };
    }
}
