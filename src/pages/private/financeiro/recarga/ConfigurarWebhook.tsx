import { useState } from 'react';
import { supabase } from '../../../../integrations/supabase/client';
import { ButtonComponent } from '../../../../components/button';
import { toastSuccess, toastError, toastInfo } from '../../../../utils/toastNotify';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const ConfigurarWebhook = () => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [status, setStatus] = useState<'idle' | 'configuring' | 'success' | 'error'>('idle');
  const [retryCount, setRetryCount] = useState(0);

  const handleConfigureWebhook = async () => {
    setIsConfiguring(true);
    setStatus('configuring');
    setRetryCount(0);
    
    try {
      toastInfo('Configurando webhook...');
      
      const { data, error } = await supabase.functions.invoke('banco-inter-configure-webhook', {
        body: {}
      });

      if (error) {
        console.error('Erro ao configurar webhook:', error);
        setStatus('error');
        
        if (error.message.includes('não configurad')) {
          toastError('Credenciais do Banco Inter não configuradas');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          toastError('Erro de autenticação. Verifique as credenciais');
        } else {
          toastError('Erro ao configurar webhook. Tentando novamente...');
          // Retry após 2 segundos
          setTimeout(handleConfigureWebhook, 2000);
          setRetryCount(prev => prev + 1);
        }
        return;
      }

      if (data?.success) {
        setStatus('success');
        toastSuccess('Webhook configurado com sucesso!');
        console.log('Webhook URL configurada:', data.webhookUrl);
        
        // Resetar status após 3 segundos
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        toastError('Erro ao configurar webhook: ' + (data?.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      setStatus('error');
      toastError('Erro ao configurar webhook');
    } finally {
      setIsConfiguring(false);
    }
  };

  const getButtonContent = () => {
    if (isConfiguring) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {retryCount > 0 ? `Tentando novamente... (${retryCount})` : 'Configurando...'}
        </>
      );
    }
    
    if (status === 'success') {
      return (
        <>
          <CheckCircle className="w-4 h-4" />
          Configurado!
        </>
      );
    }
    
    if (status === 'error') {
      return (
        <>
          <AlertCircle className="w-4 h-4" />
          Tentar Novamente
        </>
      );
    }
    
    return 'Configurar Webhook Automático';
  };

  return (
    <div className="flex flex-col gap-2">
      <ButtonComponent
        onClick={handleConfigureWebhook}
        disabled={isConfiguring}
        className="w-full flex items-center justify-center gap-2"
        variant={status === 'success' ? 'primary' : status === 'error' ? 'secondary' : 'primary'}
      >
        {getButtonContent()}
      </ButtonComponent>
      <p className="text-xs text-muted-foreground">
        {status === 'configuring' && 'Configurando webhook via API do Banco Inter...'}
        {status === 'success' && 'Webhook configurado! Pagamentos serão processados automaticamente.'}
        {status === 'error' && 'Erro na configuração. Clique para tentar novamente.'}
        {status === 'idle' && 'Clique para configurar automaticamente o webhook do Banco Inter via API'}
      </p>
    </div>
  );
};
