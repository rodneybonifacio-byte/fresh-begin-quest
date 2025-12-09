-- Enum para status do parceiro
CREATE TYPE public.parceiro_status AS ENUM ('pendente', 'aprovado', 'suspenso', 'cancelado');

-- Tabela de parceiros Conecta+
CREATE TABLE public.parceiros (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL,
    telefone TEXT NOT NULL,
    codigo_parceiro TEXT NOT NULL UNIQUE,
    link_indicacao TEXT NOT NULL,
    chave_pix TEXT,
    banco TEXT,
    agencia TEXT,
    conta TEXT,
    status parceiro_status NOT NULL DEFAULT 'pendente',
    total_clientes_ativos INTEGER DEFAULT 0,
    total_comissao_acumulada DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de clientes indicados (vinculação parceiro-cliente)
CREATE TABLE public.clientes_indicados (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL,
    cliente_nome TEXT,
    cliente_email TEXT,
    data_associacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'ativo',
    consumo_total DECIMAL(10,2) DEFAULT 0,
    comissao_gerada DECIMAL(10,2) DEFAULT 0,
    ultima_atividade TIMESTAMP WITH TIME ZONE,
    UNIQUE(cliente_id)
);

-- Tabela de comissões
CREATE TABLE public.comissoes_conecta (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL,
    etiqueta_id TEXT,
    codigo_objeto TEXT,
    valor_total_frete DECIMAL(10,2) NOT NULL,
    valor_custo_frete DECIMAL(10,2) NOT NULL,
    margem_liquida DECIMAL(10,2) NOT NULL,
    comissao_calculada DECIMAL(10,2) NOT NULL,
    percentual_comissao DECIMAL(5,2) DEFAULT 10.00,
    mes_referencia TEXT,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pagamentos
CREATE TABLE public.pagamentos_parceiros (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
    valor_pago DECIMAL(10,2) NOT NULL,
    mes_referencia TEXT NOT NULL,
    data_pagamento TIMESTAMP WITH TIME ZONE,
    comprovante_url TEXT,
    status TEXT DEFAULT 'pendente',
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_parceiros_codigo ON public.parceiros(codigo_parceiro);
CREATE INDEX idx_parceiros_email ON public.parceiros(email);
CREATE INDEX idx_clientes_indicados_parceiro ON public.clientes_indicados(parceiro_id);
CREATE INDEX idx_clientes_indicados_cliente ON public.clientes_indicados(cliente_id);
CREATE INDEX idx_comissoes_parceiro ON public.comissoes_conecta(parceiro_id);
CREATE INDEX idx_comissoes_mes ON public.comissoes_conecta(mes_referencia);
CREATE INDEX idx_pagamentos_parceiro ON public.pagamentos_parceiros(parceiro_id);

-- Enable RLS
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_indicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes_conecta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_parceiros ENABLE ROW LEVEL SECURITY;

-- RLS Policies para parceiros (acesso próprio via função customizada)
CREATE OR REPLACE FUNCTION public.get_parceiro_id_from_jwt()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_payload jsonb;
  extracted_parceiro_id text;
BEGIN
  BEGIN
    jwt_payload := (current_setting('request.jwt.claims', true))::jsonb;
    extracted_parceiro_id := jwt_payload->>'parceiroId';
    IF extracted_parceiro_id IS NULL OR extracted_parceiro_id = '' THEN
      RETURN NULL;
    END IF;
    RETURN extracted_parceiro_id::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$$;

-- Políticas para parceiros
CREATE POLICY "parceiros_veem_proprio_perfil" ON public.parceiros
    FOR SELECT USING (id = get_parceiro_id_from_jwt());

CREATE POLICY "parceiros_atualizam_proprio_perfil" ON public.parceiros
    FOR UPDATE USING (id = get_parceiro_id_from_jwt());

CREATE POLICY "service_role_full_access_parceiros" ON public.parceiros
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para clientes indicados
CREATE POLICY "parceiros_veem_proprios_clientes" ON public.clientes_indicados
    FOR SELECT USING (parceiro_id = get_parceiro_id_from_jwt());

CREATE POLICY "service_role_full_access_clientes_indicados" ON public.clientes_indicados
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para comissões
CREATE POLICY "parceiros_veem_proprias_comissoes" ON public.comissoes_conecta
    FOR SELECT USING (parceiro_id = get_parceiro_id_from_jwt());

CREATE POLICY "service_role_full_access_comissoes" ON public.comissoes_conecta
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para pagamentos
CREATE POLICY "parceiros_veem_proprios_pagamentos" ON public.pagamentos_parceiros
    FOR SELECT USING (parceiro_id = get_parceiro_id_from_jwt());

CREATE POLICY "service_role_full_access_pagamentos" ON public.pagamentos_parceiros
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_parceiros_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_parceiros_timestamp
BEFORE UPDATE ON public.parceiros
FOR EACH ROW
EXECUTE FUNCTION public.update_parceiros_updated_at();