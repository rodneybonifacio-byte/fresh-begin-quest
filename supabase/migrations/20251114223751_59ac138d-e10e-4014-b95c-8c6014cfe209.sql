-- Ativar realtime na tabela recargas_pix
ALTER TABLE public.recargas_pix REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.recargas_pix;