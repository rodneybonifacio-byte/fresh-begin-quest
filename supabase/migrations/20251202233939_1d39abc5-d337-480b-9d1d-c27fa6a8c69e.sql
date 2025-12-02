-- Tabela para registrar logs de acesso/login
CREATE TABLE public.logs_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT NOT NULL DEFAULT 'login',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_logs_acesso_cliente_id ON public.logs_acesso(cliente_id);
CREATE INDEX idx_logs_acesso_created_at ON public.logs_acesso(created_at DESC);

-- Tabela para sessões ativas (presença em tempo real)
CREATE TABLE public.sessoes_ativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL UNIQUE,
  user_email TEXT,
  user_name TEXT,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_online BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessoes_ativas_cliente_id ON public.sessoes_ativas(cliente_id);
CREATE INDEX idx_sessoes_ativas_last_seen ON public.sessoes_ativas(last_seen DESC);

-- RLS para logs_acesso
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ve_todos_logs" ON public.logs_acesso
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "service_role_full_access_logs" ON public.logs_acesso
  FOR ALL USING (true) WITH CHECK (true);

-- RLS para sessoes_ativas
ALTER TABLE public.sessoes_ativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ve_todas_sessoes" ON public.sessoes_ativas
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "usuarios_atualizam_propria_sessao" ON public.sessoes_ativas
  FOR UPDATE USING (cliente_id = get_cliente_id_from_jwt());

CREATE POLICY "service_role_full_access_sessoes" ON public.sessoes_ativas
  FOR ALL USING (true) WITH CHECK (true);

-- Habilitar realtime para sessões
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessoes_ativas;