-- Ajustar políticas RLS da tabela recargas_pix para usar auth.uid() diretamente

-- Remover política antiga
DROP POLICY IF EXISTS "Clientes podem ver suas recargas" ON recargas_pix;

-- Criar nova política correta
CREATE POLICY "Usuários podem ver suas próprias recargas"
ON recargas_pix
FOR SELECT
TO authenticated
USING (cliente_id::text = auth.uid()::text);

-- Política para sistema inserir (edge function)
DROP POLICY IF EXISTS "Sistema pode inserir recargas" ON recargas_pix;

CREATE POLICY "Usuários podem inserir suas recargas"
ON recargas_pix
FOR INSERT
TO authenticated
WITH CHECK (cliente_id::text = auth.uid()::text);

-- Política para sistema atualizar (webhook)
DROP POLICY IF EXISTS "Sistema pode atualizar recargas" ON recargas_pix;

CREATE POLICY "Sistema pode atualizar recargas via service role"
ON recargas_pix
FOR UPDATE
TO service_role
USING (true);