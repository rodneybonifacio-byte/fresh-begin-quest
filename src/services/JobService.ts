import { CustomHttpClient } from '../utils/http-axios-client';
import { BaseService } from './BaseService';

export class JobService extends BaseService<any> {
    protected endpoint = 'jobs-cron';

    constructor() {
        super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
    }
}
