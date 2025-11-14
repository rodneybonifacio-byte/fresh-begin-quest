-- Criar função para buscar transações sem depender de RLS
CREATE OR REPLACE FUNCTION public.buscar_transacoes_cliente(
  p_cliente_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  cliente_id uuid,
  tipo character varying,
  valor numeric,
  descricao text,
  emissao_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  cobrada boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.cliente_id,
    t.tipo,
    t.valor,
    t.descricao,
    t.emissao_id,
    t.created_at,
    t.updated_at,
    t.cobrada
  FROM public.transacoes_credito t
  WHERE t.cliente_id = p_cliente_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Criar função para buscar resumo sem depender de RLS
CREATE OR REPLACE FUNCTION public.buscar_resumo_transacoes(
  p_cliente_id uuid,
  p_data_inicio timestamp with time zone DEFAULT NULL,
  p_data_fim timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  tipo character varying,
  valor numeric,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tipo,
    t.valor,
    t.created_at
  FROM public.transacoes_credito t
  WHERE t.cliente_id = p_cliente_id
    AND (p_data_inicio IS NULL OR t.created_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR t.created_at <= p_data_fim)
  ORDER BY t.created_at DESC;
END;
$$;