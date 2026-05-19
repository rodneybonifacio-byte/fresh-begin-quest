DROP POLICY IF EXISTS public_read_horarios ON public.clientes_coleta_horarios;
CREATE POLICY public_read_horarios
ON public.clientes_coleta_horarios
FOR SELECT
TO anon, authenticated
USING (ativo = true);

DROP POLICY IF EXISTS public_read_coletas_confirmadas ON public.coletas_confirmadas;
CREATE POLICY public_read_coletas_confirmadas
ON public.coletas_confirmadas
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS public_write_coletas_confirmadas ON public.coletas_confirmadas;
CREATE POLICY public_write_coletas_confirmadas
ON public.coletas_confirmadas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS public_delete_coletas_confirmadas ON public.coletas_confirmadas;
CREATE POLICY public_delete_coletas_confirmadas
ON public.coletas_confirmadas
FOR DELETE
TO anon, authenticated
USING (true);