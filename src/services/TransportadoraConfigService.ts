import type { ITransportadoraConfig } from "../types/ITransportadoraConfig";
import type { IResponse } from "../types/IResponse";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class TransportadoraConfigService extends BaseService<ITransportadoraConfig> {
    protected endpoint = 'transportadoras';

    constructor() {
        super(new CustomHttpClient());
    }

    /**
     * Busca todas as configurações de transportadora de um cliente
     */
    async obterConfiguracoesPorCliente(clienteId: string): Promise<IResponse<ITransportadoraConfig[]>> {
        return await this.httpClient.get<IResponse<ITransportadoraConfig[]>>(`${this.endpoint}/cliente/${clienteId}`);
    }

    /**
     * Cria ou atualiza uma configuração de transportadora
     */
    async salvarConfiguracao(clienteId: string, configuracao: Omit<ITransportadoraConfig, 'id' | 'clienteId'>): Promise<IResponse<ITransportadoraConfig>> {
        return await this.httpClient.post<IResponse<ITransportadoraConfig>>(`${this.endpoint}`, {
            ...configuracao,
            clienteId
        });
    }

    /**
     * Atualiza uma configuração existente
     */
    async atualizarConfiguracao(configuracaoId: string, configuracao: Partial<ITransportadoraConfig>): Promise<IResponse<ITransportadoraConfig>> {
        return await this.httpClient.put<IResponse<ITransportadoraConfig>, Partial<ITransportadoraConfig>>(`${this.endpoint}/${configuracaoId}`, configuracao);
    }

    /**
     * Remove uma configuração de transportadora
     */
    async removerConfiguracao(configuracaoId: string): Promise<void> {
        return await this.httpClient.delete(`${this.endpoint}/${configuracaoId}`);
    }

    /**
     * Verifica se uma transportadora já está configurada para o cliente
     */
    async verificarTransportadoraExistente(clienteId: string, transportadora: string): Promise<IResponse<{ existe: boolean, configuracao?: ITransportadoraConfig }>> {
        return await this.httpClient.get<IResponse<{ existe: boolean, configuracao?: ITransportadoraConfig }>>(`${this.endpoint}/verificar/${clienteId}/${transportadora}`);
    }
}