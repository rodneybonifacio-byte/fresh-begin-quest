import type { IEmissaoViewModel } from "../types/emissao/IEmissaoViewModel";
import type { IResponse } from "../types/IResponse";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class IntegracaoService extends BaseService<any> {

    protected endpoint = 'integracoes';

    constructor() {
        super(new CustomHttpClient());
    }

    public async importaPedidos(params?: Record<string, string | number>, subPath?: string): Promise<IResponse<IEmissaoViewModel>> {
        const url = this.buildUrl(params, subPath);
        return await this.httpClient.get<IResponse<IEmissaoViewModel>>(url);
    }
}