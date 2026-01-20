-- Adicionar coluna referencia_externa para rastreabilidade de transações vindas de APIs externas
ALTER TABLE public.transacoes_credito 
ADD COLUMN IF NOT EXISTS referencia_externa TEXT;

-- Criar índice para buscas rápidas por referência
CREATE INDEX IF NOT EXISTS idx_transacoes_referencia_externa 
ON public.transacoes_credito(referencia_externa) 
WHERE referencia_externa IS NOT NULL;

-- Comentário na coluna
COMMENT ON COLUMN public.transacoes_credito.referencia_externa IS 'ID de referência externa para transações vindas de APIs/integrações (idempotência)';
