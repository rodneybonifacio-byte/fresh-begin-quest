ALTER TABLE public.emissoes_marketplace
  ADD COLUMN IF NOT EXISTS pdf_base64 text,
  ADD COLUMN IF NOT EXISTS pdf_nome text,
  ADD COLUMN IF NOT EXISTS pdf_armazenado_em timestamptz;