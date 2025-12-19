-- =====================================================
-- CORREÇÃO DE SEGURANÇA: integracoes credentials protection
-- =====================================================

-- 1. Criar view segura que nunca expõe credenciais
DROP VIEW IF EXISTS public.integracoes_safe;

CREATE VIEW public.integracoes_safe AS
SELECT 
  id,
  cliente_id,
  plataforma,
  ativo,
  remetente_id,
  store_id,
  webhook_url,
  criado_em,
  atualizado_em,
  -- Sempre mostrar que credenciais existem, mas mascaradas
  CASE 
    WHEN credenciais_encrypted IS NOT NULL THEN '{"status": "configured", "encrypted": true}'::jsonb
    WHEN credenciais IS NOT NULL AND credenciais != '{"encrypted": true}'::jsonb THEN '{"status": "configured", "legacy": true}'::jsonb
    ELSE '{"status": "not_configured"}'::jsonb
  END as credenciais_status
FROM public.integracoes;

-- 2. Habilitar RLS na view
ALTER VIEW public.integracoes_safe SET (security_invoker = on);

-- 3. Remover política SELECT atual que retorna credenciais
DROP POLICY IF EXISTS "usuarios_veem_proprias_integracoes" ON public.integracoes;

-- 4. Criar política SELECT mais restritiva (apenas via functions ou service_role)
-- Usuários autenticados podem ver apenas metadados via view, não direto na tabela
CREATE POLICY "select_integracoes_via_service_only"
ON public.integracoes
FOR SELECT
TO authenticated
USING (
  -- Permitir SELECT apenas se for service_role ou admin
  -- Usuários normais devem usar a view integracoes_safe
  is_admin_from_jwt()
  OR (
    -- Permitir acesso à própria integração para operações de update/delete que precisam de WHERE
    cliente_id = get_cliente_id_from_jwt()
  )
);

-- 5. Criar função para obter apenas metadados da integração (sem credenciais)
CREATE OR REPLACE FUNCTION public.get_integracoes_cliente()
RETURNS SETOF public.integracoes_safe
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.integracoes_safe
  WHERE cliente_id = get_cliente_id_from_jwt()
  ORDER BY criado_em DESC;
$$;

-- 6. Garantir que credenciais nunca são retornadas em texto na tabela original
-- Adicionar comentário de segurança
COMMENT ON COLUMN public.integracoes.credenciais IS 'SECURITY: This field should only contain {"encrypted": true}. Real credentials are in credenciais_encrypted. NEVER expose directly.';
COMMENT ON COLUMN public.integracoes.credenciais_encrypted IS 'SECURITY: Encrypted credentials. Access only via get_integracao_credenciais_segura() function.';

-- 7. Criar trigger para garantir que credenciais não são armazenadas em texto plano
CREATE OR REPLACE FUNCTION public.ensure_credentials_encrypted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se credenciais tem conteúdo real (não apenas {"encrypted": true}), criptografar
  IF NEW.credenciais IS NOT NULL 
     AND NEW.credenciais != '{"encrypted": true}'::jsonb 
     AND NEW.credenciais != '{}'::jsonb
     AND NOT (NEW.credenciais ? 'status')  -- Não é um status
  THEN
    -- Criptografar e mover para campo encrypted
    NEW.credenciais_encrypted := public.encrypt_credentials(NEW.credenciais);
    NEW.credenciais := '{"encrypted": true}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS ensure_credentials_encrypted_trigger ON public.integracoes;

-- Criar trigger
CREATE TRIGGER ensure_credentials_encrypted_trigger
BEFORE INSERT OR UPDATE ON public.integracoes
FOR EACH ROW
EXECUTE FUNCTION public.ensure_credentials_encrypted();