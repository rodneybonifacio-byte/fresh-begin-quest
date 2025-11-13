import type { IEmissaoOrdemColeta } from "../types/emissao/IEmissaoOrdemColeta";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class OrdemColetaService extends BaseService<IEmissaoOrdemColeta> {

    protected endpoint = 'emissoes/ordem-coleta';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }
}