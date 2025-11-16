-- Criar tabela de remetentes no Supabase
CREATE TABLE IF NOT EXISTS public.remetentes (
  id uuid PRIMARY KEY,
  cliente_id uuid NOT NULL,
  nome text NOT NULL,
  cpf_cnpj text NOT NULL,
  documento_estrangeiro text,
  celular text,
  telefone text,
  email text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  localidade text,
  uf text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  sincronizado_em timestamp with time zone DEFAULT now()
);

-- Índice para buscar por cliente
CREATE INDEX idx_remetentes_cliente_id ON public.remetentes(cliente_id);

-- Habilitar RLS
ALTER TABLE public.remetentes ENABLE ROW LEVEL SECURITY;

-- Política: usuários veem apenas seus próprios remetentes
CREATE POLICY "usuarios_veem_proprios_remetentes"
  ON public.remetentes
  FOR SELECT
  USING (
    cliente_id::text = (current_setting('request.jwt.claims'::text, true)::jsonb ->> 'clienteId'::text)
  );

-- Política: service role pode inserir/atualizar (para sincronização)
CREATE POLICY "service_role_gerencia_remetentes"
  ON public.remetentes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_remetentes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp automaticamente
CREATE TRIGGER trigger_update_remetentes_updated_at
  BEFORE UPDATE ON public.remetentes
  FOR EACH ROW
  EXECUTE FUNCTION update_remetentes_updated_at();