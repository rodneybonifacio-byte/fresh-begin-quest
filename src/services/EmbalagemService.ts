import type { IEmbalagem } from "../types/IEmbalagem";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class EmbalagemService extends BaseService<IEmbalagem> {

    protected endpoint = 'embalagens';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }
}