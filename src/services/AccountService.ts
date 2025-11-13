import type { IResponse } from '../types/IResponse';
import type { IUserProfile } from '../types/user/IUserProfile';
import { CustomHttpClient } from '../utils/http-axios-client';
import { BaseService } from './BaseService';

export class AccountService extends BaseService<any> {
    protected endpoint = 'account';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }

    public async getProfile(): Promise<IUserProfile> {
        const response = await this.httpClient.get<IResponse<IUserProfile>>(`${this.endpoint}/profile`);
        return response.data;
    }
    
    public async updateProfile(data: Partial<IUserProfile>): Promise<IUserProfile> {
        const response = await this.httpClient.put<IResponse<IUserProfile>>(`${this.endpoint}/profile`, data);
        return response.data;
    }
}
