-- Adicionar política para admins visualizarem emissoes_em_atraso
CREATE POLICY "admin_visualiza_emissoes_atraso" 
ON public.emissoes_em_atraso 
FOR SELECT 
USING (is_admin_from_jwt());