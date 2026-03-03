-- Add active_agent column to track handoff state per conversation
ALTER TABLE public.whatsapp_conversations
ADD COLUMN active_agent text DEFAULT NULL;

-- NULL means use channel default, otherwise overrides the channel agent
COMMENT ON COLUMN public.whatsapp_conversations.active_agent IS 'Overrides channel ai_agent after handoff. NULL = use channel default.';