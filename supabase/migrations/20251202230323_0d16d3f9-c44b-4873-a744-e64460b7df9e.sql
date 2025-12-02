-- Block anonymous access to cadastros_origem
CREATE POLICY "deny_anon_access_cadastros_origem" 
ON public.cadastros_origem 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);