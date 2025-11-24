-- Remove políticas restritivas existentes
DROP POLICY IF EXISTS "service_role_acesso_total_etiquetas_pendentes" ON public.etiquetas_pendentes_correcao;
DROP POLICY IF EXISTS "usuarios_autenticados_inserem_etiquetas_pendentes" ON public.etiquetas_pendentes_correcao;
DROP POLICY IF EXISTS "usuarios_autenticados_veem_etiquetas_pendentes" ON public.etiquetas_pendentes_correcao;
DROP POLICY IF EXISTS "usuarios_autenticados_atualizam_etiquetas_pendentes" ON public.etiquetas_pendentes_correcao;
DROP POLICY IF EXISTS "usuarios_autenticados_excluem_etiquetas_pendentes" ON public.etiquetas_pendentes_correcao;

-- Criar políticas permissivas para usuários autenticados
CREATE POLICY "usuarios_autenticados_acesso_total"
ON public.etiquetas_pendentes_correcao
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política adicional para service role (admin completo)
CREATE POLICY "service_role_acesso_total"
ON public.etiquetas_pendentes_correcao
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);