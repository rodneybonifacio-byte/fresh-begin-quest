import { supabase } from "../integrations/supabase/client";
import { IRecargaPix, ICreatePixChargeRequest, ICreatePixChargeResponse } from "../types/IRecargaPix";

export class RecargaPixService {
  /**
   * Criar uma cobrança PIX para recarga de créditos
   */
  static async criarCobrancaPix(request: ICreatePixChargeRequest): Promise<ICreatePixChargeResponse> {
    try {
      // Obter a sessão atual para pegar o token JWT
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          success: false,
          error: 'Usuário não autenticado'
        };
      }

      const { data, error } = await supabase.functions.invoke('banco-inter-create-charge', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Erro ao criar cobrança PIX:', error);
        return {
          success: false,
          error: error.message || 'Erro ao criar cobrança PIX'
        };
      }

      return data as ICreatePixChargeResponse;
    } catch (error) {
      console.error('Erro ao criar cobrança PIX:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Buscar recargas do usuário autenticado
   */
  static async buscarRecargas(limit: number = 100): Promise<IRecargaPix[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Usuário não autenticado');
        return [];
      }

      const { data, error } = await supabase
        .from('recargas_pix')
        .select('*')
        .eq('cliente_id', user.id)
        .order('data_criacao', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar recargas:', error);
        return [];
      }

      return data as IRecargaPix[];
    } catch (error) {
      console.error('Erro ao buscar recargas:', error);
      return [];
    }
  }

  /**
   * Buscar recarga por ID
   */
  static async buscarRecargaPorId(recargaId: string): Promise<IRecargaPix | null> {
    try {
      const { data, error } = await supabase
        .from('recargas_pix')
        .select('*')
        .eq('id', recargaId)
        .single();

      if (error) {
        console.error('Erro ao buscar recarga:', error);
        return null;
      }

      return data as IRecargaPix;
    } catch (error) {
      console.error('Erro ao buscar recarga:', error);
      return null;
    }
  }

  /**
   * Verificar status da recarga
   */
  static async verificarStatus(txid: string): Promise<IRecargaPix | null> {
    try {
      const { data, error } = await supabase
        .from('recargas_pix')
        .select('*')
        .eq('txid', txid)
        .single();

      if (error) {
        console.error('Erro ao verificar status:', error);
        return null;
      }

      return data as IRecargaPix;
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return null;
    }
  }
}
