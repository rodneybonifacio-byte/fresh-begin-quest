-- Remove duplicate objeto_postado HSM messages, keeping only the first one per tracking code per conversation
DELETE FROM public.whatsapp_messages
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY conversation_id, metadata->'variables'->>'codigo_rastreio'
        ORDER BY created_at ASC
      ) as rn
    FROM public.whatsapp_messages
    WHERE content_type = 'hsm'
      AND direction = 'outbound'
      AND metadata->>'trigger_key' = 'objeto_postado'
  ) ranked
  WHERE rn > 1
);