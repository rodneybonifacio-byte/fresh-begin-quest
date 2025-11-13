import type { IDashboardGeral } from "../types/dashboard/IDashboardGeral";
import type { IRelatorioDesempenhoResponse } from "../types/dashboard/IRelatorioDesempenho";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

interface IDashboardRelatorioDesempenhoGeral { periodo?: string, remetenteId?: string, dataIni?: string, dataFim?: string, regiaoUf?: string }

export class DashboardService extends BaseService<any> {

    protected endpoint = 'dashboard';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    async getDashboard(params: { periodo?: string, cliente?: string }): Promise<IDashboardGeral> {
        const response = await this.httpClient.get<IDashboardGeral>(this.endpoint, { params });
        return response;
    }

    async getRelatorioDesempenho(params: IDashboardRelatorioDesempenhoGeral): Promise<IRelatorioDesempenhoResponse> {
        const response = await this.httpClient.get<IRelatorioDesempenhoResponse>(`${this.endpoint}/relatorio-desempenho`, { params });
        return response;
    }
}