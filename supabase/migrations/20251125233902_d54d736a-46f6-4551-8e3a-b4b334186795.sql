-- Verificar e garantir que o bucket existe e está configurado corretamente
UPDATE storage.buckets
SET public = true,
    file_size_limit = 52428800,  -- 50MB
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'faturas';

-- Remover todas as políticas anteriores para começar limpo
DROP POLICY IF EXISTS "Leitura pública de faturas" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode fazer upload de faturas" ON storage.objects;

-- Política de leitura pública (qualquer um pode ler)
CREATE POLICY "public_read_faturas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'faturas');

-- Política de upload sem restrições de autenticação
-- (apenas verifica que está no bucket correto)
CREATE POLICY "public_insert_faturas"  
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'faturas');