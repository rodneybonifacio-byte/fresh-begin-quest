ALTER TABLE public.emissoes_marketplace
  ADD COLUMN IF NOT EXISTS transportadora text,
  ADD COLUMN IF NOT EXISTS formato_codigo text,
  ADD COLUMN IF NOT EXISTS fonte_status text;