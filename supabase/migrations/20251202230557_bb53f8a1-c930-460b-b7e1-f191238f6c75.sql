-- Drop the overly permissive policy
DROP POLICY IF EXISTS "usuarios_autenticados_acesso_total" ON public.etiquetas_pendentes_correcao;

-- Create proper RLS policies restricting by cliente_id
CREATE POLICY "usuarios_veem_proprias_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR SELECT 
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt());

CREATE POLICY "usuarios_criam_proprias_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR INSERT 
TO authenticated
WITH CHECK (cliente_id = get_cliente_id_from_jwt());

CREATE POLICY "usuarios_atualizam_proprias_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR UPDATE 
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt())
WITH CHECK (cliente_id = get_cliente_id_from_jwt());

CREATE POLICY "usuarios_deletam_proprias_etiquetas_correcao" 
ON public.etiquetas_pendentes_correcao 
FOR DELETE 
TO authenticated
USING (cliente_id = get_cliente_id_from_jwt());