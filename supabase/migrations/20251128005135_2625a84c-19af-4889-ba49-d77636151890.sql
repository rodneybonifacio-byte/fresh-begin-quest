-- Criar tabela para rastrear origem dos cadastros
CREATE TABLE public.cadastros_origem (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID NOT NULL UNIQUE,
    origem VARCHAR(50) NOT NULL DEFAULT 'autocadastro',
    nome_cliente TEXT,
    email_cliente TEXT,
    telefone_cliente TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cadastros_origem ENABLE ROW LEVEL SECURITY;

-- Policy para service role (edge functions)
CREATE POLICY "service_role_acesso_total_cadastros_origem" 
ON public.cadastros_origem 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Policy para admin visualizar (usando authenticated role)
CREATE POLICY "authenticated_users_can_view_cadastros" 
ON public.cadastros_origem 
FOR SELECT 
TO authenticated
USING (true);

-- Índice para busca por origem
CREATE INDEX idx_cadastros_origem_origem ON public.cadastros_origem(origem);
CREATE INDEX idx_cadastros_origem_cliente_id ON public.cadastros_origem(cliente_id);