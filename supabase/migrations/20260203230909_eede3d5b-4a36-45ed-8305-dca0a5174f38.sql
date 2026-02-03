-- Criar tabela para emissões externas (etiquetas geradas fora do sistema)
CREATE TABLE public.emissoes_externas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID NOT NULL,
    remetente_id UUID REFERENCES public.remetentes(id),
    codigo_objeto VARCHAR(20) NOT NULL UNIQUE,
    servico VARCHAR(100),
    contrato VARCHAR(50),
    destinatario_nome VARCHAR(255) NOT NULL,
    destinatario_logradouro VARCHAR(255),
    destinatario_numero VARCHAR(20),
    destinatario_bairro VARCHAR(100),
    destinatario_cidade VARCHAR(100),
    destinatario_uf VARCHAR(2),
    destinatario_cep VARCHAR(10),
    valor_venda DECIMAL(10, 2) NOT NULL DEFAULT 0,
    valor_custo DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'postado',
    origem VARCHAR(50) DEFAULT 'manual',
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emissoes_externas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para que clientes vejam apenas suas emissões
CREATE POLICY "Clientes podem ver suas emissões externas"
ON public.emissoes_externas
FOR SELECT
USING (cliente_id = public.get_cliente_id_from_jwt() OR public.is_admin_from_jwt());

CREATE POLICY "Clientes podem inserir suas emissões externas"
ON public.emissoes_externas
FOR INSERT
WITH CHECK (cliente_id = public.get_cliente_id_from_jwt() OR public.is_admin_from_jwt());

CREATE POLICY "Clientes podem atualizar suas emissões externas"
ON public.emissoes_externas
FOR UPDATE
USING (cliente_id = public.get_cliente_id_from_jwt() OR public.is_admin_from_jwt());

CREATE POLICY "Admins podem deletar emissões externas"
ON public.emissoes_externas
FOR DELETE
USING (public.is_admin_from_jwt());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_emissoes_externas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_emissoes_externas_updated_at
BEFORE UPDATE ON public.emissoes_externas
FOR EACH ROW
EXECUTE FUNCTION public.update_emissoes_externas_updated_at();

-- Índices para performance
CREATE INDEX idx_emissoes_externas_cliente_id ON public.emissoes_externas(cliente_id);
CREATE INDEX idx_emissoes_externas_remetente_id ON public.emissoes_externas(remetente_id);
CREATE INDEX idx_emissoes_externas_codigo_objeto ON public.emissoes_externas(codigo_objeto);