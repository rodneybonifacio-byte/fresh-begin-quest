-- Adicionar colunas para rastreamento de pagamento
ALTER TABLE public.fechamentos_fatura 
ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(50) DEFAULT 'PENDENTE',
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(10,2);