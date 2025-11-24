-- Remover política INSERT restritiva
DROP POLICY IF EXISTS "usuarios_inserem_proprias_etiquetas_pendentes" ON etiquetas_pendentes_correcao;

-- Criar política INSERT permissiva para usuários autenticados
CREATE POLICY "usuarios_autenticados_inserem_etiquetas_pendentes"
ON etiquetas_pendentes_correcao
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Garantir que a política SELECT também é permissiva
DROP POLICY IF EXISTS "usuarios_veem_proprias_etiquetas_pendentes" ON etiquetas_pendentes_correcao;

CREATE POLICY "usuarios_autenticados_veem_etiquetas_pendentes"
ON etiquetas_pendentes_correcao
FOR SELECT
TO authenticated
USING (true);

-- Garantir que UPDATE também é permissivo
DROP POLICY IF EXISTS "usuarios_atualizam_proprias_etiquetas_pendentes" ON etiquetas_pendentes_correcao;

CREATE POLICY "usuarios_autenticados_atualizam_etiquetas_pendentes"
ON etiquetas_pendentes_correcao
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir que DELETE também é permissivo
DROP POLICY IF EXISTS "usuarios_excluem_proprias_etiquetas_pendentes" ON etiquetas_pendentes_correcao;

CREATE POLICY "usuarios_autenticados_excluem_etiquetas_pendentes"
ON etiquetas_pendentes_correcao
FOR DELETE
TO authenticated
USING (true);