-- Create table to track delayed shipments detected by CRON
CREATE TABLE IF NOT EXISTS public.emissoes_em_atraso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emissao_id TEXT NOT NULL UNIQUE,
  codigo_objeto TEXT NOT NULL,
  data_previsao_entrega TIMESTAMP WITH TIME ZONE,
  detectado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cliente_id TEXT,
  remetente_nome TEXT,
  destinatario_nome TEXT
);

-- Enable RLS
ALTER TABLE public.emissoes_em_atraso ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage emissoes_em_atraso"
ON public.emissoes_em_atraso
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_emissoes_em_atraso_emissao_id ON public.emissoes_em_atraso(emissao_id);
CREATE INDEX idx_emissoes_em_atraso_codigo_objeto ON public.emissoes_em_atraso(codigo_objeto);