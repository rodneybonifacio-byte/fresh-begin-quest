-- Tabela para rastrear notificações enviadas de AGUARDANDO_RETIRADA
CREATE TABLE public.notificacoes_aguardando_retirada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_objeto VARCHAR(20) NOT NULL UNIQUE,
  destinatario_nome TEXT,
  remetente_nome TEXT,
  destinatario_celular TEXT,
  notificado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  webhook_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para busca rápida por código
CREATE INDEX idx_notificacoes_codigo_objeto ON public.notificacoes_aguardando_retirada(codigo_objeto);

-- RLS - apenas service_role pode acessar
ALTER TABLE public.notificacoes_aguardando_retirada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_acesso_total_notificacoes_aguardando" 
ON public.notificacoes_aguardando_retirada 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Admin pode visualizar
CREATE POLICY "admin_visualiza_notificacoes_aguardando" 
ON public.notificacoes_aguardando_retirada 
FOR SELECT 
USING (is_admin_from_jwt());