-- Tabela para armazenar pedidos importados de marketplaces
CREATE TABLE IF NOT EXISTS public.pedidos_importados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  integracao_id UUID REFERENCES public.integracoes(id) ON DELETE SET NULL,
  remetente_id UUID REFERENCES public.remetentes(id) ON DELETE SET NULL,
  externo_id TEXT NOT NULL,
  numero_pedido TEXT NOT NULL,
  plataforma TEXT NOT NULL DEFAULT 'shopify',
  status TEXT NOT NULL DEFAULT 'pendente',
  
  -- Dados do destinatário
  destinatario_nome TEXT NOT NULL,
  destinatario_cpf_cnpj TEXT,
  destinatario_telefone TEXT,
  destinatario_email TEXT,
  destinatario_cep TEXT NOT NULL,
  destinatario_logradouro TEXT,
  destinatario_numero TEXT,
  destinatario_complemento TEXT,
  destinatario_bairro TEXT,
  destinatario_cidade TEXT,
  destinatario_estado TEXT,
  
  -- Valores
  valor_total DECIMAL(10,2),
  peso_total DECIMAL(10,3),
  
  -- Itens do pedido (JSON)
  itens JSONB,
  
  -- Dados originais do marketplace
  dados_originais JSONB,
  
  -- Resultado do processamento
  emissao_id TEXT,
  codigo_rastreio TEXT,
  servico_frete TEXT,
  valor_frete DECIMAL(10,2),
  processado_em TIMESTAMP WITH TIME ZONE,
  erro_processamento TEXT,
  
  -- Timestamps
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para evitar duplicatas
  CONSTRAINT unique_pedido_cliente UNIQUE (externo_id, cliente_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedidos_importados_cliente ON public.pedidos_importados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_importados_status ON public.pedidos_importados(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_importados_plataforma ON public.pedidos_importados(plataforma);
CREATE INDEX IF NOT EXISTS idx_pedidos_importados_externo ON public.pedidos_importados(externo_id);

-- Enable RLS
ALTER TABLE public.pedidos_importados ENABLE ROW LEVEL SECURITY;

-- Política: Clientes podem ver seus próprios pedidos
CREATE POLICY "Clientes podem ver seus pedidos importados"
  ON public.pedidos_importados
  FOR SELECT
  USING (cliente_id::text = (current_setting('request.jwt.claims', true)::json->>'clienteId'));

-- Política: Clientes podem inserir seus próprios pedidos
CREATE POLICY "Clientes podem inserir pedidos importados"
  ON public.pedidos_importados
  FOR INSERT
  WITH CHECK (cliente_id::text = (current_setting('request.jwt.claims', true)::json->>'clienteId'));

-- Política: Clientes podem atualizar seus próprios pedidos
CREATE POLICY "Clientes podem atualizar seus pedidos importados"
  ON public.pedidos_importados
  FOR UPDATE
  USING (cliente_id::text = (current_setting('request.jwt.claims', true)::json->>'clienteId'));

-- Política: Clientes podem deletar seus próprios pedidos
CREATE POLICY "Clientes podem deletar seus pedidos importados"
  ON public.pedidos_importados
  FOR DELETE
  USING (cliente_id::text = (current_setting('request.jwt.claims', true)::json->>'clienteId'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_pedidos_importados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_pedidos_importados_timestamp ON public.pedidos_importados;
CREATE TRIGGER update_pedidos_importados_timestamp
  BEFORE UPDATE ON public.pedidos_importados
  FOR EACH ROW
  EXECUTE FUNCTION update_pedidos_importados_updated_at();