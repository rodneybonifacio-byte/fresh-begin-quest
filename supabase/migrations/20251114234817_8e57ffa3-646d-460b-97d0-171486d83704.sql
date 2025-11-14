-- Testar a função get_cliente_id_from_jwt e adicionar mais logs
CREATE OR REPLACE FUNCTION public.get_cliente_id_from_jwt()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_payload jsonb;
  jwt_claims text;
  extracted_cliente_id text;
BEGIN
  -- Tentar obter o JWT de diferentes formas
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true);
    RAISE NOTICE 'JWT claims string: %', jwt_claims;
    
    IF jwt_claims IS NULL OR jwt_claims = '' THEN
      RAISE NOTICE 'JWT claims está vazio ou NULL';
      RETURN NULL;
    END IF;
    
    jwt_payload := jwt_claims::jsonb;
    RAISE NOTICE 'JWT payload completo: %', jwt_payload;
    
    -- Extrair o clienteId
    extracted_cliente_id := jwt_payload->>'clienteId';
    RAISE NOTICE 'clienteId extraído: %', extracted_cliente_id;
    
    IF extracted_cliente_id IS NULL OR extracted_cliente_id = '' THEN
      RAISE NOTICE 'clienteId não encontrado no JWT';
      RETURN NULL;
    END IF;
    
    -- Retornar como UUID
    RETURN extracted_cliente_id::uuid;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao processar JWT: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      RETURN NULL;
  END;
END;
$$;

-- Atualizar política com logs mais detalhados
DROP POLICY IF EXISTS "usuarios_veem_proprias_transacoes_jwt" ON public.transacoes_credito;

CREATE POLICY "usuarios_veem_proprias_transacoes_jwt" 
ON public.transacoes_credito 
FOR SELECT 
USING (
  -- Método 1: Usando função
  (cliente_id = public.get_cliente_id_from_jwt())
  OR
  -- Método 2: Extração direta
  ((cliente_id)::text = (current_setting('request.jwt.claims', true)::jsonb->>'clienteId'))
  OR
  -- Método 3: auth.uid() padrão
  (cliente_id = auth.uid())
);