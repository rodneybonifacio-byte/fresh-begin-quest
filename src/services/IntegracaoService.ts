import type { IResponse } from "../types/IResponse";
import authStore from "../authentica/authentication.store";

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
    private getToken(): string {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("Token de autenticação não encontrado");
        }
        return token;
    }

    private getClienteId(): string {
        const user: any = authStore.getUser();
        if (!user) {
            throw new Error("Dados do usuário não encontrados");
        }
        return user.clienteId || user.sub || user.id;
    }

    private async invokeFunction(action: string, body: Record<string, any>): Promise<any> {
        const token = this.getToken();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(`${supabaseUrl}/functions/v1/gerenciar-integracoes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, ...body }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro na função gerenciar-integracoes:", data);
            throw new Error(data.error || "Erro ao processar requisição");
        }

        return data;
    }

    private mapIntegracao(raw: any): IIntegracao {
        // Nunca expor credenciais descriptografadas no client
        // Apenas mostrar status de criptografia
        const credenciaisSafe = raw.credenciais?.encrypted 
            ? { encrypted: true } 
            : { configured: !!raw.credenciais };
        
        return {
            id: raw.id,
            clienteId: raw.cliente_id,
            plataforma: raw.plataforma,
            storeId: raw.store_id,
            remetenteId: raw.remetente_id,
            credenciais: credenciaisSafe,
            ativo: raw.ativo,
            webhookUrl: raw.webhook_url,
            criadoEm: raw.criado_em,
            atualizadoEm: raw.atualizado_em,
        };
    }

    public async importaPedidos(_params?: Record<string, string | number>, _subPath?: string): Promise<IResponse<any>> {
        console.warn("importaPedidos não implementado para integração Supabase");
        return {
            message: "Método não implementado",
            data: null,
        };
    }

    public async importarPedidosShopify(integracaoId: string, remetenteId: string): Promise<IResponse<any>> {
        try {
            const clienteId = this.getClienteId();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            const response = await fetch(`${supabaseUrl}/functions/v1/shopify-importar-pedidos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                    integracaoId,
                    clienteId,
                    remetenteId,
                    status: "unfulfilled",
                    limit: 50,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao importar pedidos");
            }

            const data = await response.json();
            return {
                message: `Importação concluída: ${data.importados} pedidos importados`,
                data,
            };
        } catch (error) {
            console.error("Erro ao importar pedidos Shopify:", error);
            throw error;
        }
    }

    public async processarPedidoShopify(pedidoId: string): Promise<IResponse<any>> {
        const clienteId = this.getClienteId();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        // O token correto para a API externa é o mesmo usado pelo CustomHttpClient
        const userToken = localStorage.getItem("token");
        if (!userToken) {
            throw new Error("Token do usuário não encontrado para gerar etiqueta");
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/shopify-processar-pedido`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
                pedidoId,
                clienteId,
                userToken,
            }),
        });

        const data = await response.json();

        // Se saldo insuficiente (status 402), retorna os dados do PIX
        if (response.status === 402 && data.saldoInsuficiente) {
            return {
                message: data.message || "Saldo insuficiente",
                data: {
                    ...data,
                    saldoInsuficiente: true,
                },
            };
        }

        if (!response.ok) {
            throw new Error(data.error || "Erro ao processar pedido");
        }

        return {
            message: "Etiqueta gerada com sucesso!",
            data,
        };
    }

    public async getPedidosImportados(plataforma?: string, status?: string): Promise<IResponse<any[]>> {
        try {
            const result = await this.invokeFunction("list-pedidos", { plataforma, status });

            return {
                message: result.message || "Pedidos carregados",
                data: result.data || [],
            };
        } catch (error) {
            console.error("Erro ao buscar pedidos importados:", error);
            throw error;
        }
    }

    public async create(data: {
        credenciais: IIntegracaoNuvemshop | Record<string, any>;
        plataforma: string;
        remetenteId?: string;
    }): Promise<IResponse<IIntegracao>> {
        try {
            const result = await this.invokeFunction("create", {
                plataforma: data.plataforma,
                credenciais: data.credenciais,
                remetenteId: data.remetenteId,
            });

            return {
                message: result.message || "Integração criada com sucesso!",
                data: this.mapIntegracao(result.data),
            };
        } catch (error) {
            console.error("Erro ao criar integração:", error);
            throw error;
        }
    }

    public async update(id: string, data: Partial<IIntegracao>): Promise<IResponse<IIntegracao>> {
        try {
            const result = await this.invokeFunction("update", {
                id,
                credenciais: data.credenciais,
                remetenteId: data.remetenteId,
                ativo: data.ativo,
            });

            return {
                message: result.message || "Integração atualizada com sucesso!",
                data: this.mapIntegracao(result.data),
            };
        } catch (error) {
            console.error("Erro ao atualizar integração:", error);
            throw error;
        }
    }

    public async getAll(): Promise<IResponse<IIntegracao[]>> {
        try {
            const result = await this.invokeFunction("list", {});

            return {
                message: result.message || "Integrações carregadas",
                data: (result.data || []).map((i: any) => this.mapIntegracao(i)),
            };
        } catch (error) {
            console.error("Erro ao buscar integrações:", error);
            throw error;
        }
    }

    public async getCredenciais(integracaoId: string): Promise<IResponse<Record<string, any>>> {
        try {
            const result = await this.invokeFunction("get-credenciais", { id: integracaoId });

            return {
                message: result.message || "Credenciais recuperadas",
                data: result.data || {},
            };
        } catch (error) {
            console.error("Erro ao buscar credenciais:", error);
            throw error;
        }
    }

    public async delete(id: string): Promise<IResponse<void>> {
        try {
            const result = await this.invokeFunction("delete", { id });

            return {
                message: result.message || "Integração removida com sucesso",
                data: undefined,
            };
        } catch (error) {
            console.error("Erro ao deletar integração:", error);
            throw error;
        }
    }
}
