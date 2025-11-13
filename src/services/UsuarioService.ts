import type { IUsuario } from "../types/IUsuario";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class UsuarioService extends BaseService<IUsuario> {

    protected endpoint = 'usuarios';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }
}