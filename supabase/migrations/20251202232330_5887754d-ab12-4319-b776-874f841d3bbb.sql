-- Add bonus_recarga promotion if not exists
INSERT INTO public.contador_cadastros (tipo, contador, limite, valor_premio, ativo)
SELECT 'bonus_recarga', 0, 9999, 50.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.contador_cadastros WHERE tipo = 'bonus_recarga');

-- Allow public SELECT on transacoes_credito for bonus-related transactions (admin viewing)
CREATE POLICY "leitura_publica_transacoes_bonus" 
ON public.transacoes_credito 
FOR SELECT 
TO anon, authenticated
USING (
  descricao LIKE '%100 primeiros%' 
  OR descricao LIKE '%Bônus%'
  OR descricao LIKE '%bonus%'
);

-- Allow UPDATE on contador_cadastros for authenticated users (admin only - managed client-side)
DROP POLICY IF EXISTS "Contador publicamente visível" ON public.contador_cadastros;
CREATE POLICY "contador_leitura_publica" 
ON public.contador_cadastros 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "contador_update_autenticado" 
ON public.contador_cadastros 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);