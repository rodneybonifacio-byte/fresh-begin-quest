
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.ai_tool_phone_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  allow_all BOOLEAN NOT NULL DEFAULT false,
  allowed_tool_names TEXT[] DEFAULT '{}',
  blocked_tool_names TEXT[] DEFAULT '{}',
  skip_approval BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone_number)
);

ALTER TABLE public.ai_tool_phone_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_phone_rules" ON public.ai_tool_phone_rules FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "deny_anon_phone_rules" ON public.ai_tool_phone_rules FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "service_role_phone_rules" ON public.ai_tool_phone_rules FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_phone_rules_updated_at BEFORE UPDATE ON public.ai_tool_phone_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
