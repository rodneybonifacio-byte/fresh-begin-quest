-- 1. Adicionar políticas deny para anônimos na tabela pedidos_importados
CREATE POLICY "deny_anon_pedidos_importados_select" 
ON public.pedidos_importados 
FOR SELECT 
TO anon
USING (false);

CREATE POLICY "deny_anon_pedidos_importados_insert" 
ON public.pedidos_importados 
FOR INSERT 
TO anon
WITH CHECK (false);

CREATE POLICY "deny_anon_pedidos_importados_update" 
ON public.pedidos_importados 
FOR UPDATE 
TO anon
USING (false);

CREATE POLICY "deny_anon_pedidos_importados_delete" 
ON public.pedidos_importados 
FOR DELETE 
TO anon
USING (false);

-- 2. Migrar credenciais plaintext para encrypted e limpar campo original
-- Primeiro, atualizar registros que têm credenciais plaintext (não encrypted)
UPDATE public.integracoes
SET 
  credenciais_encrypted = encrypt_credentials(credenciais),
  credenciais = '{"encrypted": true}'::jsonb
WHERE credenciais_encrypted IS NULL 
  AND credenciais IS NOT NULL 
  AND credenciais != '{"encrypted": true}'::jsonb;

-- 3. Criar trigger para garantir que novas inserções sempre criptografem
CREATE OR REPLACE FUNCTION public.encrypt_credentials_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se credenciais não está marcado como encrypted e credenciais_encrypted está vazio
  IF NEW.credenciais IS NOT NULL 
     AND NEW.credenciais != '{"encrypted": true}'::jsonb 
     AND (NEW.credenciais_encrypted IS NULL OR NEW.credenciais_encrypted = '') THEN
    NEW.credenciais_encrypted := encrypt_credentials(NEW.credenciais);
    NEW.credenciais := '{"encrypted": true}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_encrypt_credentials_on_insert
BEFORE INSERT ON public.integracoes
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_credentials_on_insert();

-- 4. Criar trigger para updates também
CREATE OR REPLACE FUNCTION public.encrypt_credentials_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se credenciais foi modificado e não está marcado como encrypted
  IF NEW.credenciais IS DISTINCT FROM OLD.credenciais 
     AND NEW.credenciais IS NOT NULL 
     AND NEW.credenciais != '{"encrypted": true}'::jsonb THEN
    NEW.credenciais_encrypted := encrypt_credentials(NEW.credenciais);
    NEW.credenciais := '{"encrypted": true}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_encrypt_credentials_on_update
BEFORE UPDATE ON public.integracoes
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_credentials_on_update();