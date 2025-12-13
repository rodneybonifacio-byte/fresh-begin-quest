-- =============================================
-- FIX: sessoes_ativas - Block anonymous access
-- =============================================
CREATE POLICY "deny_anon_access_sessoes_ativas"
ON public.sessoes_ativas
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =============================================
-- FIX: emissoes_em_atraso - Block anonymous access
-- =============================================
CREATE POLICY "deny_anon_access_emissoes_atraso"
ON public.emissoes_em_atraso
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =============================================
-- FIX: cadastros_origem - Ensure anon denial exists
-- =============================================
-- Already has deny_anon_access_cadastros_origem, skip