
-- Drop old constraint and add new one with all rastreio statuses
ALTER TABLE public.ai_support_pipeline DROP CONSTRAINT IF EXISTS ai_support_pipeline_status_check;

ALTER TABLE public.ai_support_pipeline ADD CONSTRAINT ai_support_pipeline_status_check 
CHECK (status = ANY (ARRAY[
  'aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado',
  'triagem', 'investigacao', 'resolucao', 'concluido',
  'verificando', 'localizado', 'em_transito', 'entregue',
  'pre_postado', 'postado', 'saiu_para_entrega', 'aguardando_retirada', 'atrasado',
  'analise', 'processamento', 'aprovado',
  'solicitado', 'em_analise', 'retido', 'cancelado',
  'recebido', 'respondido', 'agradecido', 'novo'
]));
