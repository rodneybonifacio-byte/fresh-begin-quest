-- Remover políticas antigas inseguras do storage
DROP POLICY IF EXISTS "Usuários podem fazer upload de avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar avatar" ON storage.objects;
DROP POLICY IF EXISTS "public_insert_faturas" ON storage.objects;

-- Avatars: Apenas usuários autenticados podem fazer upload no próprio path
CREATE POLICY "Users upload own avatar authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId'),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    )
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
);

CREATE POLICY "Users update own avatar authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId'),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    )
  )
);

CREATE POLICY "Users delete own avatar authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId'),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    )
  )
);

-- Faturas: Apenas service role pode inserir via Edge Functions
-- Nenhuma política de INSERT para faturas - apenas service role pode inserir