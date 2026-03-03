-- Permitir upload de mídia do CRM (áudio/arquivos) no bucket avatars, mantendo isolamento por usuário
DROP POLICY IF EXISTS "Users upload own avatar authenticated" ON storage.objects;

CREATE POLICY "Users upload own avatar authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = COALESCE(
    ((current_setting('request.jwt.claims', true))::jsonb ->> 'clienteId'),
    ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
  )
  AND lower(storage.extension(name)) = ANY (
    ARRAY[
      'jpg','jpeg','png','webp','gif',
      'ogg','opus','webm','mp3','m4a','wav','aac','mp4',
      'pdf','doc','docx'
    ]
  )
);