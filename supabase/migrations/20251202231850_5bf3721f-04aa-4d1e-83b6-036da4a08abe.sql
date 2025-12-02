-- Add admin policy to view all transactions in transacoes_credito
CREATE POLICY "admin_ve_todas_transacoes" 
ON public.transacoes_credito 
FOR SELECT 
TO authenticated
USING (is_admin_from_jwt());