ALTER TABLE public.whatsapp_channels
  ADD COLUMN IF NOT EXISTS bird_workspace_id text;

COMMENT ON COLUMN public.whatsapp_channels.channel_id IS 'Bird channel UUID (api.bird.com)';
COMMENT ON COLUMN public.whatsapp_channels.access_key IS 'Bird API access key (api.bird.com)';
COMMENT ON COLUMN public.whatsapp_channels.bird_workspace_id IS 'Bird workspace UUID (api.bird.com)';