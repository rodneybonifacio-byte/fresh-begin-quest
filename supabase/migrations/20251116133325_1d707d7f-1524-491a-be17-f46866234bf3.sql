-- Adicionar novos campos à tabela transacoes_credito
ALTER TABLE public.transacoes_credito 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'consumido' 
  CHECK (status IN ('bloqueado', 'consumido', 'liberado')),
ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS liberado_em TIMESTAMP WITH TIME ZONE;

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON public.transacoes_credito(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_emissao ON public.transacoes_credito(emissao_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_blocked_until ON public.transacoes_credito(blocked_until) 
  WHERE status = 'bloqueado';

-- Função para bloquear crédito ao gerar etiqueta
CREATE OR REPLACE FUNCTION public.bloquear_credito_etiqueta(
  p_cliente_id UUID,
  p_emissao_id UUID,
  p_valor NUMERIC,
  p_codigo_objeto VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_saldo_disponivel DECIMAL(10, 2);
  v_transacao_id UUID;
  v_codigo TEXT;
BEGIN
  -- Verificar saldo disponível
  v_saldo_disponivel := public.calcular_saldo_disponivel(p_cliente_id);
  
  IF v_saldo_disponivel < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: %, Necessário: %', v_saldo_disponivel, p_valor;
  END IF;
  
  -- Preparar código do objeto para descrição
  v_codigo := COALESCE(p_codigo_objeto, p_emissao_id::text);
  
  -- Criar transação de bloqueio
  INSERT INTO public.transacoes_credito (
    cliente_id,
    tipo,
    valor,
    status,
    descricao,
    emissao_id,
    blocked_until,
    cobrada
  )
  VALUES (
    p_cliente_id,
    'consumo',
    -ABS(p_valor),
    'bloqueado',
    'Crédito bloqueado - Etiqueta ' || v_codigo,
    p_emissao_id,
    NOW() + INTERVAL '72 hours',
    false
  )
  RETURNING id INTO v_transacao_id;
  
  RETURN v_transacao_id;
END;
$$;

-- Função para calcular saldo disponível (total recargas - bloqueados - consumidos)
CREATE OR REPLACE FUNCTION public.calcular_saldo_disponivel(p_cliente_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_recargas DECIMAL(10, 2);
  v_total_bloqueados DECIMAL(10, 2);
  v_total_consumidos DECIMAL(10, 2);
  v_saldo DECIMAL(10, 2);
BEGIN
  -- Total de recargas
  SELECT COALESCE(SUM(valor), 0)
  INTO v_total_recargas
  FROM public.transacoes_credito
  WHERE cliente_id = p_cliente_id AND tipo = 'recarga';
  
  -- Total bloqueado
  SELECT COALESCE(SUM(ABS(valor)), 0)
  INTO v_total_bloqueados
  FROM public.transacoes_credito
  WHERE cliente_id = p_cliente_id 
    AND tipo = 'consumo' 
    AND status = 'bloqueado';
  
  -- Total consumido
  SELECT COALESCE(SUM(ABS(valor)), 0)
  INTO v_total_consumidos
  FROM public.transacoes_credito
  WHERE cliente_id = p_cliente_id 
    AND tipo = 'consumo' 
    AND status = 'consumido';
  
  v_saldo := v_total_recargas - v_total_bloqueados - v_total_consumidos;
  
  RETURN v_saldo;
END;
$$;

-- Função para calcular total de créditos bloqueados
CREATE OR REPLACE FUNCTION public.calcular_creditos_bloqueados(p_cliente_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(ABS(valor)), 0)
  INTO v_total
  FROM public.transacoes_credito
  WHERE cliente_id = p_cliente_id 
    AND tipo = 'consumo' 
    AND status = 'bloqueado';
  
  RETURN v_total;
END;
$$;

-- Função para calcular total de créditos consumidos
CREATE OR REPLACE FUNCTION public.calcular_creditos_consumidos(p_cliente_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(ABS(valor)), 0)
  INTO v_total
  FROM public.transacoes_credito
  WHERE cliente_id = p_cliente_id 
    AND tipo = 'consumo' 
    AND status = 'consumido';
  
  RETURN v_total;
END;
$$;

-- Função para consumir crédito bloqueado (quando etiqueta é postada)
CREATE OR REPLACE FUNCTION public.consumir_credito_bloqueado(
  p_emissao_id UUID,
  p_codigo_objeto VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_codigo TEXT;
BEGIN
  v_codigo := COALESCE(p_codigo_objeto, p_emissao_id::text);
  
  -- Atualizar status de bloqueado para consumido
  UPDATE public.transacoes_credito
  SET 
    status = 'consumido',
    cobrada = true,
    descricao = 'Consumo de crédito - Etiqueta ' || v_codigo,
    updated_at = NOW()
  WHERE emissao_id = p_emissao_id 
    AND tipo = 'consumo'
    AND status = 'bloqueado';
  
  RETURN FOUND;
END;
$$;

-- Função para liberar crédito bloqueado (quando etiqueta expira)
CREATE OR REPLACE FUNCTION public.liberar_credito_bloqueado(
  p_emissao_id UUID,
  p_codigo_objeto VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_codigo TEXT;
BEGIN
  v_codigo := COALESCE(p_codigo_objeto, p_emissao_id::text);
  
  -- Atualizar status de bloqueado para liberado e inverter o valor
  UPDATE public.transacoes_credito
  SET 
    status = 'liberado',
    liberado_em = NOW(),
    descricao = 'Liberação de crédito - Etiqueta expirada ' || v_codigo,
    valor = ABS(valor),
    tipo = 'recarga',
    updated_at = NOW()
  WHERE emissao_id = p_emissao_id 
    AND tipo = 'consumo'
    AND status = 'bloqueado';
  
  RETURN FOUND;
END;
$$;

-- Função para buscar etiquetas com créditos bloqueados
CREATE OR REPLACE FUNCTION public.buscar_etiquetas_bloqueadas()
RETURNS TABLE(
  emissao_id UUID,
  cliente_id UUID,
  valor NUMERIC,
  blocked_until TIMESTAMP WITH TIME ZONE,
  descricao TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.emissao_id,
    t.cliente_id,
    ABS(t.valor) as valor,
    t.blocked_until,
    t.descricao
  FROM public.transacoes_credito t
  WHERE t.status = 'bloqueado'
    AND t.tipo = 'consumo'
    AND t.emissao_id IS NOT NULL
  ORDER BY t.blocked_until ASC;
END;
$$;

COMMENT ON FUNCTION public.bloquear_credito_etiqueta IS 'Bloqueia crédito ao gerar etiqueta. O crédito fica reservado por 72h';
COMMENT ON FUNCTION public.calcular_saldo_disponivel IS 'Calcula saldo disponível (recargas - bloqueados - consumidos)';
COMMENT ON FUNCTION public.calcular_creditos_bloqueados IS 'Calcula total de créditos atualmente bloqueados';
COMMENT ON FUNCTION public.calcular_creditos_consumidos IS 'Calcula total de créditos já consumidos definitivamente';
COMMENT ON FUNCTION public.consumir_credito_bloqueado IS 'Move crédito de bloqueado para consumido quando etiqueta é postada';
COMMENT ON FUNCTION public.liberar_credito_bloqueado IS 'Libera crédito bloqueado quando etiqueta expira (72h em pré-postado)';
COMMENT ON FUNCTION public.buscar_etiquetas_bloqueadas IS 'Retorna todas as etiquetas com créditos bloqueados para processamento do job';