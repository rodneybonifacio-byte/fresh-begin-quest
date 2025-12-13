-- Mover extensão pgcrypto para schema extensions (recomendado pelo Supabase)
DROP EXTENSION IF EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;