-- Fix search_path for update_etiquetas_pendentes_updated_at function
CREATE OR REPLACE FUNCTION public.update_etiquetas_pendentes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$function$;