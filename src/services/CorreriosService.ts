import type { ICorreiosCredencial } from "../types/ICorreiosCredencial";
import type { IResponse } from "../types/IResponse";
import type { IRastreioResponse } from "../types/rastreio/IRastreio";
import { CustomHttpClient } from "../utils/http-axios-client";
import type { FormCorreiosAporte } from "../utils/schames/contratoCorreiosAporte";
import { BaseService } from "./BaseService";

export class CorreriosService extends BaseService<any> {

    protected endpoint = 'frete';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    async cotacao(item: any): Promise<any> {
        return await this.httpClient.post<any, any>(`${this.endpoint}/cotacao`, item);
    }

    async rastreio(codigo: string): Promise<IRastreioResponse> {
        console.log('🔍 Buscando rastreio para código:', codigo);
        const response = await this.httpClient.get<IResponse<IRastreioResponse>>(`rastrear?codigo=${codigo}`);
        console.log('📦 Resposta rastreio API:', JSON.stringify(response).substring(0, 500));
        // A API retorna { data: { data: ... } } - httpClient.get já extrai o primeiro nível
        return response.data || response as unknown as IRastreioResponse;
    }

    public async getCredenciais(): Promise<IResponse<any>> {
        return await this.httpClient.get<IResponse<any>>(`${this.endpoint}/credenciais`);
    }

    async createCredencial(item: ICorreiosCredencial): Promise<any> {
        const response = await this.httpClient.post<ICorreiosCredencial, ICorreiosCredencial>(`${this.endpoint}/credenciais`, item);
        return response;
    }

    async updateCredencial(item: ICorreiosCredencial, id: string): Promise<ICorreiosCredencial> {
        const response = await this.httpClient.put<ICorreiosCredencial>(`${this.endpoint}/credenciais/${id}`, item);
        return response;
    }

    async updateCredencialAtivar(id: string): Promise<ICorreiosCredencial> {
        const response = await this.httpClient.put<ICorreiosCredencial>(`${this.endpoint}/credenciais/${id}/ativar`);
        return response;
    }

    async aplicarAporte(id: string, item: FormCorreiosAporte): Promise<any> {
        return await this.httpClient.put<any, FormCorreiosAporte>(`${this.endpoint}/contrato/adicionar-aporte/${id}`, item);
    }
}