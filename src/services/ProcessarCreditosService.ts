import { supabase } from '../integrations/supabase/client';

export class ProcessarCreditosService {
  /**
   * Executa manualmente o processamento de créditos bloqueados
   */
  static async executarProcessamento(): Promise<any> {
    try {
      console.log('🔄 Executando processamento de créditos bloqueados...');
      
      const { data, error } = await supabase.functions.invoke('processar-creditos-bloqueados', {
        body: {}
      });

      if (error) {
        console.error('❌ Erro ao processar créditos:', error);
        throw error;
      }

      console.log('✅ Processamento concluído:', data);
      return data;
    } catch (error) {
      console.error('💥 Erro ao executar processamento:', error);
      throw error;
    }
  }

  /**
   * Corrige consumos incorretos (etiquetas em PRE_POSTADO que foram consumidas)
   */
  static async corrigirConsumosIncorretos(): Promise<any> {
    try {
      console.log('🔧 Executando correção de consumos incorretos...');
      
      const { data, error } = await supabase.functions.invoke('corrigir-consumos-incorretos', {
        body: {}
      });

      if (error) {
        console.error('❌ Erro ao corrigir consumos:', error);
        throw error;
      }

      console.log('✅ Correção concluída:', data);
      return data;
    } catch (error) {
      console.error('💥 Erro ao executar correção:', error);
      throw error;
    }
  }
}
