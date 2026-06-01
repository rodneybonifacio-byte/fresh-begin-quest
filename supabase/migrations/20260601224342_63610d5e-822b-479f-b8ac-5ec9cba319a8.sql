UPDATE whatsapp_conversations 
SET ai_enabled = true, status = 'open'
WHERE last_message_at > now() - interval '6 hours'
  AND (ai_enabled = false OR status = 'closed');