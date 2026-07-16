
-- Rename Veronica -> Sergio
UPDATE public.ai_agents
   SET name = 'sergio', display_name = 'Sergio', updated_at = now()
 WHERE name = 'veronica';

-- Deactivate Felipe (kept for history but no longer used)
UPDATE public.ai_agents
   SET is_active = false, updated_at = now()
 WHERE name = 'felipe';

-- Point all conversations to sergio
UPDATE public.whatsapp_conversations
   SET active_agent = 'sergio'
 WHERE active_agent IN ('veronica', 'felipe');

-- Point channels to sergio
UPDATE public.whatsapp_channels
   SET ai_agent = 'sergio'
 WHERE ai_agent IN ('veronica', 'felipe');
