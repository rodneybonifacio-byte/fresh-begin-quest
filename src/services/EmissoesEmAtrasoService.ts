import { getSupabaseWithAuth } from "../integrations/supabase/custom-auth";
import type { IEmissao } from "../types/IEmissao";
import { differenceInDays } from "date-fns";

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
  const supabaseAuth = getSupabaseWithAuth();

  const { data, error } = await supabaseAuth.from("emissoes_em_atraso").select("*");

  if (error) {
    console.error("Erro ao buscar emissões em atraso:", error);
    return [];
  }

  const hoje = new Date();

  // Calcular dias de atraso e ordenar do mais atrasado para menos
  const processedData = (data || [])
    .map((item) => {
      let diasAtraso = 0;
      if (item.data_previsao_entrega) {
        try {
          // Postgres pode retornar "YYYY-MM-DD HH:mm:ss+00" (com espaço). Normalizar para ISO.
          const normalized = String(item.data_previsao_entrega).replace(' ', 'T');
          const dataPrevisao = new Date(normalized);
          if (!Number.isNaN(dataPrevisao.getTime())) {
            diasAtraso = differenceInDays(hoje, dataPrevisao);
          }
        } catch {
          diasAtraso = 0;
        }
      }
      return { ...item, diasAtraso };
    })
    .filter((item) => item.diasAtraso > 0) // apenas atrasadas
    .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0));

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
