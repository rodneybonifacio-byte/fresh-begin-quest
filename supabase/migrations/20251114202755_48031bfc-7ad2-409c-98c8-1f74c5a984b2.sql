
-- Criar tabela de transações de crédito
CREATE TABLE IF NOT EXISTS public.transacoes_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recarga', 'consumo')),
    valor DECIMAL(10, 2) NOT NULL,
    descricao TEXT,
    emissao_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_transacoes_cliente ON public.transacoes_credito(cliente_id);
CREATE INDEX idx_transacoes_tipo ON public.transacoes_credito(tipo);
CREATE INDEX idx_transacoes_created ON public.transacoes_credito(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.transacoes_credito ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (clientes só veem suas próprias transações)
CREATE POLICY "Clientes podem ver suas transações"
    ON public.transacoes_credito
    FOR SELECT
    USING (cliente_id = auth.uid()::text::uuid);

CREATE POLICY "Sistema pode inserir transações"
    ON public.transacoes_credito
    FOR INSERT
    WITH CHECK (true);

-- Função para calcular saldo atual do cliente
CREATE OR REPLACE FUNCTION public.calcular_saldo_cliente(p_cliente_id UUID)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_recargas DECIMAL(10, 2);
    v_total_consumos DECIMAL(10, 2);
    v_saldo DECIMAL(10, 2);
BEGIN
    -- Somar todas as recargas
    SELECT COALESCE(SUM(valor), 0)
    INTO v_total_recargas
    FROM public.transacoes_credito
    WHERE cliente_id = p_cliente_id AND tipo = 'recarga';
    
    -- Somar todos os consumos (em valor absoluto)
    SELECT COALESCE(SUM(ABS(valor)), 0)
    INTO v_total_consumos
    FROM public.transacoes_credito
    WHERE cliente_id = p_cliente_id AND tipo = 'consumo';
    
    -- Calcular saldo
    v_saldo := v_total_recargas - v_total_consumos;
    
    RETURN v_saldo;
END;
$$;

-- Função para registrar recarga de créditos
CREATE OR REPLACE FUNCTION public.registrar_recarga(
    p_cliente_id UUID,
    p_valor DECIMAL(10, 2),
    p_descricao TEXT DEFAULT 'Recarga de créditos'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transacao_id UUID;
BEGIN
    -- Validar valor
    IF p_valor <= 0 THEN
        RAISE EXCEPTION 'Valor da recarga deve ser maior que zero';
    END IF;
    
    -- Inserir transação
    INSERT INTO public.transacoes_credito (cliente_id, tipo, valor, descricao)
    VALUES (p_cliente_id, 'recarga', p_valor, p_descricao)
    RETURNING id INTO v_transacao_id;
    
    RETURN v_transacao_id;
END;
$$;

-- Função para consumir créditos de uma etiqueta
CREATE OR REPLACE FUNCTION public.consumir_creditos_etiqueta(
    p_cliente_id UUID,
    p_emissao_id UUID,
    p_valor DECIMAL(10, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saldo_atual DECIMAL(10, 2);
    v_ja_cobrada BOOLEAN;
BEGIN
    -- Verificar se a etiqueta já foi cobrada
    SELECT EXISTS(
        SELECT 1 FROM public.transacoes_credito
        WHERE emissao_id = p_emissao_id AND tipo = 'consumo'
    ) INTO v_ja_cobrada;
    
    IF v_ja_cobrada THEN
        RETURN FALSE; -- Já foi cobrada, não fazer nada
    END IF;
    
    -- Calcular saldo atual
    v_saldo_atual := public.calcular_saldo_cliente(p_cliente_id);
    
    -- Verificar se tem saldo suficiente
    IF v_saldo_atual < p_valor THEN
        RAISE EXCEPTION 'Saldo insuficiente. Saldo atual: %, Valor necessário: %', v_saldo_atual, p_valor;
    END IF;
    
    -- Registrar consumo (valor negativo)
    INSERT INTO public.transacoes_credito (
        cliente_id,
        tipo,
        valor,
        descricao,
        emissao_id
    )
    VALUES (
        p_cliente_id,
        'consumo',
        -ABS(p_valor), -- Garantir que é negativo
        'Consumo de créditos - Etiqueta ' || p_emissao_id::text,
        p_emissao_id
    );
    
    RETURN TRUE;
END;
$$;

-- Função para verificar se cliente tem saldo suficiente
CREATE OR REPLACE FUNCTION public.verificar_saldo_suficiente(
    p_cliente_id UUID,
    p_valor DECIMAL(10, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saldo_atual DECIMAL(10, 2);
BEGIN
    v_saldo_atual := public.calcular_saldo_cliente(p_cliente_id);
    RETURN v_saldo_atual >= p_valor;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.transacoes_credito IS 'Histórico de transações de créditos (recargas e consumos)';
COMMENT ON FUNCTION public.calcular_saldo_cliente IS 'Calcula o saldo atual de créditos de um cliente';
COMMENT ON FUNCTION public.registrar_recarga IS 'Registra uma nova recarga de créditos';
COMMENT ON FUNCTION public.consumir_creditos_etiqueta IS 'Consome créditos para uma etiqueta específica';
COMMENT ON FUNCTION public.verificar_saldo_suficiente IS 'Verifica se o cliente tem saldo suficiente';
