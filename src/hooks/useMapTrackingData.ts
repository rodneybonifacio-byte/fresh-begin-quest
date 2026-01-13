import { useState, useEffect, useCallback, useRef } from 'react';
import type { IEmissao } from '../types/IEmissao';
import { EmissaoService } from '../services/EmissaoService';

interface UseMapTrackingDataOptions {
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds, default 5 minutes
  filterInTransitOnly?: boolean;
}

interface TrackingState {
  emissoes: IEmissao[];
  isLoading: boolean;
  lastUpdated: Date | null;
  isRefreshing: boolean;
}

export const useMapTrackingData = (
  initialEmissoes: IEmissao[] = [],
  options: UseMapTrackingDataOptions = {}
) => {
  const {
    enabled = false, // Desabilitado por padrão para economizar recursos
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [state, setState] = useState<TrackingState>({
    emissoes: initialEmissoes,
    isLoading: false,
    lastUpdated: null,
    isRefreshing: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);
  const service = useRef(new EmissaoService());

  // Update emissoes when initialEmissoes changes
  useEffect(() => {
    if (initialEmissoes.length > 0) {
      setState(prev => ({
        ...prev,
        emissoes: initialEmissoes,
        lastUpdated: new Date(),
      }));
    }
  }, [initialEmissoes]);

  // Fetch updated data for in-transit packages
  const refreshInTransitData = useCallback(async () => {
    if (!enabled || !isVisibleRef.current) return;

    // Get only EM_TRANSITO packages to update
    const inTransitPackages = state.emissoes.filter(
      e => e.status === 'EM_TRANSITO'
    );

    if (inTransitPackages.length === 0) {
      console.log('[MapTracking] No packages in transit to refresh');
      return;
    }

    setState(prev => ({ ...prev, isRefreshing: true }));

    try {
      console.log(`[MapTracking] Refreshing ${inTransitPackages.length} in-transit packages...`);

      // Fetch fresh data for EM_TRANSITO status
      const response = await service.current.getAll({
        status: 'EM_TRANSITO',
        limit: 100,
        offset: 0,
      });

      if (response?.data) {
        // Merge with existing data - update EM_TRANSITO, keep others
        const updatedEmissoes = state.emissoes.map(existing => {
          if (existing.status !== 'EM_TRANSITO') return existing;
          
          const updated = response.data.find(
            (fresh: IEmissao) => fresh.id === existing.id || fresh.codigoObjeto === existing.codigoObjeto
          );
          
          return updated || existing;
        });

        setState(prev => ({
          ...prev,
          emissoes: updatedEmissoes,
          lastUpdated: new Date(),
          isRefreshing: false,
        }));

        console.log(`[MapTracking] Updated ${response.data.length} packages`);
      }
    } catch (error) {
      console.error('[MapTracking] Error refreshing data:', error);
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [enabled, state.emissoes]);

  // Manual refresh function
  const refresh = useCallback(() => {
    refreshInTransitData();
  }, [refreshInTransitData]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!enabled) return;

    // Set up interval
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        refreshInTransitData();
      }
    }, refreshInterval);

    console.log(`[MapTracking] Auto-refresh enabled: every ${refreshInterval / 1000}s`);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refreshInterval, refreshInTransitData]);

  // Handle visibility change to pause/resume updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (!document.hidden) {
        console.log('[MapTracking] Tab became visible, refreshing...');
        refreshInTransitData();
      } else {
        console.log('[MapTracking] Tab hidden, pausing updates');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshInTransitData]);

  return {
    emissoes: state.emissoes,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    lastUpdated: state.lastUpdated,
    refresh,
  };
};

