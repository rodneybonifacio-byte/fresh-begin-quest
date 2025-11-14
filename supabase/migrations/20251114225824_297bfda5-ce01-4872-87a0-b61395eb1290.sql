-- Garantir isolamento total por usuário autenticado
-- Todas as políticas RLS devem usar auth.uid() diretamente

-- ============================================
-- TABELA: recargas_pix
-- ============================================

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias recargas" ON recargas_pix;
DROP POLICY IF EXISTS "Usuários podem inserir suas recargas" ON recargas_pix;
DROP POLICY IF EXISTS "Sistema pode atualizar recargas via service role" ON recargas_pix;

-- Usuários só veem suas próprias recargas
CREATE POLICY "usuarios_veem_proprias_recargas"
ON recargas_pix
FOR SELECT
TO authenticated
USING (cliente_id = auth.uid());

-- Usuários só podem criar recargas para si mesmos
CREATE POLICY "usuarios_criam_proprias_recargas"
ON recargas_pix
FOR INSERT
TO authenticated
WITH CHECK (cliente_id = auth.uid());

-- Service role pode atualizar (para webhooks)
CREATE POLICY "service_role_atualiza_recargas"
ON recargas_pix
FOR UPDATE
TO service_role
USING (true);

-- ============================================
-- TABELA: transacoes_credito
-- ============================================

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Clientes podem ver suas transações" ON transacoes_credito;
DROP POLICY IF EXISTS "Sistema pode inserir transações" ON transacoes_credito;

-- Usuários só veem suas próprias transações
CREATE POLICY "usuarios_veem_proprias_transacoes"
ON transacoes_credito
FOR SELECT
TO authenticated
USING (cliente_id::text = auth.uid()::text);

-- Service role pode inserir transações (via funções)
CREATE POLICY "service_role_insere_transacoes"
ON transacoes_credito
FOR INSERT
TO service_role
WITH CHECK (true);

-- Authenticated users podem inserir suas próprias transações
CREATE POLICY "usuarios_inserem_proprias_transacoes"
ON transacoes_credito
FOR INSERT
TO authenticated
WITH CHECK (cliente_id::text = auth.uid()::text);