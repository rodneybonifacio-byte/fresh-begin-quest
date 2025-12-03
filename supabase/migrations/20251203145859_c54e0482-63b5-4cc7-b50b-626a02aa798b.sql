-- Adicionar coluna nosso_numero se não existir
ALTER TABLE public.fechamentos_fatura 
ADD COLUMN IF NOT EXISTS nosso_numero VARCHAR(50);