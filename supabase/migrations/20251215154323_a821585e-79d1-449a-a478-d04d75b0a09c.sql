-- Atualizar o valor padrão de percentual_comissao de 10% para 20%
ALTER TABLE public.comissoes_conecta 
ALTER COLUMN percentual_comissao SET DEFAULT 20.00;

-- Atualizar registros existentes que ainda têm 10%
UPDATE public.comissoes_conecta 
SET percentual_comissao = 20.00 
WHERE percentual_comissao = 10.00;