import type { FaturaDto } from "../types/fatura/FaturaDto";
import type { IFatura } from "../types/IFatura";
import type { IResponse } from "../types/IResponse";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class FaturaService extends BaseService<IFatura> {

    protected endpoint = 'faturas';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    //obter saldo do cliente
    public async getWithParams<T = IFatura[]>(params?: Record<string, string | number>, subPath?: string): Promise<IResponse<T>> {
        const url = this.buildUrl(params, subPath);
        return await this.httpClient.get<IResponse<T>>(url);
    }


    public async findByIdWithParams(params?: Record<string, string | number>, subPath?: string): Promise<IResponse<FaturaDto>> {
        const url = this.buildUrl(params, subPath);
        return await this.httpClient.get<IResponse<FaturaDto>>(url);
    }

    async confirmaPagamento(id: string, data: FormData): Promise<IFatura> {
        const response = await this.httpClient.post<IFatura>(`${this.endpoint}/${id}/confirma-pagamento`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response;
    }

    async notificaViaWhatsApp(id: string, tipoNotificacao: "PADRAO" | "ATRASADA" = "PADRAO"): Promise<void> {
        await this.httpClient.patch(`${this.endpoint}/${id}/notifica-via-whatsapp?tipoNotificacao=${tipoNotificacao}`);
    }

    async gerarFaturaPdf(id: string, faturaId: string): Promise<{ dados: string; faturaId: string }> {
        const response = await this.httpClient.get<{ dados: string; faturaId: string }>(`${this.endpoint}/imprimir/${id}${faturaId ? `/${faturaId}` : '' }`);
        return response;
    }
}