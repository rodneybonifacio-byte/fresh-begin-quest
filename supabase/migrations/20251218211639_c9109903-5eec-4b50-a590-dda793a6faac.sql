-- Atualiza a função para aceitar 'sub' ou 'clienteId' do JWT
CREATE OR REPLACE FUNCTION public.get_cliente_id_from_jwt()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_payload jsonb;
  jwt_claims text;
  extracted_cliente_id text;
BEGIN
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true);
    
    IF jwt_claims IS NULL OR jwt_claims = '' THEN
      RETURN NULL;
    END IF;
    
    jwt_payload := jwt_claims::jsonb;
    
    -- Tentar extrair de diferentes campos do JWT
    -- Primeiro tenta 'clienteId', depois 'sub', depois 'id'
    extracted_cliente_id := COALESCE(
      jwt_payload->>'clienteId',
      jwt_payload->>'sub',
      jwt_payload->>'id'
    );
    
    IF extracted_cliente_id IS NULL OR extracted_cliente_id = '' THEN
      RETURN NULL;
    END IF;
    
    -- Retornar como UUID
    RETURN extracted_cliente_id::uuid;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$$;