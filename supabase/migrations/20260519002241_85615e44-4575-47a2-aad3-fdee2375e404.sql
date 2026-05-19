-- Deduplicar bloqueios ativos por emissao_id, mantendo o mais antigo
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY emissao_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.transacoes_credito
  WHERE tipo = 'consumo' AND status = 'bloqueado' AND emissao_id IS NOT NULL
)
DELETE FROM public.transacoes_credito t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;

-- Impedir múltiplos bloqueios ativos para a mesma emissão
CREATE UNIQUE INDEX IF NOT EXISTS uniq_transacoes_credito_bloqueio_por_emissao
ON public.transacoes_credito (emissao_id)
WHERE tipo = 'consumo' AND status = 'bloqueado';