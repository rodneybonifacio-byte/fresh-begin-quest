import type { ICliente } from '../types/ICliente';
import type { IResponse } from '../types/IResponse';
import type { ResponseLogin } from '../types/responseLogin';
import type { IClienteToFilter } from '../types/viewModel/IClienteToFilter';
import { CustomHttpClient } from '../utils/http-axios-client';
import type { FormCreditoCliente } from '../utils/schames/clientes';
import { BaseService } from './BaseService';

export class ClienteService extends BaseService<ICliente> {
    protected endpoint = 'clientes';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    async adicionarCredito(id: string, item: FormCreditoCliente): Promise<any> {
        return await this.httpClient.put<any, FormCreditoCliente>(`${this.endpoint}/${id}/add-saldo`, item);
    }

    //obter saldo do cliente
    async obterSaldo(id: string): Promise<any> {
        return await this.httpClient.get<any>(`${this.endpoint}/obterSaldo/${id}`);
    }

    async loginAsClient(data: { email: string }): Promise<ResponseLogin> {
        return await this.httpClient.post<ResponseLogin>(`${this.endpoint}/login-as-client`, data);
    }

    async obterAtivos(): Promise<IClienteToFilter[]> {
        return await this.httpClient.get<IClienteToFilter[]>(`${this.endpoint}/filter`);
    }

    public async dashboard(): Promise<any> {
        const response = await this.httpClient.get<IResponse<any>>(`${this.endpoint}/dashboard`);
        return response.data;
    }

    async deletarCliente(id: string): Promise<void> {
        await this.httpClient.delete<void>(`${this.endpoint}/${id}`);
    }
}
