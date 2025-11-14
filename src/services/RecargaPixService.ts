import { supabase } from "../integrations/supabase/client";
import { IRecargaPix, ICreatePixChargeRequest, ICreatePixChargeResponse } from "../types/IRecargaPix";

export class RecargaPixService {
  /**
   * Criar uma cobrança PIX para recarga de créditos
   */
  static async criarCobrancaPix(request: ICreatePixChargeRequest): Promise<ICreatePixChargeResponse> {
    try {
      // Usar o token JWT do sistema existente (não Supabase Auth)
      const token = localStorage.getItem('token');
      
      console.log('🔐 Verificando autenticação...');
      console.log('Token exists:', !!token);
      
      if (!token) {
        console.error('❌ Usuário não autenticado - sem token');
        return {
          success: false,
          error: 'Usuário não autenticado. Por favor, faça login novamente.'
        };
      }

      console.log('✅ Token encontrado, chamando edge function...');

      const { data, error } = await supabase.functions.invoke('banco-inter-create-charge', {
        body: request,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) {
        console.error('❌ Erro ao criar cobrança PIX:', error);
        return {
          success: false,
          error: error.message || 'Erro ao criar cobrança PIX'
        };
      }

      console.log('✅ Cobrança PIX criada com sucesso');
      return data as ICreatePixChargeResponse;
    } catch (error) {
      console.error('❌ Erro ao criar cobrança PIX:', error);
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
      // Usar o token JWT customizado do sistema
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Usuário não autenticado');
        return [];
      }

      // Decodificar token para pegar cliente_id
      const payload = JSON.parse(atob(token.split('.')[1]));
      const clienteId = payload.clienteId;

      const { data, error } = await supabase
        .from('recargas_pix')
        .select('*')
        .eq('cliente_id', clienteId)
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
   * Verificar status da recarga do usuário autenticado
   */
  static async verificarStatus(txid: string): Promise<IRecargaPix | null> {
    try {
      // Buscar todas as recargas do usuário autenticado e filtrar por txid no client
      const recargas = await this.buscarRecargas(100);
      const recarga = recargas.find(r => r.txid === txid);
      
      if (!recarga) {
        console.log('Recarga não encontrada para txid:', txid);
        return null;
      }

      return recarga;
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return null;
    }
  }
}
