-- Corrigir função de liberação de crédito bloqueado
-- Remove a transação bloqueada ao invés de inverter o valor

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
BEGIN
  v_codigo := COALESCE(p_codigo_objeto, p_emissao_id::text);
  
  -- Deletar a transação de crédito bloqueado ao invés de convertê-la em recarga
  -- Isso evita duplicação do valor no saldo do cliente
  DELETE FROM public.transacoes_credito
  WHERE emissao_id = p_emissao_id 
    AND tipo = 'consumo'
    AND status = 'bloqueado';
  
  RETURN FOUND;
END;
$function$;