import type { IRole } from "../types/IRole";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class RoleService extends BaseService<IRole> {

    protected endpoint = 'roles';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }
}