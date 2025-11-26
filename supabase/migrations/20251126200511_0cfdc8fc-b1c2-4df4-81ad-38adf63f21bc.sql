-- Corrigir função de liberação de crédito para manter histórico de estorno
-- Cria uma transação de estorno ao invés de deletar

DROP FUNCTION IF EXISTS public.liberar_credito_bloqueado(uuid, character varying);

CREATE OR REPLACE FUNCTION public.liberar_credito_bloqueado(
  p_emissao_id uuid, 
  p_codigo_objeto character varying DEFAULT NULL::character varying
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_codigo TEXT;
  v_transacao RECORD;
BEGIN
  v_codigo := COALESCE(p_codigo_objeto, p_emissao_id::text);
  
  -- Buscar a transação bloqueada
  SELECT * INTO v_transacao
  FROM public.transacoes_credito
  WHERE emissao_id = p_emissao_id 
    AND tipo = 'consumo'
    AND status = 'bloqueado'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Marcar a transação original como liberada (para histórico)
  UPDATE public.transacoes_credito
  SET 
    status = 'liberado',
    liberado_em = NOW(),
    updated_at = NOW()
  WHERE id = v_transacao.id;
  
  -- Criar transação de estorno (valor positivo) para devolver o crédito
  INSERT INTO public.transacoes_credito (
    cliente_id,
    tipo,
    valor,
    status,
    descricao,
    emissao_id
  )
  VALUES (
    v_transacao.cliente_id,
    'recarga',
    ABS(v_transacao.valor), -- Valor positivo para estorno
    'consumido',
    'Estorno de cancelamento - Etiqueta ' || v_codigo,
    p_emissao_id
  );
  
  RETURN TRUE;
END;
$function$;