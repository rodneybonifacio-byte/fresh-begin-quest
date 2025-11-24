-- Criar tabela para etiquetas pendentes de correção
CREATE TABLE IF NOT EXISTS public.etiquetas_pendentes_correcao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  remetente_cpf_cnpj TEXT NOT NULL,
  remetente_nome TEXT,
  
  -- Dados do destinatário
  destinatario_nome TEXT NOT NULL,
  destinatario_cpf_cnpj TEXT,
  destinatario_celular TEXT,
  destinatario_cep TEXT NOT NULL,
  destinatario_logradouro TEXT,
  destinatario_numero TEXT,
  destinatario_complemento TEXT,
  destinatario_bairro TEXT,
  destinatario_cidade TEXT,
  destinatario_estado TEXT,
  
  -- Dados da embalagem
  altura INTEGER,
  largura INTEGER,
  comprimento INTEGER,
  peso INTEGER,
  
  -- Dados do frete
  servico_frete TEXT,
  valor_frete NUMERIC(10,2),
  valor_declarado NUMERIC(10,2),
  observacao TEXT,
  
  -- Controle
  motivo_erro TEXT NOT NULL,
  linha_original INTEGER,
  tentativas_correcao INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.etiquetas_pendentes_correcao ENABLE ROW LEVEL SECURITY;

-- Policy para usuários verem suas próprias etiquetas pendentes
CREATE POLICY "usuarios_veem_proprias_etiquetas_pendentes"
  ON public.etiquetas_pendentes_correcao
  FOR SELECT
  USING (
    cliente_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'clienteId')
    OR cliente_id = auth.uid()
  );

-- Policy para service role ter acesso total
CREATE POLICY "service_role_gerencia_etiquetas_pendentes"
  ON public.etiquetas_pendentes_correcao
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_etiquetas_pendentes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_etiquetas_pendentes_updated_at
  BEFORE UPDATE ON public.etiquetas_pendentes_correcao
  FOR EACH ROW
  EXECUTE FUNCTION update_etiquetas_pendentes_updated_at();

-- Índices para performance
CREATE INDEX idx_etiquetas_pendentes_cliente ON public.etiquetas_pendentes_correcao(cliente_id);
CREATE INDEX idx_etiquetas_pendentes_criado ON public.etiquetas_pendentes_correcao(criado_em DESC);