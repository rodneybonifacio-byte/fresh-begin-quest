
CREATE TABLE IF NOT EXISTS public.admin_tokens_cache (
  id text PRIMARY KEY,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_tokens_cache ENABLE ROW LEVEL SECURITY;

-- Sem políticas: apenas service_role (edge functions) pode acessar.
