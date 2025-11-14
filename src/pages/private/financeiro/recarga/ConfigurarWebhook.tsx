import { useState } from 'react';
import { supabase } from '../../../../integrations/supabase/client';
import { ButtonComponent } from '../../../../components/button';
import { toastSuccess, toastError } from '../../../../utils/toastNotify';

export const ConfigurarWebhook = () => {
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleConfigureWebhook = async () => {
    setIsConfiguring(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('banco-inter-configure-webhook', {
        body: {}
      });

      if (error) {
        console.error('Erro ao configurar webhook:', error);
        toastError('Erro ao configurar webhook: ' + error.message);
        return;
      }

      if (data?.success) {
        toastSuccess('Webhook configurado com sucesso!');
        console.log('Webhook URL configurada:', data.webhookUrl);
      } else {
        toastError('Erro ao configurar webhook: ' + (data?.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      toastError('Erro ao configurar webhook');
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <ButtonComponent
        onClick={handleConfigureWebhook}
        disabled={isConfiguring}
        className="w-full"
      >
        {isConfiguring ? 'Configurando...' : 'Configurar Webhook Automático'}
      </ButtonComponent>
      <p className="text-xs text-muted-foreground">
        Clique para configurar automaticamente o webhook do Banco Inter via API
      </p>
    </div>
  );
};
