import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';

export const useFetchQuery = <T,>(
    key: any,
    serviceFn: () => Promise<T>,
    options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: [...key],
    queryFn: serviceFn,
    staleTime: 60000 * 3,
    retry: false,
    ...options
})
