-- Habilitar realtime para a tabela transacoes_credito
ALTER TABLE public.transacoes_credito REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime se ainda não estiver
DO $$
BEGIN
  -- Verificar se a publicação existe e adicionar a tabela
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Tentar adicionar a tabela (ignora erro se já existir)
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.transacoes_credito;
    EXCEPTION WHEN duplicate_object THEN
      -- Tabela já está na publicação
      NULL;
    END;
  END IF;
END $$;