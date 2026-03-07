ALTER TABLE public.ai_support_pipeline DROP CONSTRAINT ai_support_pipeline_status_check;

ALTER TABLE public.ai_support_pipeline ADD CONSTRAINT ai_support_pipeline_status_check CHECK (status = ANY (ARRAY[
  'aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado',
  'triagem', 'investigacao', 'resolucao', 'concluido',
  'verificando', 'localizado', 'em_transito', 'entregue',
  'analise', 'processamento', 'aprovado',
  'solicitado', 'em_analise', 'retido', 'cancelado',
  'recebido', 'respondido',
  'agradecido',
  'novo'
]));