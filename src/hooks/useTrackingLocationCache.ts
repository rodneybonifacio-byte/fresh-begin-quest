import { useState, useCallback, useRef } from 'react';
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
  isLoading?: boolean;
}

interface TrackingCache {
  [codigoObjeto: string]: CacheEntry;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

// Hook otimizado para rastreio sob demanda
export const useTrackingLocationCache = (_codigosObjeto: string[] = []) => {
  const [cache, setCache] = useState<TrackingCache>({});
  const [loadingCodigos, setLoadingCodigos] = useState<Set<string>>(new Set());
  const fetchingRef = useRef<Set<string>>(new Set());

  // Buscar rastreio de um único pacote
  const fetchSingleTracking = useCallback(async (codigoObjeto: string): Promise<TrackingLocation | null> => {
    if (!codigoObjeto) return null;
    
    // Check cache first
    const cached = cache[codigoObjeto];
    const now = Date.now();
    if (cached && !cached.isLoading && (now - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`[TrackingCache] Using cached location for ${codigoObjeto}`);
      return cached.location;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current.has(codigoObjeto)) {
      console.log(`[TrackingCache] Already fetching ${codigoObjeto}`);
      return null;
    }

    try {
      fetchingRef.current.add(codigoObjeto);
      setLoadingCodigos(prev => new Set(prev).add(codigoObjeto));
      
      console.log(`[TrackingCache] Fetching on-demand: ${codigoObjeto}`);
      
      const { data, error } = await supabase.functions.invoke('testar-rastreio', {
        body: { codigo: codigoObjeto }
      });

      if (error) {
        console.error(`[TrackingCache] Error fetching ${codigoObjeto}:`, error);
        return null;
      }

      let location: TrackingLocation | null = null;
      
      if (data?.success && data?.analise?.ultimoEvento) {
        const evento = data.analise.ultimoEvento;
        location = {
          cidadeUf: evento.unidade?.cidadeUf || 'Localização indisponível',
          descricao: evento.descricao || '',
          dataCompleta: evento.dataCompleta || '',
          codigo: evento.codigo || ''
        };
      }

      // Update cache
      setCache(prev => ({
        ...prev,
        [codigoObjeto]: {
          location,
          timestamp: Date.now(),
          codigoObjeto,
          isLoading: false
        }
      }));

      return location;
    } catch (err) {
      console.error(`[TrackingCache] Exception fetching ${codigoObjeto}:`, err);
      return null;
    } finally {
      fetchingRef.current.delete(codigoObjeto);
      setLoadingCodigos(prev => {
        const next = new Set(prev);
        next.delete(codigoObjeto);
        return next;
      });
    }
  }, [cache]);

  // Get location for a specific codigo (from cache only)
  const getLocation = useCallback((codigoObjeto: string): TrackingLocation | null => {
    return cache[codigoObjeto]?.location || null;
  }, [cache]);

  // Check if a codigo is currently loading
  const isLoadingCodigo = useCallback((codigoObjeto: string): boolean => {
    return loadingCodigos.has(codigoObjeto);
  }, [loadingCodigos]);

  // Clear cache
  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  return {
    cache,
    isLoading: loadingCodigos.size > 0,
    loadingCodigos,
    getLocation,
    fetchSingleTracking,
    isLoadingCodigo,
    refresh: clearCache
  };
};
