-- Criar tabela para armazenar integrações de e-commerce
CREATE TABLE IF NOT EXISTS public.integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  plataforma VARCHAR(50) NOT NULL,
  store_id VARCHAR(100),
  remetente_id UUID,
  credenciais JSONB NOT NULL,
  ativo BOOLEAN DEFAULT true,
  webhook_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_integracoes_cliente ON public.integracoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_integracoes_plataforma ON public.integracoes(plataforma);
CREATE INDEX IF NOT EXISTS idx_integracoes_store_id ON public.integracoes(store_id);
CREATE INDEX IF NOT EXISTS idx_integracoes_ativo ON public.integracoes(ativo);

-- Habilitar RLS
ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários veem apenas suas integrações
CREATE POLICY "usuarios_veem_proprias_integracoes"
ON public.integracoes
FOR SELECT
TO authenticated
USING (
  cliente_id = get_cliente_id_from_jwt()
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
);

-- Política para criar integrações
CREATE POLICY "usuarios_criam_proprias_integracoes"
ON public.integracoes
FOR INSERT
TO authenticated
WITH CHECK (
  cliente_id = get_cliente_id_from_jwt()
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
);

-- Política para atualizar integrações
CREATE POLICY "usuarios_atualizam_proprias_integracoes"
ON public.integracoes
FOR UPDATE
TO authenticated
USING (
  cliente_id = get_cliente_id_from_jwt()
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
)
WITH CHECK (
  cliente_id = get_cliente_id_from_jwt()
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
);

-- Política para deletar integrações
CREATE POLICY "usuarios_deletam_proprias_integracoes"
ON public.integracoes
FOR DELETE
TO authenticated
USING (
  cliente_id = get_cliente_id_from_jwt()
  OR cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'clienteId')
);

-- Service role tem acesso total
CREATE POLICY "service_role_acesso_total_integracoes"
ON public.integracoes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION public.update_integracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_integracoes_updated_at
BEFORE UPDATE ON public.integracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_integracoes_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.integracoes IS 'Armazena configurações de integrações com plataformas de e-commerce';
COMMENT ON COLUMN public.integracoes.plataforma IS 'Nome da plataforma (nuvemshop, shopify, etc)';
COMMENT ON COLUMN public.integracoes.store_id IS 'ID da loja na plataforma';
COMMENT ON COLUMN public.integracoes.remetente_id IS 'ID do remetente padrão para pedidos desta integração';
COMMENT ON COLUMN public.integracoes.credenciais IS 'JSON com access_token, user_id e outras credenciais da API';
COMMENT ON COLUMN public.integracoes.webhook_url IS 'URL do webhook gerada para esta integração';