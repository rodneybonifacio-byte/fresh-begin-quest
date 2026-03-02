
CREATE TABLE public.coletas_confirmadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cliente text NOT NULL,
  data_coleta date NOT NULL DEFAULT CURRENT_DATE,
  confirmado_por text,
  confirmado_em timestamp with time zone NOT NULL DEFAULT now(),
  coluna text DEFAULT 'hoje',
  UNIQUE(nome_cliente, data_coleta)
);

ALTER TABLE public.coletas_confirmadas ENABLE ROW LEVEL SECURITY;

-- Public read (TV painel is public/PIN-protected)
CREATE POLICY "public_read_coletas_confirmadas" ON public.coletas_confirmadas
  FOR SELECT USING (true);

-- Public insert/delete (TV painel doesn't have auth, uses PIN)
CREATE POLICY "public_write_coletas_confirmadas" ON public.coletas_confirmadas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_delete_coletas_confirmadas" ON public.coletas_confirmadas
  FOR DELETE USING (true);

-- Service role full access
CREATE POLICY "service_role_coletas_confirmadas" ON public.coletas_confirmadas
  FOR ALL USING (true) WITH CHECK (true);
