import type { IDestinatario } from "../types/IDestinatario";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class DestinatarioService extends BaseService<IDestinatario> {

    protected endpoint = 'clientes/destinatarios';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }
}