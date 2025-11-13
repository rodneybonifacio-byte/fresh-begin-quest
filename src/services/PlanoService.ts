import type { IPlano } from "../types/IPlano";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class PlanoService extends BaseService<IPlano> {

    protected endpoint = 'planos';

    constructor() {
        super(new CustomHttpClient());
    }
}