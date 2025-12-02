-- Create function to check if user is admin from JWT
CREATE OR REPLACE FUNCTION public.is_admin_from_jwt()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
  RETURN jwt_role = 'ADMIN';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Update fechamentos_fatura: allow admin access
DROP POLICY IF EXISTS "deny_authenticated_direct_access" ON public.fechamentos_fatura;
CREATE POLICY "admin_acesso_total_fechamentos" 
ON public.fechamentos_fatura 
FOR ALL 
TO authenticated
USING (is_admin_from_jwt())
WITH CHECK (is_admin_from_jwt());

-- Update cadastros_origem: allow admin to see all
DROP POLICY IF EXISTS "usuarios_veem_proprio_cadastro" ON public.cadastros_origem;
CREATE POLICY "usuarios_ou_admin_veem_cadastros" 
ON public.cadastros_origem 
FOR SELECT 
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt() OR is_admin_from_jwt());

-- Update etiquetas_pendentes_correcao: allow admin full access
DROP POLICY IF EXISTS "usuarios_veem_proprias_etiquetas_correcao" ON public.etiquetas_pendentes_correcao;
DROP POLICY IF EXISTS "usuarios_criam_proprias_etiquetas_correcao" ON public.etiquetas_pendentes_correcao;
DROP POLICY IF EXISTS "usuarios_atualizam_proprias_etiquetas_correcao" ON public.etiquetas_pendentes_correcao;
DROP POLICY IF EXISTS "usuarios_deletam_proprias_etiquetas_correcao" ON public.etiquetas_pendentes_correcao;

CREATE POLICY "usuarios_ou_admin_veem_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR SELECT 
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt() OR is_admin_from_jwt());

CREATE POLICY "usuarios_ou_admin_criam_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR INSERT 
TO authenticated
WITH CHECK (cliente_id = get_cliente_id_from_jwt() OR is_admin_from_jwt());

CREATE POLICY "usuarios_ou_admin_atualizam_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR UPDATE 
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt() OR is_admin_from_jwt())
WITH CHECK (cliente_id = get_cliente_id_from_jwt() OR is_admin_from_jwt());

CREATE POLICY "usuarios_ou_admin_deletam_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR DELETE 
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt() OR is_admin_from_jwt());