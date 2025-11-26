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
}
