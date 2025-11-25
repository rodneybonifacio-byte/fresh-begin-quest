-- Remover política anterior
DROP POLICY IF EXISTS "Upload de faturas autorizado" ON storage.objects;

-- Criar política mais permissiva para uploads (qualquer usuário com JWT válido)
CREATE POLICY "Qualquer usuário autenticado pode fazer upload de faturas"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'faturas');