-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role full access" ON public.fechamentos_fatura;

-- Create restrictive policy: only service_role can access (for edge functions)
-- This is admin-only data, regular users should not access it directly
CREATE POLICY "service_role_only_access" 
ON public.fechamentos_fatura 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Block all authenticated users from direct access
-- They access this data through edge functions that use service_role
CREATE POLICY "deny_authenticated_direct_access" 
ON public.fechamentos_fatura 
FOR ALL 
TO authenticated
USING (false)
WITH CHECK (false);