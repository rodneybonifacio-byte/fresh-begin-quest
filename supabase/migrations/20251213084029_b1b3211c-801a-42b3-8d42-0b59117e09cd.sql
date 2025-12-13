
-- 1. Restringir UPDATE do contador_cadastros apenas para service_role
-- Remove a política de UPDATE aberta
DROP POLICY IF EXISTS "contador_update_autenticado" ON public.contador_cadastros;

-- Cria política de UPDATE apenas para service_role
CREATE POLICY "contador_update_service_role_only" ON public.contador_cadastros
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Adicionar audit logging para acesso às credenciais de integração
CREATE TABLE IF NOT EXISTS public.audit_integracoes_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  action text NOT NULL,
  accessed_at timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on audit table
ALTER TABLE public.audit_integracoes_access ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert/read audit logs
CREATE POLICY "service_role_full_access_audit_integracoes" ON public.audit_integracoes_access
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admin can read audit logs
CREATE POLICY "admin_read_audit_integracoes" ON public.audit_integracoes_access
FOR SELECT
USING (is_admin_from_jwt());

-- Block anonymous access
CREATE POLICY "deny_anon_access_audit_integracoes" ON public.audit_integracoes_access
FOR ALL
USING (false)
WITH CHECK (false);

-- 3. Criar função para criptografar/descriptografar credenciais
-- Nota: Em produção, usar pgcrypto com chave segura em vault
CREATE OR REPLACE FUNCTION public.mask_sensitive_credenciais(creds jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  masked jsonb;
BEGIN
  -- Mascara tokens e chaves sensíveis para exibição
  masked := creds;
  
  -- Mascara accessToken se existir
  IF masked ? 'accessToken' THEN
    masked := jsonb_set(masked, '{accessToken}', to_jsonb(
      CASE 
        WHEN length(masked->>'accessToken') > 8 
        THEN substring(masked->>'accessToken' from 1 for 4) || '****' || substring(masked->>'accessToken' from length(masked->>'accessToken')-3)
        ELSE '****'
      END
    ));
  END IF;
  
  -- Mascara userId se existir
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

-- 4. Criar view segura para integracoes que mascara credenciais sensíveis
CREATE OR REPLACE VIEW public.integracoes_safe AS
SELECT 
  id,
  cliente_id,
  plataforma,
  store_id,
  remetente_id,
  ativo,
  webhook_url,
  criado_em,
  atualizado_em,
  public.mask_sensitive_credenciais(credenciais) as credenciais_masked
FROM public.integracoes;

-- 5. Função para acessar credenciais completas com auditoria
CREATE OR REPLACE FUNCTION public.get_integracao_credenciais(p_integracao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_credenciais jsonb;
  v_jwt_cliente_id uuid;
BEGIN
  -- Obter cliente_id do JWT
  v_jwt_cliente_id := get_cliente_id_from_jwt();
  
  -- Buscar integração
  SELECT cliente_id, credenciais INTO v_cliente_id, v_credenciais
  FROM public.integracoes
  WHERE id = p_integracao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Integração não encontrada';
  END IF;
  
  -- Verificar se o usuário tem acesso
  IF v_jwt_cliente_id IS NULL OR v_jwt_cliente_id != v_cliente_id THEN
    -- Verificar se é admin
    IF NOT is_admin_from_jwt() THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;
  
  -- Registrar acesso para auditoria
  INSERT INTO public.audit_integracoes_access (integracao_id, cliente_id, action)
  VALUES (p_integracao_id, COALESCE(v_jwt_cliente_id, v_cliente_id), 'READ_CREDENTIALS');
  
  RETURN v_credenciais;
END;
$$;

-- 6. Função para atualizar credenciais com auditoria
CREATE OR REPLACE FUNCTION public.update_integracao_credenciais(p_integracao_id uuid, p_credenciais jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_jwt_cliente_id uuid;
BEGIN
  v_jwt_cliente_id := get_cliente_id_from_jwt();
  
  SELECT cliente_id INTO v_cliente_id
  FROM public.integracoes
  WHERE id = p_integracao_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar acesso
  IF v_jwt_cliente_id IS NULL OR v_jwt_cliente_id != v_cliente_id THEN
    IF NOT is_admin_from_jwt() THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Atualizar credenciais
  UPDATE public.integracoes
  SET credenciais = p_credenciais, atualizado_em = now()
  WHERE id = p_integracao_id;
  
  -- Registrar auditoria
  INSERT INTO public.audit_integracoes_access (integracao_id, cliente_id, action)
  VALUES (p_integracao_id, COALESCE(v_jwt_cliente_id, v_cliente_id), 'UPDATE_CREDENTIALS');
  
  RETURN TRUE;
END;
$$;

-- 7. Criar índice para performance de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_integracoes_access_integracao_id ON public.audit_integracoes_access(integracao_id);
CREATE INDEX IF NOT EXISTS idx_audit_integracoes_access_cliente_id ON public.audit_integracoes_access(cliente_id);
CREATE INDEX IF NOT EXISTS idx_audit_integracoes_access_accessed_at ON public.audit_integracoes_access(accessed_at DESC);
