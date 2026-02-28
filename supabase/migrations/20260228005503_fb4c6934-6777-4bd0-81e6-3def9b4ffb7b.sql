
CREATE TABLE public.clientes_coleta_horarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_cliente TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  motorista TEXT,
  horario_inicio TEXT NOT NULL DEFAULT '14:00',
  horario_fim TEXT,
  grupo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read access (TV panel uses no auth)
ALTER TABLE public.clientes_coleta_horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_horarios" ON public.clientes_coleta_horarios
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_horarios" ON public.clientes_coleta_horarios
  FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());

CREATE POLICY "service_role_full_access_horarios" ON public.clientes_coleta_horarios
  FOR ALL USING (true) WITH CHECK (true);
