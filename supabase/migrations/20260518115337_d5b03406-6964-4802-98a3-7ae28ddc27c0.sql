CREATE TABLE IF NOT EXISTS public.emissoes_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  uuid_marketplace TEXT NOT NULL,
  codigo_objeto TEXT NULL,
  codigo_servico TEXT NULL,
  nome_servico TEXT NULL,
  valor_total NUMERIC(10,2) NULL,
  valor_original NUMERIC(10,2) NULL,
  prazo INTEGER NULL,
  cep_origem TEXT NULL,
  cep_destino TEXT NULL,
  destinatario_nome TEXT NULL,
  payload_request JSONB NULL,
  payload_response JSONB NULL,
  status TEXT NOT NULL DEFAULT 'emitida',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_em_mp_cliente ON public.emissoes_marketplace(cliente_id);
CREATE INDEX IF NOT EXISTS idx_em_mp_uuid ON public.emissoes_marketplace(uuid_marketplace);
CREATE INDEX IF NOT EXISTS idx_em_mp_codigo ON public.emissoes_marketplace(codigo_objeto);

ALTER TABLE public.emissoes_marketplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente vê suas próprias emissões marketplace"
ON public.emissoes_marketplace FOR SELECT
USING (cliente_id = public.get_cliente_id_from_jwt() OR public.is_admin_from_jwt());

CREATE POLICY "Apenas service role insere"
ON public.emissoes_marketplace FOR INSERT
WITH CHECK (false);

CREATE POLICY "Apenas service role atualiza"
ON public.emissoes_marketplace FOR UPDATE
USING (false);

CREATE TRIGGER trg_em_mp_updated_at
BEFORE UPDATE ON public.emissoes_marketplace
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();