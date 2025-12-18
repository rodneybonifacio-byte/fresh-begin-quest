import type { IResponse } from "../types/IResponse";
import { supabase } from "../integrations/supabase/client";

export interface IIntegracaoNuvemshop {
    userId: string;
    accessToken: string;
    storeId: string;
}

export interface IIntegracao {
    id?: string;
    clienteId: string;
    plataforma: string;
    storeId?: string;
    remetenteId?: string;
    credenciais: IIntegracaoNuvemshop | Record<string, any>;
    ativo?: boolean;
    webhookUrl?: string;
    criadoEm?: string;
    atualizadoEm?: string;
}

export class IntegracaoService {
    
    private getSupabaseWithAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token de autenticação não encontrado');
        }
        
        return supabase;
    }

    private getClienteId(): string {
        const userDataStr = localStorage.getItem('userData');
        if (!userDataStr) {
            throw new Error('Dados do usuário não encontrados');
        }
        const userData = JSON.parse(userDataStr);
        return userData.clienteId || userData.id;
    }

    public async importaPedidos(_params?: Record<string, string | number>, _subPath?: string): Promise<IResponse<any>> {
        // Método mantido para compatibilidade, mas não implementado para Supabase
        console.warn('importaPedidos não implementado para integração Supabase');
        return {
            message: 'Método não implementado',
            data: null,
        };
    }

    public async importarPedidosShopify(integracaoId: string, remetenteId: string): Promise<IResponse<any>> {
        try {
            const clienteId = this.getClienteId();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            const response = await fetch(`${supabaseUrl}/functions/v1/shopify-importar-pedidos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                    integracaoId,
                    clienteId,
                    remetenteId,
                    status: 'unfulfilled',
                    limit: 50,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao importar pedidos');
            }

            const data = await response.json();
            return {
                message: `Importação concluída: ${data.importados} pedidos importados`,
                data,
            };
        } catch (error) {
            console.error('Erro ao importar pedidos Shopify:', error);
            throw error;
        }
    }

    public async processarPedidoShopify(pedidoId: string): Promise<IResponse<any>> {
        try {
            const clienteId = this.getClienteId();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const userToken = localStorage.getItem('accessToken');

            const response = await fetch(`${supabaseUrl}/functions/v1/shopify-processar-pedido`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                    pedidoId,
                    clienteId,
                    userToken,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao processar pedido');
            }

            const data = await response.json();
            return {
                message: 'Etiqueta gerada com sucesso!',
                data,
            };
        } catch (error) {
            console.error('Erro ao processar pedido Shopify:', error);
            throw error;
        }
    }

    public async getPedidosImportados(): Promise<IResponse<any[]>> {
        try {
            const supabaseAuth = this.getSupabaseWithAuth();
            const clienteId = this.getClienteId();

            const { data: pedidos, error } = await supabaseAuth
                .from('pedidos_importados')
                .select('*, remetentes(*)')
                .eq('cliente_id', clienteId)
                .order('criado_em', { ascending: false });

            if (error) {
                throw new Error(error.message);
            }

            return {
                message: 'Pedidos carregados com sucesso',
                data: pedidos || [],
            };
        } catch (error) {
            console.error('Erro ao buscar pedidos importados:', error);
            throw error;
        }
    }

    public async create(data: {
        credenciais: IIntegracaoNuvemshop | Record<string, any>; 
        plataforma: string;
        remetenteId?: string;
    }): Promise<IResponse<IIntegracao>> {
        try {
            const supabaseAuth = this.getSupabaseWithAuth();
            const clienteId = this.getClienteId();

            // Gerar webhook URL para a integração
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const webhookUrl = `${supabaseUrl}/functions/v1/nuvemshop-webhook`;

            const integracaoData: any = {
                cliente_id: clienteId,
                plataforma: data.plataforma,
                store_id: data.plataforma === 'nuvemshop' ? (data.credenciais as IIntegracaoNuvemshop).storeId : undefined,
                remetente_id: data.remetenteId,
                credenciais: data.credenciais,
                ativo: true,
                webhook_url: webhookUrl,
            };

            const { data: integracao, error } = await supabaseAuth
                .from('integracoes')
                .insert(integracaoData)
                .select()
                .single();

            if (error) {
                console.error('Erro ao criar integração:', error);
                throw new Error(error.message);
            }

            return {
                message: 'Integração criada com sucesso! Configure o webhook na sua loja.',
                data: {
                    id: integracao.id,
                    clienteId: integracao.cliente_id,
                    plataforma: integracao.plataforma,
                    storeId: integracao.store_id,
                    remetenteId: integracao.remetente_id,
                    credenciais: integracao.credenciais,
                    ativo: integracao.ativo,
                    webhookUrl: integracao.webhook_url,
                    criadoEm: integracao.criado_em,
                    atualizadoEm: integracao.atualizado_em,
                } as IIntegracao,
            };
        } catch (error) {
            console.error('Erro no serviço de integração:', error);
            throw error;
        }
    }

    public async update(id: string, data: Partial<IIntegracao>): Promise<IResponse<IIntegracao>> {
        try {
            const supabaseAuth = this.getSupabaseWithAuth();

            const updateData: any = {};
            if (data.credenciais) updateData.credenciais = data.credenciais;
            if (data.remetenteId !== undefined) updateData.remetente_id = data.remetenteId;
            if (data.ativo !== undefined) updateData.ativo = data.ativo;

            const { data: integracao, error } = await supabaseAuth
                .from('integracoes')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return {
                message: 'Integração atualizada com sucesso!',
                data: {
                    id: integracao.id,
                    clienteId: integracao.cliente_id,
                    plataforma: integracao.plataforma,
                    storeId: integracao.store_id,
                    remetenteId: integracao.remetente_id,
                    credenciais: integracao.credenciais,
                    ativo: integracao.ativo,
                    webhookUrl: integracao.webhook_url,
                    criadoEm: integracao.criado_em,
                    atualizadoEm: integracao.atualizado_em,
                } as IIntegracao,
            };
        } catch (error) {
            console.error('Erro ao atualizar integração:', error);
            throw error;
        }
    }

    public async getAll(): Promise<IResponse<IIntegracao[]>> {
        try {
            const supabaseAuth = this.getSupabaseWithAuth();
            const clienteId = this.getClienteId();

            const { data: integracoes, error } = await supabaseAuth
                .from('integracoes')
                .select('*')
                .eq('cliente_id', clienteId)
                .order('criado_em', { ascending: false });

            if (error) {
                throw new Error(error.message);
            }

            return {
                message: 'Integrações carregadas com sucesso',
                data: (integracoes || []).map((i: any) => ({
                    id: i.id,
                    clienteId: i.cliente_id,
                    plataforma: i.plataforma,
                    storeId: i.store_id,
                    remetenteId: i.remetente_id,
                    credenciais: i.credenciais,
                    ativo: i.ativo,
                    webhookUrl: i.webhook_url,
                    criadoEm: i.criado_em,
                    atualizadoEm: i.atualizado_em,
                } as IIntegracao)),
            };
        } catch (error) {
            console.error('Erro ao buscar integrações:', error);
            throw error;
        }
    }

    public async delete(id: string): Promise<IResponse<void>> {
        try {
            const supabaseAuth = this.getSupabaseWithAuth();

            const { error } = await supabaseAuth
                .from('integracoes')
                .delete()
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }

            return {
                message: 'Integração removida com sucesso',
                data: undefined,
            };
        } catch (error) {
            console.error('Erro ao deletar integração:', error);
            throw error;
        }
    }
}
