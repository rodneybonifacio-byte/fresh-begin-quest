-- Criar função segura para validar código de parceiro publicamente
CREATE OR REPLACE FUNCTION public.validar_codigo_parceiro(p_codigo text)
RETURNS TABLE(nome text, codigo_parceiro text, valido boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.nome,
    p.codigo_parceiro,
    TRUE as valido
  FROM public.parceiros p
  WHERE p.codigo_parceiro = upper(trim(p_codigo))
    AND p.status = 'aprovado'
  LIMIT 1;
END;
$$;