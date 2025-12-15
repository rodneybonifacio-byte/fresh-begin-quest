import { supabase } from "../integrations/supabase/client";
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

export async function fetchEmissoesEmAtraso(options?: { maxDiasAtraso?: number }): Promise<EmissaoEmAtraso[]> {
  // IMPORTANTE: JWT customizado não é aceito no gateway padrão.
  // Então chamamos uma backend function com verify_jwt=false e enviamos o token no body.
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken");

  if (!token) {
    console.warn("Sem token para buscar emissões em atraso");
    return [];
  }

  const { data, error } = await supabase.functions.invoke("buscar-emissoes-em-atraso", {
    body: { token },
  });

  if (error) {
    console.error("Erro ao buscar emissões em atraso:", error);
    return [];
  }

  const rows: EmissaoEmAtraso[] = (data?.emissoes || []) as EmissaoEmAtraso[];
  const hoje = new Date();
  const maxDiasAtraso = options?.maxDiasAtraso;

  const processedData = rows
    .map((item) => {
      let diasAtraso = 0;
      if (item.data_previsao_entrega) {
        const normalized = String(item.data_previsao_entrega).replace(" ", "T");
        const dataPrevisao = new Date(normalized);
        if (!Number.isNaN(dataPrevisao.getTime())) {
          diasAtraso = differenceInDays(hoje, dataPrevisao);
        }
      }
      return { ...item, diasAtraso };
    })
    .filter((item) => {
      const dias = item.diasAtraso ?? 0;
      if (dias <= 0) return false;
      if (typeof maxDiasAtraso === "number") return dias < maxDiasAtraso;
      return true;
    })
    .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0));

  return processedData;
}

export async function getEmissoesEmAtrasoIds(): Promise<string[]> {
  const emissoes = await fetchEmissoesEmAtraso();
  return emissoes.map((e) => e.emissao_id);
}

export function isEmissaoAtrasada(emissaoId: string, atrasadasIds: string[]): boolean {
  return atrasadasIds.includes(emissaoId);
}

// Mapear dados da tabela do Supabase para formato similar ao IEmissao
export function mapEmissaoEmAtrasoToPartialEmissao(atraso: EmissaoEmAtraso): Partial<IEmissao> {
  return {
    id: atraso.emissao_id,
    codigoObjeto: atraso.codigo_objeto,
    status: "EM_ATRASO",
    remetenteNome: atraso.remetente_nome || undefined,
    destinatario: atraso.destinatario_nome
      ? ({
          nome: atraso.destinatario_nome,
        } as any)
      : undefined,
  };
}

