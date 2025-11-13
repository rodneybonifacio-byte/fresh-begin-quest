import type { IRemetente } from "../types/IRemetente";
import type { IResponse } from "../types/IResponse";
import type { IRegraFormacaoPrecoFrete } from "../types/regra-formacao/IRegraFormacaoPrecoFrete";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class RemetenteService extends BaseService<IRemetente> {

    protected endpoint = 'remetentes';

    constructor() {
        super(new CustomHttpClient());
    }

    async obterConfiguracaoPorId(remetenteId: string): Promise<IRegraFormacaoPrecoFrete> {
        return await this.httpClient.get<IRegraFormacaoPrecoFrete>(`${this.endpoint}/config/${remetenteId}`);
    }

    async createConfig<TResponse, TRequest>(item: TRequest): Promise<IResponse<TResponse>> {
        return await this.httpClient.post<IResponse<TResponse>, TRequest>(`${this.endpoint}/config`, item);
    }

    async createMultipleConfigs<TResponse, TRequest>(items: TRequest[]): Promise<IResponse<TResponse>> {
        return await this.httpClient.post<IResponse<TResponse>, TRequest[]>(`${this.endpoint}/config/bulk`, items);
    }
}