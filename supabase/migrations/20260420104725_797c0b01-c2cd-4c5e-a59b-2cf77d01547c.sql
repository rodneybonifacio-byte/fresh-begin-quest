UPDATE public.whatsapp_phone_blocklist
SET is_active = false,
    reason = COALESCE(reason, '') || ' | desbloqueado manualmente em 2026-04-20',
    blocked_by = 'manual-fix',
    blocked_at = now()
WHERE phone_number = '5511911544095'
  AND is_active = true;

UPDATE public.whatsapp_conversations
SET ai_enabled = true,
    status = 'open',
    updated_at = now()
WHERE contact_phone = '5511911544095';

UPDATE public.whatsapp_tickets
SET status = 'open',
    closed_at = null,
    closed_by = null,
    updated_at = now()
WHERE conversation_id IN (
  SELECT id FROM public.whatsapp_conversations WHERE contact_phone = '5511911544095'
)
AND status IN ('closed', 'pending_close');