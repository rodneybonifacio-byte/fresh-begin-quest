-- Remove políticas existentes que estão como RESTRICTIVE
DROP POLICY IF EXISTS "service_role_full_access_cadastros_origem" ON public.cadastros_origem;
DROP POLICY IF EXISTS "usuarios_veem_proprio_cadastro" ON public.cadastros_origem;

-- Cria política PERMISSIVA para service_role (acesso total para backend/admin)
CREATE POLICY "service_role_full_access_cadastros_origem"
ON public.cadastros_origem
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Cria política PERMISSIVA para usuários autenticados (apenas próprios registros)
CREATE POLICY "usuarios_veem_proprio_cadastro"
ON public.cadastros_origem
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt());