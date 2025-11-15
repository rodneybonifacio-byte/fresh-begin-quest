-- Corrige search_path nas funções existentes para segurança

-- 1. calcular_saldo_cliente
CREATE OR REPLACE FUNCTION public.calcular_saldo_cliente(p_cliente_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_total_recargas DECIMAL(10, 2);
    v_total_consumos DECIMAL(10, 2);
    v_saldo DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(valor), 0)
    INTO v_total_recargas
    FROM public.transacoes_credito
    WHERE cliente_id = p_cliente_id AND tipo = 'recarga';
    
    SELECT COALESCE(SUM(ABS(valor)), 0)
    INTO v_total_consumos
    FROM public.transacoes_credito
    WHERE cliente_id = p_cliente_id AND tipo = 'consumo';
    
    v_saldo := v_total_recargas - v_total_consumos;
    
    RETURN v_saldo;
END;
$function$;

-- 2. registrar_recarga
CREATE OR REPLACE FUNCTION public.registrar_recarga(p_cliente_id uuid, p_valor numeric, p_descricao text DEFAULT 'Recarga de créditos'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_transacao_id UUID;
BEGIN
    IF p_valor <= 0 THEN
        RAISE EXCEPTION 'Valor da recarga deve ser maior que zero';
    END IF;
    
    INSERT INTO public.transacoes_credito (cliente_id, tipo, valor, descricao)
    VALUES (p_cliente_id, 'recarga', p_valor, p_descricao)
    RETURNING id INTO v_transacao_id;
    
    RETURN v_transacao_id;
END;
$function$;

-- 3. consumir_creditos_etiqueta
CREATE OR REPLACE FUNCTION public.consumir_creditos_etiqueta(p_cliente_id uuid, p_emissao_id uuid, p_valor numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_saldo_atual DECIMAL(10, 2);
    v_ja_cobrada BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.transacoes_credito
        WHERE emissao_id = p_emissao_id AND tipo = 'consumo'
    ) INTO v_ja_cobrada;
    
    IF v_ja_cobrada THEN
        RETURN FALSE;
    END IF;
    
    v_saldo_atual := public.calcular_saldo_cliente(p_cliente_id);
    
    IF v_saldo_atual < p_valor THEN
        RAISE EXCEPTION 'Saldo insuficiente. Saldo atual: %, Valor necessário: %', v_saldo_atual, p_valor;
    END IF;
    
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
        -ABS(p_valor),
        'Consumo de créditos - Etiqueta ' || p_emissao_id::text,
        p_emissao_id
    );
    
    RETURN TRUE;
END;
$function$;

-- 4. verificar_saldo_suficiente
CREATE OR REPLACE FUNCTION public.verificar_saldo_suficiente(p_cliente_id uuid, p_valor numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_saldo_atual DECIMAL(10, 2);
BEGIN
    v_saldo_atual := public.calcular_saldo_cliente(p_cliente_id);
    RETURN v_saldo_atual >= p_valor;
END;
$function$;

-- 5. verificar_e_cobrar_etiqueta
CREATE OR REPLACE FUNCTION public.verificar_e_cobrar_etiqueta(p_cliente_id uuid, p_emissao_id uuid, p_valor numeric, p_status_etiqueta character varying)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_saldo_atual DECIMAL(10, 2);
  v_ja_cobrada BOOLEAN;
BEGIN
  IF p_status_etiqueta = 'pre-postado' THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM public.transacoes_credito
    WHERE emissao_id = p_emissao_id 
    AND tipo = 'consumo'
    AND cobrada = true
  ) INTO v_ja_cobrada;
  
  IF v_ja_cobrada THEN
    RETURN FALSE;
  END IF;
  
  v_saldo_atual := public.calcular_saldo_cliente(p_cliente_id);
  
  IF v_saldo_atual < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo: %, Necessário: %', v_saldo_atual, p_valor;
  END IF;
  
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
$function$;

-- 6. update_recargas_pix_updated_at
CREATE OR REPLACE FUNCTION public.update_recargas_pix_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;