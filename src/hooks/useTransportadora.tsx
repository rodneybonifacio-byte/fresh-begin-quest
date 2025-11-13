import { TransportadoraService } from '../services/TransportadoraService';
import type { ITransportadora } from '../types/transportadora';
import { useFetchQuery } from './useFetchQuery';

export function useTransportadora() {
    const service = new TransportadoraService();
    return useFetchQuery<ITransportadora[] | null>(['transportadoras'], async () => {
        const response = await service.getAll();
        return response.data ?? [];
    });
}
