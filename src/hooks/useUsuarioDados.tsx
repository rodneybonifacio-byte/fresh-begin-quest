import { useFetchQuery } from './useFetchQuery';
import { UsuarioDadosService, type DadosUsuarioCompletos } from '../services/UsuarioDadosService';

export function useUsuarioDados(enabled: boolean = true) {
    const service = new UsuarioDadosService();

    return useFetchQuery<DadosUsuarioCompletos>(
        ['dados-usuario-completos'],
        async () => {
            const response = await service.buscarDadosCompletos();
            return response;
        },
        {
            enabled,
            staleTime: 5 * 60 * 1000, // 5 minutos
        }
    );
}
