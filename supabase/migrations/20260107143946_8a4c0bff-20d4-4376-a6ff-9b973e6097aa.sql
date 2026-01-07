-- Tabela para override de celulares de destinatários
CREATE TABLE public.celulares_override (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_objeto VARCHAR NOT NULL UNIQUE,
  celular VARCHAR NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.celulares_override ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "admin_acesso_total_celulares_override"
ON public.celulares_override
FOR ALL
USING (is_admin_from_jwt())
WITH CHECK (is_admin_from_jwt());

CREATE POLICY "service_role_acesso_celulares_override"
ON public.celulares_override
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "deny_anon_celulares_override"
ON public.celulares_override
FOR ALL
USING (false)
WITH CHECK (false);

-- Índice para busca rápida por código objeto
CREATE INDEX idx_celulares_override_codigo_objeto ON public.celulares_override(codigo_objeto);

-- Comentário na tabela
COMMENT ON TABLE public.celulares_override IS 'Tabela para cadastro manual de celulares de destinatários quando o sistema externo não possui';
COMMENT ON COLUMN public.celulares_override.codigo_objeto IS 'Código de rastreio do objeto';
COMMENT ON COLUMN public.celulares_override.celular IS 'Número do celular com código do país (ex: 5511999999999)';