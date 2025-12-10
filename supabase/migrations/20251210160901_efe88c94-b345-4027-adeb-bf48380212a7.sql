-- Adicionar coluna servico na tabela emissoes_em_atraso
ALTER TABLE public.emissoes_em_atraso 
ADD COLUMN IF NOT EXISTS servico VARCHAR(50) DEFAULT NULL;