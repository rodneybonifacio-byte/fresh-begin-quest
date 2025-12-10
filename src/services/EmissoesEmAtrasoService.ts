import { supabase } from "../integrations/supabase/client";
import type { IEmissao } from "../types/IEmissao";

export interface EmissaoEmAtraso {
  id: string;
  emissao_id: string;
  codigo_objeto: string;
  data_previsao_entrega: string | null;
  detectado_em: string;
  cliente_id: string | null;
  remetente_nome: string | null;
  destinatario_nome: string | null;
}

export async function fetchEmissoesEmAtraso(): Promise<EmissaoEmAtraso[]> {
  const { data, error } = await supabase
    .from('emissoes_em_atraso')
    .select('*')
    .order('detectado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar emissões em atraso:', error);
    return [];
  }

  return data || [];
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
