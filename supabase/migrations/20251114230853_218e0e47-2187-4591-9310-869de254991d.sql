-- Garantir que a tabela usa REPLICA IDENTITY FULL para capturar todos os dados nos eventos de realtime
ALTER TABLE recargas_pix REPLICA IDENTITY FULL;