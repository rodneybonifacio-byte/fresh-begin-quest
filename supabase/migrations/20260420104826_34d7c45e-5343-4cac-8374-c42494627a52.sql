UPDATE public.whatsapp_phone_blocklist
SET is_active = false
WHERE phone_number = '5511911544095'
  AND is_active = true;