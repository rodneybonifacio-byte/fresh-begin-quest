-- Adicionar logs para debug da função get_cliente_id_from_jwt
CREATE OR REPLACE FUNCTION public.get_cliente_id_from_jwt()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_payload jsonb;
  extracted_cliente_id text;
BEGIN
  -- Obter o payload do JWT das configurações da requisição
  jwt_payload := current_setting('request.jwt.claims', true)::jsonb;
  
  -- Log para debug (será removido após testes)
  RAISE NOTICE 'JWT Payload: %', jwt_payload;
  
  -- Extrair o clienteId do payload
  extracted_cliente_id := jwt_payload->>'clienteId';
  
  -- Log para debug
  RAISE NOTICE 'Extracted cliente_id: %', extracted_cliente_id;
  
  -- Retornar como UUID (ou NULL se não existir)
  RETURN extracted_cliente_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao extrair cliente_id: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Remover a política antiga que pode estar causando problemas
DROP POLICY IF EXISTS "usuarios_veem_proprias_transacoes" ON public.transacoes_credito;

-- Recriar a política com melhor suporte para JWT customizado
DROP POLICY IF EXISTS "usuarios_veem_proprias_transacoes_jwt" ON public.transacoes_credito;

CREATE POLICY "usuarios_veem_proprias_transacoes_jwt" 
ON public.transacoes_credito 
FOR SELECT 
USING (
  -- Permitir se o cliente_id da transação corresponde ao clienteId do JWT
  (cliente_id = public.get_cliente_id_from_jwt())
  OR
  -- Fallback: extrair clienteId diretamente do JWT (sem função)
  ((cliente_id)::text = (current_setting('request.jwt.claims', true)::jsonb->>'clienteId'))
  OR
  -- Fallback para auth.uid() se usar Supabase Auth padrão
  (cliente_id = auth.uid())
);