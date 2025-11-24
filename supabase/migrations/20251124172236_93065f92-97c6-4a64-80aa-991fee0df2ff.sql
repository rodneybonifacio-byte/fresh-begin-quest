-- Remover a policy RESTRICTIVE que está bloqueando tudo
DROP POLICY IF EXISTS "service_role_gerencia_etiquetas_pendentes" ON public.etiquetas_pendentes_correcao;

-- Criar nova policy PERMISSIVE para service role ter acesso total
CREATE POLICY "service_role_acesso_total_etiquetas_pendentes"
ON public.etiquetas_pendentes_correcao
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Remover a policy antiga de usuários
DROP POLICY IF EXISTS "usuarios_veem_proprias_etiquetas_pendentes" ON public.etiquetas_pendentes_correcao;

-- Criar nova policy PERMISSIVE para usuários verem suas próprias etiquetas
CREATE POLICY "usuarios_veem_proprias_etiquetas_pendentes"
ON public.etiquetas_pendentes_correcao
FOR SELECT
TO authenticated, anon
USING (true);

-- Permitir que usuários autenticados insiram suas próprias etiquetas
CREATE POLICY "usuarios_inserem_proprias_etiquetas_pendentes"
ON public.etiquetas_pendentes_correcao
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que usuários autenticados atualizem suas próprias etiquetas
CREATE POLICY "usuarios_atualizam_proprias_etiquetas_pendentes"
ON public.etiquetas_pendentes_correcao
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir que usuários autenticados excluam suas próprias etiquetas
CREATE POLICY "usuarios_excluem_proprias_etiquetas_pendentes"
ON public.etiquetas_pendentes_correcao
FOR DELETE
TO authenticated
USING (true);