
CREATE TABLE public.whatsapp_phone_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'Número errado / destinatário não reconhecido',
  contact_name text,
  blocked_at timestamptz DEFAULT now(),
  blocked_by text DEFAULT 'system',
  is_active boolean DEFAULT true
);

ALTER TABLE public.whatsapp_phone_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON public.whatsapp_phone_blocklist
  FOR ALL USING (true) WITH CHECK (true);

-- Insert the first blocked number
INSERT INTO public.whatsapp_phone_blocklist (phone_number, reason, contact_name)
VALUES ('5511917435311', 'Destinatário informou que não é a pessoa cadastrada (Jacson Wanderley)', 'Não é Jacson Wanderley');
