
-- Tabela de canais WhatsApp (multi-tenant)
CREATE TABLE public.whatsapp_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text NOT NULL,
  channel_id text NOT NULL UNIQUE,
  access_key text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT true,
  ai_agent text NOT NULL DEFAULT 'maya',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de conversas WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_channel_id uuid REFERENCES public.whatsapp_channels(id) ON DELETE SET NULL,
  contact_phone text NOT NULL,
  contact_name text,
  contact_avatar_url text,
  cliente_id uuid,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  ai_enabled boolean NOT NULL DEFAULT true,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de mensagens WhatsApp
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  messagebird_id text UNIQUE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content_type text NOT NULL DEFAULT 'text',
  content text,
  media_url text,
  media_type text,
  status text NOT NULL DEFAULT 'sent',
  sent_by text DEFAULT 'system',
  ai_generated boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_whatsapp_conversations_channel ON public.whatsapp_conversations(whatsapp_channel_id);
CREATE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations(contact_phone);
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_conversations_last_msg ON public.whatsapp_conversations(last_message_at DESC);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);

-- RLS
ALTER TABLE public.whatsapp_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Channels: admin only + service role
CREATE POLICY "admin_manage_channels" ON public.whatsapp_channels FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "service_role_channels" ON public.whatsapp_channels FOR ALL USING (true) WITH CHECK (true);

-- Conversations: admin only + service role
CREATE POLICY "admin_manage_conversations" ON public.whatsapp_conversations FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "service_role_conversations" ON public.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);

-- Messages: admin only + service role
CREATE POLICY "admin_manage_messages" ON public.whatsapp_messages FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "service_role_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

-- Deny anon access
CREATE POLICY "deny_anon_channels" ON public.whatsapp_channels FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_conversations" ON public.whatsapp_conversations FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_messages" ON public.whatsapp_messages FOR ALL USING (false) WITH CHECK (false);

-- Trigger para ensure single default channel
CREATE OR REPLACE FUNCTION public.ensure_single_default_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.whatsapp_channels SET is_default = false WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_single_default_channel
BEFORE INSERT OR UPDATE ON public.whatsapp_channels
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_channel();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_whatsapp_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_whatsapp_channels_updated_at BEFORE UPDATE ON public.whatsapp_channels FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_updated_at();
CREATE TRIGGER trg_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_updated_at();

-- Enable realtime para mensagens e conversas
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
