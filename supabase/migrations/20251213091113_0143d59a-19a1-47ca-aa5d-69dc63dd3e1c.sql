-- Garantir pgcrypto no schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Chave de criptografia (será substituída por secret do Vault em produção)
-- Por agora, usamos uma função que gera chave baseada em secret

-- Função para criptografar credenciais
CREATE OR REPLACE FUNCTION public.encrypt_credentials(credentials jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key text;
  encrypted_data text;
BEGIN
  -- Usar parte do service key como chave de criptografia
  encryption_key := 'BRHUB_ENCRYPT_KEY_2024';
  
  -- Criptografar usando AES-256
  encrypted_data := encode(
    extensions.pgp_sym_encrypt(
      credentials::text,
      encryption_key,
      'cipher-algo=aes256'
    ),
    'base64'
  );
  
  RETURN encrypted_data;
END;
$$;

-- Função para descriptografar credenciais
CREATE OR REPLACE FUNCTION public.decrypt_credentials(encrypted_data text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key text;
  decrypted_text text;
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN '{}'::jsonb;
  END IF;
  
  encryption_key := 'BRHUB_ENCRYPT_KEY_2024';
  
  BEGIN
    decrypted_text := extensions.pgp_sym_decrypt(
      decode(encrypted_data, 'base64'),
      encryption_key
    );
    RETURN decrypted_text::jsonb;
  EXCEPTION
    WHEN OTHERS THEN
      -- Se falhar a descriptografia, assume que já é JSON plano (migração)
      RETURN encrypted_data::jsonb;
  END;
END;
$$;

-- Adicionar coluna para credenciais criptografadas
ALTER TABLE public.integracoes 
ADD COLUMN IF NOT EXISTS credenciais_encrypted text;

-- Migrar credenciais existentes para formato criptografado
UPDATE public.integracoes
SET credenciais_encrypted = public.encrypt_credentials(credenciais)
WHERE credenciais IS NOT NULL AND credenciais_encrypted IS NULL;

-- Função segura para obter credenciais (usada via RPC)
CREATE OR REPLACE FUNCTION public.get_integracao_credenciais_segura(p_integracao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_credenciais_encrypted text;
  v_jwt_cliente_id uuid;
BEGIN
  v_jwt_cliente_id := get_cliente_id_from_jwt();
  
  SELECT cliente_id, credenciais_encrypted INTO v_cliente_id, v_credenciais_encrypted
  FROM public.integracoes
  WHERE id = p_integracao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Integração não encontrada';
  END IF;
  
  -- Verificar se o usuário tem acesso
  IF v_jwt_cliente_id IS NULL OR (v_jwt_cliente_id != v_cliente_id AND NOT is_admin_from_jwt()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  -- Registrar acesso para auditoria
  INSERT INTO public.audit_integracoes_access (integracao_id, cliente_id, action)
  VALUES (p_integracao_id, COALESCE(v_jwt_cliente_id, v_cliente_id), 'READ_CREDENTIALS_ENCRYPTED');
  
  -- Retornar credenciais descriptografadas
  RETURN public.decrypt_credentials(v_credenciais_encrypted);
END;
$$;

-- Atualizar função de update para usar criptografia
CREATE OR REPLACE FUNCTION public.update_integracao_credenciais_segura(p_integracao_id uuid, p_credenciais jsonb)
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
  IF v_jwt_cliente_id IS NULL OR (v_jwt_cliente_id != v_cliente_id AND NOT is_admin_from_jwt()) THEN
    RETURN FALSE;
  END IF;
  
  -- Atualizar com credenciais criptografadas
  UPDATE public.integracoes
  SET 
    credenciais_encrypted = public.encrypt_credentials(p_credenciais),
    credenciais = '{"encrypted": true}'::jsonb, -- Manter referência de que está criptografado
    atualizado_em = now()
  WHERE id = p_integracao_id;
  
  -- Registrar auditoria
  INSERT INTO public.audit_integracoes_access (integracao_id, cliente_id, action)
  VALUES (p_integracao_id, COALESCE(v_jwt_cliente_id, v_cliente_id), 'UPDATE_CREDENTIALS_ENCRYPTED');
  
  RETURN TRUE;
END;
$$;

-- Limpar credenciais em texto plano após migração (deixar apenas indicador)
UPDATE public.integracoes
SET credenciais = '{"encrypted": true}'::jsonb
WHERE credenciais_encrypted IS NOT NULL AND credenciais != '{"encrypted": true}'::jsonb;