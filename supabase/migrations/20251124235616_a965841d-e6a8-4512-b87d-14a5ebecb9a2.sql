-- Fix RLS policies for recargas_pix table to use correct JWT authentication
-- Drop existing policies that use auth.uid()
DROP POLICY IF EXISTS "usuarios_veem_proprias_recargas" ON public.recargas_pix;
DROP POLICY IF EXISTS "usuarios_criam_proprias_recargas" ON public.recargas_pix;
DROP POLICY IF EXISTS "usuarios_atualizam_proprias_recargas" ON public.recargas_pix;

-- Create secure policies using get_cliente_id_from_jwt() for proper multi-tenant isolation
CREATE POLICY "usuarios_veem_proprias_recargas"
ON public.recargas_pix
FOR SELECT
TO authenticated
USING (
  cliente_id = get_cliente_id_from_jwt() 
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
);

CREATE POLICY "usuarios_criam_proprias_recargas"
ON public.recargas_pix
FOR INSERT
TO authenticated
WITH CHECK (
  cliente_id = get_cliente_id_from_jwt()
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
);

CREATE POLICY "usuarios_atualizam_proprias_recargas"
ON public.recargas_pix
FOR UPDATE
TO authenticated
USING (
  cliente_id = get_cliente_id_from_jwt()
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
)
WITH CHECK (
  (cliente_id = get_cliente_id_from_jwt() 
   OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId'))
  AND status::text = ANY (ARRAY['pendente_pagamento'::character varying, 'aguardando_confirmacao'::character varying, 'cancelado'::character varying]::text[])
);

-- Service role maintains full access for edge functions
CREATE POLICY "service_role_acesso_total"
ON public.recargas_pix
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);