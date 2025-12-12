import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';

interface TrackingLocation {
  cidadeUf: string;
  descricao: string;
  dataCompleta: string;
  codigo: string;
}

interface CacheEntry {
  location: TrackingLocation | null;
  timestamp: number;
  codigoObjeto: string;
}

interface TrackingCache {
  [codigoObjeto: string]: CacheEntry;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
const BATCH_SIZE = 10; // Process 10 at a time to avoid overloading API
const BATCH_DELAY_MS = 500; // 500ms between batches

export const useTrackingLocationCache = (codigosObjeto: string[]) => {
  const [cache, setCache] = useState<TrackingCache>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Filter only EM_TRANSITO codes that need fetching
  const getCodigosToFetch = useCallback((codigos: string[]): string[] => {
    const now = Date.now();
    return codigos.filter(codigo => {
      if (!codigo) return false;
      const cached = cache[codigo];
      if (!cached) return true;
      // Re-fetch if cache expired (1 hour)
      return now - cached.timestamp > CACHE_TTL_MS;
    });
  }, [cache]);

  const fetchSingleTracking = async (codigoObjeto: string): Promise<TrackingLocation | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('testar-rastreio', {
        body: { codigo: codigoObjeto }
      });

      if (error) {
        console.error(`[TrackingCache] Error fetching ${codigoObjeto}:`, error);
        return null;
      }

      if (data?.success && data?.analise?.ultimoEvento) {
        const evento = data.analise.ultimoEvento;
        return {
          cidadeUf: evento.unidade?.cidadeUf || 'Localização indisponível',
          descricao: evento.descricao || '',
          dataCompleta: evento.dataCompleta || '',
          codigo: evento.codigo || ''
        };
      }

      return null;
    } catch (err) {
      console.error(`[TrackingCache] Exception fetching ${codigoObjeto}:`, err);
      return null;
    }
  };

  const fetchBatchTracking = useCallback(async (codigos: string[]) => {
    if (fetchingRef.current || codigos.length === 0) return;
    
    fetchingRef.current = true;
    setIsLoading(true);

    console.log(`[TrackingCache] Fetching ${codigos.length} tracking codes...`);

    const newCacheEntries: TrackingCache = {};
    const now = Date.now();

    // Process in batches
    for (let i = 0; i < codigos.length; i += BATCH_SIZE) {
      if (!mountedRef.current) break;

      const batch = codigos.slice(i, i + BATCH_SIZE);
      console.log(`[TrackingCache] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(codigos.length / BATCH_SIZE)}`);

      // Fetch all in current batch in parallel
      const results = await Promise.allSettled(
        batch.map(codigo => fetchSingleTracking(codigo))
      );

      results.forEach((result, idx) => {
        const codigo = batch[idx];
        if (result.status === 'fulfilled') {
          newCacheEntries[codigo] = {
            location: result.value,
            timestamp: now,
            codigoObjeto: codigo
          };
        } else {
          newCacheEntries[codigo] = {
            location: null,
            timestamp: now,
            codigoObjeto: codigo
          };
        }
      });

      // Small delay between batches
      if (i + BATCH_SIZE < codigos.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    if (mountedRef.current) {
      setCache(prev => ({ ...prev, ...newCacheEntries }));
      setLastFetchTime(new Date());
    }

    setIsLoading(false);
    fetchingRef.current = false;

    console.log(`[TrackingCache] Completed. Cached ${Object.keys(newCacheEntries).length} locations.`);
  }, []);

  // Effect to fetch missing/expired cache entries
  useEffect(() => {
    const codigosToFetch = getCodigosToFetch(codigosObjeto);
    
    if (codigosToFetch.length > 0 && !fetchingRef.current) {
      // Only fetch first batch immediately, rest on demand or interval
      const limitedBatch = codigosToFetch.slice(0, BATCH_SIZE * 3); // Max 30 at once
      fetchBatchTracking(limitedBatch);
    }
  }, [codigosObjeto, getCodigosToFetch, fetchBatchTracking]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Get location for a specific codigo
  const getLocation = useCallback((codigoObjeto: string): TrackingLocation | null => {
    return cache[codigoObjeto]?.location || null;
  }, [cache]);

  // Manual refresh
  const refresh = useCallback(() => {
    const codigosToFetch = codigosObjeto.filter(c => c);
    if (codigosToFetch.length > 0) {
      // Clear cache and refetch
      setCache({});
      fetchBatchTracking(codigosToFetch.slice(0, BATCH_SIZE * 3));
    }
  }, [codigosObjeto, fetchBatchTracking]);

  return {
    cache,
    isLoading,
    lastFetchTime,
    getLocation,
    refresh
  };
};
