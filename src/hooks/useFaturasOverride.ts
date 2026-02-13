import { useState, useEffect, useCallback } from 'react';
import { getSupabaseWithAuth } from '../integrations/supabase/custom-auth';

interface FaturaOverride {
  fatura_id: string;
  valor_venda: number | null;
  valor_custo: number | null;
  valor_lucro: number | null;
  observacao?: string | null;
}

export function useFaturasOverride(faturaIds: string[]) {
  const [overrides, setOverrides] = useState<Record<string, FaturaOverride>>({});
  const [isLoading, setIsLoading] = useState(false);

  const carregarOverrides = useCallback(async () => {
    if (faturaIds.length === 0) return;
    
    try {
      setIsLoading(true);
      const supabase = getSupabaseWithAuth();
      
      const { data, error } = await supabase
        .from('faturas_override')
        .select('*')
        .in('fatura_id', faturaIds);
      
      if (error) {
        console.error('Erro ao carregar overrides:', error);
        return;
      }
      
      if (data) {
        const map: Record<string, FaturaOverride> = {};
        data.forEach((item) => {
          map[item.fatura_id] = {
            fatura_id: item.fatura_id,
            valor_venda: item.valor_venda,
            valor_custo: item.valor_custo,
            valor_lucro: item.valor_lucro,
            observacao: item.observacao,
          };
        });
        setOverrides(map);
        console.log('📋 Overrides carregados:', Object.keys(map).length);
      }
    } catch (err) {
      console.error('Erro ao buscar overrides:', err);
    } finally {
      setIsLoading(false);
    }
  }, [faturaIds.join(',')]);

  useEffect(() => {
    carregarOverrides();
  }, [carregarOverrides]);

  const getOverride = (faturaId: string): FaturaOverride | null => overrides[faturaId] || null;

  const aplicarOverride = useCallback(<T extends { id: string; totalFaturado?: string; totalCusto?: string }>(fatura: T): T & { _lucroOverride?: number; _hasOverride?: boolean } => {
    const override = overrides[fatura.id];
    if (override && override.valor_venda !== null) {
      return {
        ...fatura,
        totalFaturado: override.valor_venda?.toString() || fatura.totalFaturado,
        totalCusto: override.valor_custo?.toString() || fatura.totalCusto,
        _lucroOverride: override.valor_lucro || undefined,
        _hasOverride: true,
      };
    }
    return fatura;
  }, [overrides]);

  return {
    overrides,
    isLoading,
    getOverride,
    aplicarOverride,
    recarregar: carregarOverrides,
  };
}
