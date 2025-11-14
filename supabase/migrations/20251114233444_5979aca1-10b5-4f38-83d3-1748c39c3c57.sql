-- Remover política antiga que não funciona com JWT customizado
DROP POLICY IF EXISTS "usuarios_veem_proprias_transacoes" ON public.transacoes_credito;

-- Criar função para extrair cliente_id do JWT customizado
CREATE OR REPLACE FUNCTION public.get_cliente_id_from_jwt()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_payload jsonb;
  extracted_cliente_id text;
BEGIN
  -- Obter o payload do JWT das configurações da requisição
  jwt_payload := current_setting('request.jwt.claims', true)::jsonb;
  
  -- Extrair o clienteId do payload
  extracted_cliente_id := jwt_payload->>'clienteId';
  
  -- Retornar como UUID (ou NULL se não existir)
  RETURN extracted_cliente_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Criar nova política que usa o cliente_id do JWT customizado
CREATE POLICY "usuarios_veem_proprias_transacoes_jwt" 
ON public.transacoes_credito
FOR SELECT
TO authenticated
USING (
  cliente_id = public.get_cliente_id_from_jwt()
  OR
  cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'clienteId')
);

-- Política para permitir service_role ver todas as transações
CREATE POLICY "service_role_ve_todas_transacoes" 
ON public.transacoes_credito
FOR SELECT
TO service_role
USING (true);