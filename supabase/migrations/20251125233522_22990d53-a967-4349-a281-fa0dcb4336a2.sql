-- Criar bucket de faturas no storage (público para leitura)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('faturas', 'faturas', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública
CREATE POLICY "Acesso público para leitura de faturas"
ON storage.objects FOR SELECT
USING (bucket_id = 'faturas');

-- Política para usuários autenticados fazerem upload
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'faturas' 
  AND auth.role() = 'authenticated'
);