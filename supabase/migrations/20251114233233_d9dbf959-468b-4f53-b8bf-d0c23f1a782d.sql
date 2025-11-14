-- Habilitar realtime para tabela transacoes_credito
ALTER TABLE public.transacoes_credito REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime (se ainda não estiver)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transacoes_credito;