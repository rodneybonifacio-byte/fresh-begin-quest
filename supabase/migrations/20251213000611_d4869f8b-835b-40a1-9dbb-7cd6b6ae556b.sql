-- =============================================
-- FIX: logs_acesso - Block anonymous access
-- =============================================

-- Add a PERMISSIVE policy that denies anonymous access (anon role)
-- This ensures only authenticated users with proper JWT can access data
CREATE POLICY "deny_anon_access_logs_acesso"
ON public.logs_acesso
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =============================================
-- FIX: parceiros - Block anonymous access
-- =============================================

-- Add a PERMISSIVE policy that denies anonymous access (anon role)
CREATE POLICY "deny_anon_access_parceiros"
ON public.parceiros
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);