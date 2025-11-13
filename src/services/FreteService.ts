import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class FreteService extends BaseService<any> {

    protected endpoint = 'frete';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    async calculadoraFrete(item: any): Promise<any> {
        return await this.httpClient.post<any, any>(`${this.endpoint}/cotacao`, item);
    }

    // Método para criar uma nova cotação de frete
    public override create<TResponse, TRequest>(data: TRequest) {
        return this.httpClient.post<TResponse, TRequest>(`${this.endpoint}/emitir-etiqueta`, data);
    }
}