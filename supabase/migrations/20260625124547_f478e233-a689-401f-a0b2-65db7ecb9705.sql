CREATE TABLE public.painel_coleta_externo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_objeto text NOT NULL,
  remetente_nome text NOT NULL,
  destinatario_nome text,
  servico text,
  origem text NOT NULL DEFAULT 'externo',
  data_emissao timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 days'),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT painel_coleta_externo_codigo_unique UNIQUE (codigo_objeto)
);

CREATE INDEX idx_painel_coleta_externo_expires ON public.painel_coleta_externo(expires_at);
CREATE INDEX idx_painel_coleta_externo_remetente ON public.painel_coleta_externo(remetente_nome);

GRANT ALL ON public.painel_coleta_externo TO service_role;
GRANT SELECT ON public.painel_coleta_externo TO authenticated;

ALTER TABLE public.painel_coleta_externo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages painel_coleta_externo"
  ON public.painel_coleta_externo FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_painel_coleta_externo_updated_at
  BEFORE UPDATE ON public.painel_coleta_externo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();