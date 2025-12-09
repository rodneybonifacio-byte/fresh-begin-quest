-- Criar bucket para avatares de usuários
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política para visualizar avatares (público)
CREATE POLICY "Avatares são públicos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Política para upload de avatar (usuário autenticado pode fazer upload)
CREATE POLICY "Usuários podem fazer upload de avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

-- Política para atualizar avatar
CREATE POLICY "Usuários podem atualizar avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars');

-- Política para deletar avatar
CREATE POLICY "Usuários podem deletar avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars');

-- Tabela para armazenar referência do avatar do usuário
CREATE TABLE IF NOT EXISTS public.user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cliente_id)
);

-- RLS para user_avatars
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprio avatar"
ON public.user_avatars
FOR SELECT
USING (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt());

CREATE POLICY "Usuários inserem próprio avatar"
ON public.user_avatars
FOR INSERT
WITH CHECK (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt());

CREATE POLICY "Usuários atualizam próprio avatar"
ON public.user_avatars
FOR UPDATE
USING (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt());

CREATE POLICY "Usuários deletam próprio avatar"
ON public.user_avatars
FOR DELETE
USING (get_cliente_id_from_jwt() IS NOT NULL AND cliente_id = get_cliente_id_from_jwt());