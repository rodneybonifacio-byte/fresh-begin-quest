
UPDATE whatsapp_conversations 
SET ai_enabled = false, status = 'closed', updated_at = now()
WHERE id = '6423896f-8d21-4bfe-9c46-5019cd9bf8e0';

UPDATE ai_support_pipeline
SET status = 'concluido', resolution = 'Número errado - destinatário não reconhecido', updated_at = now()
WHERE conversation_id = '6423896f-8d21-4bfe-9c46-5019cd9bf8e0' AND status NOT IN ('concluido', 'fechado');
