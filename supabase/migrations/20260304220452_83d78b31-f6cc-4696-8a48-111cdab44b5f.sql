
CREATE TABLE public.whatsapp_notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_key text NOT NULL UNIQUE,
  trigger_label text NOT NULL,
  trigger_description text,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'pt_BR',
  template_namespace text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  channel_id uuid REFERENCES public.whatsapp_channels(id),
  is_active boolean NOT NULL DEFAULT true,
  send_delay_minutes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_notification_templates" ON public.whatsapp_notification_templates
  FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());

CREATE POLICY "deny_anon_notification_templates" ON public.whatsapp_notification_templates
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "service_role_notification_templates" ON public.whatsapp_notification_templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
