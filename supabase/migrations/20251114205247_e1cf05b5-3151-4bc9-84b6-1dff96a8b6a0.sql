-- Tabela para armazenar recargas PIX
CREATE TABLE IF NOT EXISTS public.recargas_pix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pendente_pagamento',
  txid VARCHAR(100) NOT NULL UNIQUE,
  qr_code TEXT,
  qr_code_image TEXT,
  pix_copia_cola TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_pagamento TIMESTAMP WITH TIME ZONE,
  data_expiracao TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_recargas_pix_cliente_id ON public.recargas_pix(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recargas_pix_txid ON public.recargas_pix(txid);
CREATE INDEX IF NOT EXISTS idx_recargas_pix_status ON public.recargas_pix(status);

-- Habilitar RLS
ALTER TABLE public.recargas_pix ENABLE ROW LEVEL SECURITY;

-- Política: Clientes podem ver suas próprias recargas
CREATE POLICY "Clientes podem ver suas recargas"
ON public.recargas_pix
FOR SELECT
USING (cliente_id = (auth.uid())::uuid);

-- Política: Sistema pode inserir recargas (via edge function)
CREATE POLICY "Sistema pode inserir recargas"
ON public.recargas_pix
FOR INSERT
WITH CHECK (true);

-- Política: Sistema pode atualizar recargas (via webhook)
CREATE POLICY "Sistema pode atualizar recargas"
ON public.recargas_pix
FOR UPDATE
USING (true);

-- Adicionar campo para controlar se etiqueta já foi cobrada
ALTER TABLE public.transacoes_credito
ADD COLUMN IF NOT EXISTS cobrada BOOLEAN DEFAULT false;

-- Criar índice para verificar etiquetas não cobradas
CREATE INDEX IF NOT EXISTS idx_transacoes_credito_emissao_cobrada 
ON public.transacoes_credito(emissao_id, cobrada) 
WHERE emissao_id IS NOT NULL;

-- Função para verificar e cobrar etiqueta
CREATE OR REPLACE FUNCTION public.verificar_e_cobrar_etiqueta(
  p_cliente_id UUID,
  p_emissao_id UUID,
  p_valor DECIMAL,
  p_status_etiqueta VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_atual DECIMAL(10, 2);
  v_ja_cobrada BOOLEAN;
BEGIN
  -- Verificar se não é pré-postado
  IF p_status_etiqueta = 'pre-postado' THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se já foi cobrada
  SELECT EXISTS(
    SELECT 1 FROM public.transacoes_credito
    WHERE emissao_id = p_emissao_id 
    AND tipo = 'consumo'
    AND cobrada = true
  ) INTO v_ja_cobrada;
  
  IF v_ja_cobrada THEN
    RETURN FALSE; -- Já cobrada
  END IF;
  
  -- Calcular saldo
  v_saldo_atual := public.calcular_saldo_cliente(p_cliente_id);
  
  -- Verificar saldo
  IF v_saldo_atual < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo: %, Necessário: %', v_saldo_atual, p_valor;
  END IF;
  
  -- Registrar consumo
  INSERT INTO public.transacoes_credito (
    cliente_id,
    tipo,
    valor,
    descricao,
    emissao_id,
    cobrada
  )
  VALUES (
    p_cliente_id,
    'consumo',
    -ABS(p_valor),
    'Consumo etiqueta - ' || p_emissao_id::text,
    p_emissao_id,
    true
  );
  
  RETURN TRUE;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_recargas_pix_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recargas_pix_updated_at
BEFORE UPDATE ON public.recargas_pix
FOR EACH ROW
EXECUTE FUNCTION public.update_recargas_pix_updated_at();