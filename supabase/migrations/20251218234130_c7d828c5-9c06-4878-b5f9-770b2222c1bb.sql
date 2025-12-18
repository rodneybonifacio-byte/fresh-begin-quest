-- =====================================================
-- CORREÇÃO DE SEGURANÇA: remetentes e pedidos_importados
-- =====================================================

-- 1. Remover política problemática que dá acesso total ao role public
DROP POLICY IF EXISTS "service_role_pedidos_importados" ON public.pedidos_importados;

-- 2. Criar política correta apenas para service_role
CREATE POLICY "service_role_only_pedidos_importados"
ON public.pedidos_importados
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Garantir que as políticas de clientes estão restritas a authenticated
DROP POLICY IF EXISTS "clientes_veem_pedidos_importados" ON public.pedidos_importados;
DROP POLICY IF EXISTS "clientes_inserem_pedidos_importados" ON public.pedidos_importados;
DROP POLICY IF EXISTS "clientes_atualizam_pedidos_importados" ON public.pedidos_importados;
DROP POLICY IF EXISTS "clientes_deletam_pedidos_importados" ON public.pedidos_importados;

CREATE POLICY "authenticated_select_pedidos_importados"
ON public.pedidos_importados
FOR SELECT
TO authenticated
USING (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

CREATE POLICY "authenticated_insert_pedidos_importados"
ON public.pedidos_importados
FOR INSERT
TO authenticated
WITH CHECK (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

CREATE POLICY "authenticated_update_pedidos_importados"
ON public.pedidos_importados
FOR UPDATE
TO authenticated
USING (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
)
WITH CHECK (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

CREATE POLICY "authenticated_delete_pedidos_importados"
ON public.pedidos_importados
FOR DELETE
TO authenticated
USING (
  (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt())
  OR is_admin_from_jwt()
);

-- 4. Adicionar políticas explícitas de bloqueio para remetentes (anon)
DROP POLICY IF EXISTS "deny_anon_remetentes_select" ON public.remetentes;
DROP POLICY IF EXISTS "deny_anon_remetentes_insert" ON public.remetentes;
DROP POLICY IF EXISTS "deny_anon_remetentes_update" ON public.remetentes;
DROP POLICY IF EXISTS "deny_anon_remetentes_delete" ON public.remetentes;

CREATE POLICY "deny_anon_remetentes_select"
ON public.remetentes
FOR SELECT
TO anon
USING (false);

CREATE POLICY "deny_anon_remetentes_insert"
ON public.remetentes
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "deny_anon_remetentes_update"
ON public.remetentes
FOR UPDATE
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "deny_anon_remetentes_delete"
ON public.remetentes
FOR DELETE
TO anon
USING (false);

-- 5. Verificar e garantir que RLS está habilitado
ALTER TABLE public.pedidos_importados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remetentes ENABLE ROW LEVEL SECURITY;

-- 6. Forçar RLS para todos os usuários incluindo owners
ALTER TABLE public.pedidos_importados FORCE ROW LEVEL SECURITY;
ALTER TABLE public.remetentes FORCE ROW LEVEL SECURITY;