-- Remove a política vulnerável existente
DROP POLICY IF EXISTS "usuarios_veem_proprios_remetentes" ON public.remetentes;

-- Criar nova política de SELECT mais segura
-- Usa get_cliente_id_from_jwt() E verifica se o resultado não é NULL
-- Isso bloqueia completamente o acesso quando não há JWT válido
CREATE POLICY "usuarios_autenticados_veem_proprios_remetentes" 
ON public.remetentes 
FOR SELECT 
TO authenticated
USING (
  get_cliente_id_from_jwt() IS NOT NULL 
  AND cliente_id = get_cliente_id_from_jwt()
);

-- Adicionar política para INSERT - usuários só podem criar remetentes para si mesmos
CREATE POLICY "usuarios_autenticados_criam_proprios_remetentes" 
ON public.remetentes 
FOR INSERT 
TO authenticated
WITH CHECK (
  get_cliente_id_from_jwt() IS NOT NULL 
  AND cliente_id = get_cliente_id_from_jwt()
);

-- Adicionar política para UPDATE - usuários só podem atualizar seus próprios remetentes
CREATE POLICY "usuarios_autenticados_atualizam_proprios_remetentes" 
ON public.remetentes 
FOR UPDATE 
TO authenticated
USING (
  get_cliente_id_from_jwt() IS NOT NULL 
  AND cliente_id = get_cliente_id_from_jwt()
)
WITH CHECK (
  get_cliente_id_from_jwt() IS NOT NULL 
  AND cliente_id = get_cliente_id_from_jwt()
);

-- Adicionar política para DELETE - usuários só podem deletar seus próprios remetentes
CREATE POLICY "usuarios_autenticados_deletam_proprios_remetentes" 
ON public.remetentes 
FOR DELETE 
TO authenticated
USING (
  get_cliente_id_from_jwt() IS NOT NULL 
  AND cliente_id = get_cliente_id_from_jwt()
);