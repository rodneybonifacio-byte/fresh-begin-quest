-- Garantir que a função validar_codigo_parceiro pode ser executada por usuários anônimos
GRANT EXECUTE ON FUNCTION public.validar_codigo_parceiro(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validar_codigo_parceiro(text) TO authenticated;