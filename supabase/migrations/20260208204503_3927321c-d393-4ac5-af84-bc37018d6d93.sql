-- Tabela para sobrescrever valores financeiros de faturas específicas
CREATE TABLE public.faturas_override (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id VARCHAR NOT NULL,
  valor_venda NUMERIC,
  valor_custo NUMERIC,
  valor_lucro NUMERIC,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fatura_id)
);

-- Enable RLS
ALTER TABLE public.faturas_override ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "admin_acesso_total_faturas_override" 
ON public.faturas_override FOR ALL 
USING (is_admin_from_jwt())
WITH CHECK (is_admin_from_jwt());

CREATE POLICY "service_role_faturas_override" 
ON public.faturas_override FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "deny_anon_faturas_override" 
ON public.faturas_override FOR ALL 
USING (false)
WITH CHECK (false);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_faturas_override_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_faturas_override_updated_at
BEFORE UPDATE ON public.faturas_override
FOR EACH ROW
EXECUTE FUNCTION public.update_faturas_override_updated_at();