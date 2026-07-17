
-- Arquivo (LIKE + INCLUDING ALL preserva colunas, defaults, PK)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations_archive (LIKE public.whatsapp_conversations INCLUDING DEFAULTS);
CREATE TABLE IF NOT EXISTS public.whatsapp_messages_archive (LIKE public.whatsapp_messages INCLUDING DEFAULTS);
CREATE TABLE IF NOT EXISTS public.whatsapp_tickets_archive (LIKE public.whatsapp_tickets INCLUDING DEFAULTS);

ALTER TABLE public.whatsapp_conversations_archive ADD COLUMN IF NOT EXISTS archived_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.whatsapp_messages_archive ADD COLUMN IF NOT EXISTS archived_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.whatsapp_tickets_archive ADD COLUMN IF NOT EXISTS archived_at timestamptz NOT NULL DEFAULT now();

GRANT ALL ON public.whatsapp_conversations_archive TO service_role;
GRANT ALL ON public.whatsapp_messages_archive TO service_role;
GRANT ALL ON public.whatsapp_tickets_archive TO service_role;

ALTER TABLE public.whatsapp_conversations_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_tickets_archive ENABLE ROW LEVEL SECURITY;
