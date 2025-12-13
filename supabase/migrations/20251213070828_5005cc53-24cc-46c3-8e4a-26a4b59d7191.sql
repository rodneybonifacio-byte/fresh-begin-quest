-- 1. Remove policy that exposes bonus transactions publicly
DROP POLICY IF EXISTS "leitura_publica_transacoes_bonus" ON public.transacoes_credito;

-- 2. Add deny policy for anonymous access to notificacoes_aguardando_retirada
CREATE POLICY "deny_anon_access_notificacoes_aguardando" 
ON public.notificacoes_aguardando_retirada 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);