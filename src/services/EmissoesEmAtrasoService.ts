import { supabase } from "../integrations/supabase/client";
import type { IEmissao } from "../types/IEmissao";
import { differenceInDays, parseISO } from "date-fns";

export interface EmissaoEmAtraso {
  id: string;
  emissao_id: string;
  codigo_objeto: string;
  data_previsao_entrega: string | null;
  detectado_em: string;
  cliente_id: string | null;
  remetente_nome: string | null;
  destinatario_nome: string | null;
  servico: string | null;
  diasAtraso?: number;
}

export async function fetchEmissoesEmAtraso(): Promise<EmissaoEmAtraso[]> {
  const { data, error } = await supabase
    .from('emissoes_em_atraso')
    .select('*');

  if (error) {
    console.error('Erro ao buscar emissões em atraso:', error);
    return [];
  }

  const hoje = new Date();
  
  // Calcular dias de atraso, filtrar máximo 30 dias e ordenar do mais atrasado para menos
  const processedData = (data || [])
    .map((item) => {
      let diasAtraso = 0;
      if (item.data_previsao_entrega) {
        try {
          const dataPrevisao = parseISO(item.data_previsao_entrega);
          diasAtraso = differenceInDays(hoje, dataPrevisao);
        } catch {
          diasAtraso = 0;
        }
      }
      return { ...item, diasAtraso };
    })
    .filter((item) => item.diasAtraso > 0 && item.diasAtraso <= 30) // Apenas atrasos de 1 a 30 dias
    .sort((a, b) => b.diasAtraso - a.diasAtraso); // Ordenar do mais atrasado para o menos atrasado

  return processedData;
}

export async function getEmissoesEmAtrasoIds(): Promise<string[]> {
  const emissoes = await fetchEmissoesEmAtraso();
  return emissoes.map(e => e.emissao_id);
}

export function isEmissaoAtrasada(emissaoId: string, atrasadasIds: string[]): boolean {
  return atrasadasIds.includes(emissaoId);
}

// Mapear dados da tabela do Supabase para formato similar ao IEmissao
export function mapEmissaoEmAtrasoToPartialEmissao(atraso: EmissaoEmAtraso): Partial<IEmissao> {
  return {
    id: atraso.emissao_id,
    codigoObjeto: atraso.codigo_objeto,
    status: 'EM_ATRASO',
    remetenteNome: atraso.remetente_nome || undefined,
    destinatario: atraso.destinatario_nome ? {
      nome: atraso.destinatario_nome,
    } as any : undefined,
  };
}
