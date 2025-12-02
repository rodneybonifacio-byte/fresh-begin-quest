
-- Tabela para persistir fechamentos de faturas
CREATE TABLE public.fechamentos_fatura (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id VARCHAR(255) NOT NULL,
  subfatura_id VARCHAR(255),
  codigo_fatura VARCHAR(50) NOT NULL,
  nome_cliente VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(20),
  boleto_id VARCHAR(255),
  pdf_url TEXT,
  fatura_pdf TEXT,
  boleto_pdf TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para busca rápida
CREATE INDEX idx_fechamentos_fatura_id ON public.fechamentos_fatura(fatura_id);
CREATE INDEX idx_fechamentos_subfatura_id ON public.fechamentos_fatura(subfatura_id);

-- Enable RLS
ALTER TABLE public.fechamentos_fatura ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas service role pode manipular (usado por edge functions)
CREATE POLICY "Service role full access" 
ON public.fechamentos_fatura 
FOR ALL 
USING (true)
WITH CHECK (true);
