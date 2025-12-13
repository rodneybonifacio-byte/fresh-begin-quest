
-- Remover a view SECURITY DEFINER que causou warning
DROP VIEW IF EXISTS public.integracoes_safe;

-- Atualizar a função mask_sensitive_credenciais para SECURITY INVOKER
DROP FUNCTION IF EXISTS public.mask_sensitive_credenciais(jsonb);

CREATE OR REPLACE FUNCTION public.mask_sensitive_credenciais(creds jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  masked jsonb;
BEGIN
  masked := creds;
  
  IF masked ? 'accessToken' THEN
    masked := jsonb_set(masked, '{accessToken}', to_jsonb(
      CASE 
        WHEN length(masked->>'accessToken') > 8 
        THEN substring(masked->>'accessToken' from 1 for 4) || '****' || substring(masked->>'accessToken' from length(masked->>'accessToken')-3)
        ELSE '****'
      END
    ));
  END IF;
  
  IF masked ? 'userId' THEN
    masked := jsonb_set(masked, '{userId}', to_jsonb(
      CASE 
        WHEN length(masked->>'userId') > 6 
        THEN substring(masked->>'userId' from 1 for 3) || '***'
        ELSE '***'
      END
    ));
  END IF;
  
  RETURN masked;
END;
$$;
