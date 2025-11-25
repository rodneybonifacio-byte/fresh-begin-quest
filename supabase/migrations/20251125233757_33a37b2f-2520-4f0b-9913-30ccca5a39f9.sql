-- Remover políticas anteriores que podem estar causando conflito
DROP POLICY IF EXISTS "Acesso público para leitura de faturas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;

-- Criar política de leitura pública
CREATE POLICY "Leitura pública de faturas"
ON storage.objects FOR SELECT
USING (bucket_id = 'faturas');

-- Criar política de upload que aceita qualquer request (service role ou authenticated)
CREATE POLICY "Upload de faturas autorizado"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'faturas' 
  AND (
    auth.role() = 'authenticated' 
    OR auth.role() = 'service_role'
    OR auth.jwt() IS NOT NULL
  )
);