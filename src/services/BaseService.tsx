import type { IResponse } from "../types/IResponse";
import type { IHttpClient } from "../utils/http-axios-client";

export abstract class BaseService<T> {
    protected abstract endpoint: string; // Cada serviço definirá seu próprio endpoint
    protected httpClient: IHttpClient;

    constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient;
    }

    /** Monta URL com query params e path adicional */
    protected buildUrl(params?: Record<string, string | number>, subPath?: string): string {
        let url = `${this.endpoint}${subPath ? `/${subPath}` : ''}`;

        if (params) {
            const queryString = new URLSearchParams(
                Object.entries(params).map(([key, value]) => [key, String(value)])
            ).toString();
            url += `${queryString ? `?${queryString}` : ''}`;
        }

        return url;
    }

    // Método para obter todos os itens com suporte a parâmetros de consulta
    async getAll(params?: Record<string, string | number>, urlEndpoint?: string): Promise<IResponse<T[]>> {
        const url = this.buildUrl(params, urlEndpoint);
        return await this.httpClient.get<IResponse<T[]>>(url);
    }

    async getById(id: number | string): Promise<IResponse<T>> {
        return await this.httpClient.get<IResponse<T>>(`${this.endpoint}/${id}`);
    }

    public async getWithParams(params?: Record<string, string | number>, subPath?: string): Promise<IResponse<T[]>> {
        const url = this.buildUrl(params, subPath);
        return await this.httpClient.get<IResponse<T[]>>(url);
    }

    async create<TResponse, TRequest>(item: TRequest): Promise<IResponse<TResponse>> {
        return await this.httpClient.post<IResponse<TResponse>, TRequest>(`${this.endpoint}`, item);
    }

    async update<TResponse, TRequest>(id: number | string, item: TRequest): Promise<TResponse> {
        return await this.httpClient.put<TResponse, TRequest>(`${this.endpoint}/${id}`, item);
    }

    async delete(id: number | string): Promise<void> {
        await this.httpClient.delete<void>(`${this.endpoint}/${id}`);
    }
}
