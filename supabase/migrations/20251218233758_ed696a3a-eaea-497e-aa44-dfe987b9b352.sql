-- 1. Adicionar coluna para CPF/CNPJ criptografado
ALTER TABLE public.remetentes 
ADD COLUMN IF NOT EXISTS cpf_cnpj_encrypted text;

-- 2. Criar função para mascarar CPF/CNPJ
CREATE OR REPLACE FUNCTION public.mask_cpf_cnpj(cpf_cnpj text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF cpf_cnpj IS NULL OR length(cpf_cnpj) < 4 THEN
    RETURN '***';
  END IF;
  
  -- CPF: 123.456.789-00 -> ***.***.789-**
  IF length(regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')) = 11 THEN
    RETURN '***.***.***-' || right(regexp_replace(cpf_cnpj, '[^0-9]', '', 'g'), 2);
  END IF;
  
  -- CNPJ: 12.345.678/0001-90 -> **.***.***/**01-**
  IF length(regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')) = 14 THEN
    RETURN '**.***.***/' || substring(regexp_replace(cpf_cnpj, '[^0-9]', '', 'g') from 9 for 4) || '-**';
  END IF;
  
  -- Outros: mascarar parcialmente
  RETURN left(cpf_cnpj, 3) || '***' || right(cpf_cnpj, 2);
END;
$$;

-- 3. Criar view mascarada para remetentes (uso no client)
CREATE OR REPLACE VIEW public.remetentes_masked AS
SELECT 
  id,
  cliente_id,
  nome,
  mask_cpf_cnpj(cpf_cnpj) as cpf_cnpj_masked,
  celular,
  telefone,
  email,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  localidade,
  uf,
  criado_em,
  atualizado_em,
  sincronizado_em,
  -- Campos sensíveis removidos da view
  CASE WHEN cpf_cnpj_encrypted IS NOT NULL THEN true ELSE false END as tem_cpf_encrypted
FROM public.remetentes;

-- 4. Adicionar RLS na view
ALTER VIEW public.remetentes_masked SET (security_invoker = true);

-- 5. Adicionar audit log para acesso aos remetentes
CREATE TABLE IF NOT EXISTS public.audit_remetentes_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  action text NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- 6. RLS para audit_remetentes_access
ALTER TABLE public.audit_remetentes_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_audit_remetentes" 
ON public.audit_remetentes_access 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "admin_read_audit_remetentes" 
ON public.audit_remetentes_access 
FOR SELECT 
USING (is_admin_from_jwt());

CREATE POLICY "deny_anon_audit_remetentes" 
ON public.audit_remetentes_access 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- 7. Função segura para obter CPF/CNPJ completo (apenas backend)
CREATE OR REPLACE FUNCTION public.get_remetente_cpf_cnpj_seguro(p_remetente_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_cpf_cnpj text;
  v_jwt_cliente_id uuid;
BEGIN
  v_jwt_cliente_id := get_cliente_id_from_jwt();
  
  SELECT cliente_id, cpf_cnpj INTO v_cliente_id, v_cpf_cnpj
  FROM public.remetentes
  WHERE id = p_remetente_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Remetente não encontrado';
  END IF;
  
  -- Verificar se o usuário tem acesso
  IF v_jwt_cliente_id IS NULL OR (v_jwt_cliente_id != v_cliente_id AND NOT is_admin_from_jwt()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  -- Registrar acesso para auditoria
  INSERT INTO public.audit_remetentes_access (remetente_id, cliente_id, action)
  VALUES (p_remetente_id, COALESCE(v_jwt_cliente_id, v_cliente_id), 'READ_CPF_CNPJ');
  
  RETURN v_cpf_cnpj;
END;
$$;