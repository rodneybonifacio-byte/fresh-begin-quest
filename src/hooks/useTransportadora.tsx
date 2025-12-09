import { TransportadoraService } from '../services/TransportadoraService';
import type { ITransportadora } from '../types/transportadora';
import { useFetchQuery } from './useFetchQuery';

export function useTransportadora(enabled = true) {
    const service = new TransportadoraService();
    return useFetchQuery<ITransportadora[] | null>(
        ['transportadoras'], 
        async () => {
            try {
                const response = await service.getAll();
                return response.data ?? [];
            } catch (error) {
                console.warn('Não foi possível carregar transportadoras:', error);
                return [];
            }
        },
        { enabled }
    );
}
