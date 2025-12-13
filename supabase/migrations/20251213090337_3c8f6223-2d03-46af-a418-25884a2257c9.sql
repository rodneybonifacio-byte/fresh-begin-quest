-- 1. CORRIGIR RLS - parceiros: garantir que só parceiros autenticados vejam próprios dados
DROP POLICY IF EXISTS "parceiros_veem_proprio_perfil" ON public.parceiros;
CREATE POLICY "parceiros_veem_proprio_perfil" ON public.parceiros
FOR SELECT USING (
  get_parceiro_id_from_jwt() IS NOT NULL AND id = get_parceiro_id_from_jwt()
);

-- 2. CORRIGIR RLS - contador_cadastros: remover acesso público de leitura
DROP POLICY IF EXISTS "contador_leitura_publica" ON public.contador_cadastros;
CREATE POLICY "contador_leitura_admin_only" ON public.contador_cadastros
FOR SELECT USING (is_admin_from_jwt());

-- 3. Garantir pgcrypto para hash
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. MIGRAR SENHAS PLAINTEXT PARA SHA-256 (com salt fixo seguro)
-- Primeiro verificar quais senhas precisam migração
UPDATE public.parceiros
SET senha_hash = encode(
  digest(
    senha_hash || 'BRHUB_SALT_2024',
    'sha256'
  ),
  'base64'
)
WHERE length(senha_hash) < 44 OR senha_hash !~ '^[A-Za-z0-9+/]+=*$';