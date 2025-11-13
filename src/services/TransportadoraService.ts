import type { ITransportadora } from '../types/transportadora';
import { CustomHttpClient } from '../utils/http-axios-client';
import { BaseService } from './BaseService';

export class TransportadoraService extends BaseService<ITransportadora> {
    protected endpoint = 'transportadoras';

    constructor() {
        super(new CustomHttpClient());
    }
}
