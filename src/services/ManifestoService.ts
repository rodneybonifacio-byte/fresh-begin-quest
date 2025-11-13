import type { IEmissaoMimimalViewModel } from "../types/emissao/IEmissaoMimimalViewModel";
import type { IManifesto } from "../types/IManifesto";
import type { IResponse } from "../types/IResponse";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class ManifestoService extends BaseService<IManifesto> {

    protected endpoint = 'manifestos';

    constructor() {
        super(new CustomHttpClient());
    }

    async getByObjeto(params?: Record<string, string | number>): Promise<IResponse<IEmissaoMimimalViewModel>> {
        let url = `${this.endpoint}/getByObjeto`;

        // Se os parâmetros forem fornecidos, adiciona-los à URL
        if (params) {
            const queryString = new URLSearchParams(
                Object.entries(params).map(([key, value]) => [key, String(value)])
            ).toString();
            url += `?${queryString}`;
        }

        return await this.httpClient.get<IResponse<IEmissaoMimimalViewModel>>(url);
    }

    async enviarManifesto(item: IEmissaoMimimalViewModel[]): Promise<{  dados: string, manifestoId: string }> {
        const response = await this.httpClient.post<{  dados: string, manifestoId: string }, IEmissaoMimimalViewModel[]>(`${this.endpoint}`, item);
        return response;
    }
}