-- Remove a política permissiva que permite qualquer usuário autenticado ver os dados
DROP POLICY IF EXISTS "authenticated_users_can_view_cadastros" ON public.cadastros_origem;

-- A política service_role_acesso_total_cadastros_origem já existe e permite acesso total para backend/admin
-- Isso garante que apenas o service_role (edge functions, admin backend) pode acessar os dados sensíveis