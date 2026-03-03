
-- Add voice/TTS configuration columns to ai_agents
ALTER TABLE public.ai_agents 
ADD COLUMN voice_id text DEFAULT 'FGY2WhTYpPnrIDTdsKH5',
ADD COLUMN voice_name text DEFAULT 'Laura',
ADD COLUMN tts_enabled boolean DEFAULT true,
ADD COLUMN tts_model text DEFAULT 'eleven_multilingual_v2',
ADD COLUMN voice_stability numeric DEFAULT 0.5,
ADD COLUMN voice_similarity_boost numeric DEFAULT 0.75,
ADD COLUMN voice_style numeric DEFAULT 0.0,
ADD COLUMN voice_speed numeric DEFAULT 1.0,
ADD COLUMN respond_with_audio boolean DEFAULT true;

-- Update existing agents with appropriate voice config
UPDATE public.ai_agents 
SET voice_id = 'FGY2WhTYpPnrIDTdsKH5', 
    voice_name = 'Laura',
    tts_enabled = true,
    respond_with_audio = true
WHERE name = 'veronica';

UPDATE public.ai_agents 
SET voice_id = 'TX3LPaxmHKxFdv7VOQHJ', 
    voice_name = 'Liam',
    tts_enabled = true,
    respond_with_audio = true
WHERE name = 'felipe';

-- Update ai_providers to add TTS type for ElevenLabs
UPDATE public.ai_providers
SET provider_type = 'stt_tts',
    config = jsonb_set(
      config,
      '{tts_models}',
      '["eleven_multilingual_v2", "eleven_turbo_v2_5"]'::jsonb
    )
WHERE name = 'elevenlabs';
