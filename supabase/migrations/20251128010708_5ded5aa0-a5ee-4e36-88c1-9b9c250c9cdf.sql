-- Remove a política atual que é restritiva (não funciona corretamente)
DROP POLICY IF EXISTS "service_role_acesso_total_cadastros_origem" ON public.cadastros_origem;

-- Cria política PERMISSIVA para service_role (edge functions, admin backend)
CREATE POLICY "service_role_full_access_cadastros_origem"
ON public.cadastros_origem
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Cria política para usuários autenticados verem apenas seus próprios registros
CREATE POLICY "usuarios_veem_proprio_cadastro"
ON public.cadastros_origem
FOR SELECT
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt());