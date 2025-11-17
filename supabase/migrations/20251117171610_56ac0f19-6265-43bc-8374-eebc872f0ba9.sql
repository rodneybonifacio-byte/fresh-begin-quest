-- Habilitar Realtime para a tabela recargas_pix
ALTER TABLE public.recargas_pix REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime (se ainda não estiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'recargas_pix'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recargas_pix;
  END IF;
END $$;

-- Habilitar Realtime para a tabela transacoes_credito
ALTER TABLE public.transacoes_credito REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime (se ainda não estiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'transacoes_credito'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transacoes_credito;
  END IF;
END $$;