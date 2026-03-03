
-- Tabela de tickets: cada sessão de atendimento com um contato
CREATE TABLE public.whatsapp_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  status text NOT NULL DEFAULT 'open',
  category text DEFAULT 'geral',
  subject text,
  description text,
  resolution text,
  sentiment text,
  priority text DEFAULT 'normal',
  closed_by text, -- 'ai', 'human', 'timeout'
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  first_message_at timestamptz,
  last_message_at timestamptz,
  message_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index para buscar tickets por conversa e status
CREATE INDEX idx_whatsapp_tickets_conversation ON public.whatsapp_tickets(conversation_id, status);
CREATE INDEX idx_whatsapp_tickets_contact ON public.whatsapp_tickets(contact_phone, status);

-- RLS
ALTER TABLE public.whatsapp_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_tickets" ON public.whatsapp_tickets FOR ALL
  USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());

CREATE POLICY "deny_anon_tickets" ON public.whatsapp_tickets FOR ALL
  USING (false) WITH CHECK (false);

CREATE POLICY "service_role_tickets" ON public.whatsapp_tickets FOR ALL
  USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_whatsapp_tickets_updated_at
  BEFORE UPDATE ON public.whatsapp_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_tickets;
