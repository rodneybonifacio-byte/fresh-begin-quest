-- =====================================================
-- CORRIGIR RLS - parceiros: Políticas PERMISSIVE corretas
-- =====================================================

-- Remover políticas antigas que podem estar causando problemas
DROP POLICY IF EXISTS "parceiros_veem_proprio_perfil" ON public.parceiros;
DROP POLICY IF EXISTS "parceiros_atualizam_proprio_perfil" ON public.parceiros;
DROP POLICY IF EXISTS "deny_anon_parceiros_select" ON public.parceiros;
DROP POLICY IF EXISTS "deny_anon_parceiros_insert" ON public.parceiros;
DROP POLICY IF EXISTS "deny_anon_parceiros_update" ON public.parceiros;
DROP POLICY IF EXISTS "deny_anon_parceiros_delete" ON public.parceiros;
DROP POLICY IF EXISTS "service_role_full_access_parceiros" ON public.parceiros;

-- Garantir que RLS está ativado
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceiros FORCE ROW LEVEL SECURITY;

-- Política PERMISSIVE: Parceiros autenticados veem APENAS seu próprio perfil
CREATE POLICY "parceiros_autenticados_veem_proprio_perfil" ON public.parceiros
FOR SELECT TO authenticated
USING (get_parceiro_id_from_jwt() IS NOT NULL AND id = get_parceiro_id_from_jwt());

-- Política PERMISSIVE: Parceiros autenticados atualizam APENAS seu próprio perfil
CREATE POLICY "parceiros_autenticados_atualizam_proprio_perfil" ON public.parceiros
FOR UPDATE TO authenticated
USING (get_parceiro_id_from_jwt() IS NOT NULL AND id = get_parceiro_id_from_jwt())
WITH CHECK (get_parceiro_id_from_jwt() IS NOT NULL AND id = get_parceiro_id_from_jwt());

-- Política PERMISSIVE: Admins têm acesso total
CREATE POLICY "admin_acesso_total_parceiros" ON public.parceiros
FOR ALL TO authenticated
USING (is_admin_from_jwt())
WITH CHECK (is_admin_from_jwt());

-- Política PERMISSIVE: Service role tem acesso total (para edge functions)
CREATE POLICY "service_role_parceiros" ON public.parceiros
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- CORRIGIR RLS - remetentes: Reforçar políticas
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "usuarios_autenticados_veem_proprios_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "usuarios_autenticados_criam_proprios_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "usuarios_autenticados_atualizam_proprios_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "usuarios_autenticados_deletam_proprios_remetentes" ON public.remetentes;
DROP POLICY IF EXISTS "deny_anon_remetentes_select" ON public.remetentes;
DROP POLICY IF EXISTS "deny_anon_remetentes_insert" ON public.remetentes;
DROP POLICY IF EXISTS "deny_anon_remetentes_update" ON public.remetentes;
DROP POLICY IF EXISTS "deny_anon_remetentes_delete" ON public.remetentes;
DROP POLICY IF EXISTS "service_role_gerencia_remetentes" ON public.remetentes;

-- Garantir que RLS está ativado
ALTER TABLE public.remetentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remetentes FORCE ROW LEVEL SECURITY;

-- Política PERMISSIVE: Usuários autenticados veem APENAS seus próprios remetentes
CREATE POLICY "usuarios_veem_proprios_remetentes" ON public.remetentes
FOR SELECT TO authenticated
USING (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

-- Política PERMISSIVE: Usuários autenticados criam remetentes para si mesmos
CREATE POLICY "usuarios_criam_proprios_remetentes" ON public.remetentes
FOR INSERT TO authenticated
WITH CHECK (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

-- Política PERMISSIVE: Usuários autenticados atualizam seus próprios remetentes
CREATE POLICY "usuarios_atualizam_proprios_remetentes" ON public.remetentes
FOR UPDATE TO authenticated
USING (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
)
WITH CHECK (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

-- Política PERMISSIVE: Usuários autenticados deletam seus próprios remetentes
CREATE POLICY "usuarios_deletam_proprios_remetentes" ON public.remetentes
FOR DELETE TO authenticated
USING (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

-- Política PERMISSIVE: Service role tem acesso total (para edge functions)
CREATE POLICY "service_role_remetentes" ON public.remetentes
FOR ALL TO service_role
USING (true)
WITH CHECK (true);