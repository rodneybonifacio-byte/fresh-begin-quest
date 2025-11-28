-- Remove políticas RESTRICTIVE existentes da tabela remetentes
DROP POLICY IF EXISTS "service_role_gerencia_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "usuarios_autenticados_veem_proprios_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "usuarios_autenticados_criam_proprios_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "usuarios_autenticados_atualizam_proprios_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "usuarios_autenticados_deletam_proprios_remetentes" ON public.remetentes;

-- Cria política PERMISSIVA para service_role (acesso total para backend/admin)
CREATE POLICY "service_role_gerencia_remetentes"
ON public.remetentes
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Cria política PERMISSIVA para SELECT (usuários autenticados veem próprios remetentes)
CREATE POLICY "usuarios_autenticados_veem_proprios_remetentes"
ON public.remetentes
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((get_cliente_id_from_jwt() IS NOT NULL) AND (cliente_id = get_cliente_id_from_jwt()));

-- Cria política PERMISSIVA para INSERT (usuários autenticados criam próprios remetentes)
CREATE POLICY "usuarios_autenticados_criam_proprios_remetentes"
ON public.remetentes
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((get_cliente_id_from_jwt() IS NOT NULL) AND (cliente_id = get_cliente_id_from_jwt()));

-- Cria política PERMISSIVA para UPDATE (usuários autenticados atualizam próprios remetentes)
CREATE POLICY "usuarios_autenticados_atualizam_proprios_remetentes"
ON public.remetentes
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((get_cliente_id_from_jwt() IS NOT NULL) AND (cliente_id = get_cliente_id_from_jwt()))
WITH CHECK ((get_cliente_id_from_jwt() IS NOT NULL) AND (cliente_id = get_cliente_id_from_jwt()));

-- Cria política PERMISSIVA para DELETE (usuários autenticados deletam próprios remetentes)
CREATE POLICY "usuarios_autenticados_deletam_proprios_remetentes"
ON public.remetentes
AS PERMISSIVE
FOR DELETE
TO authenticated
USING ((get_cliente_id_from_jwt() IS NOT NULL) AND (cliente_id = get_cliente_id_from_jwt()));