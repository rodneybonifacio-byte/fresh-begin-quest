
-- Tabela de grupos de regras de precificação
CREATE TABLE public.grupos_regras_precificacao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    multiplicador_primeira_etiqueta NUMERIC NOT NULL DEFAULT 0.59,
    aplicar_em_simulacao BOOLEAN NOT NULL DEFAULT true,
    percentual_plano_pos_primeira NUMERIC NOT NULL DEFAULT 12.00,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vínculo cliente-grupo
CREATE TABLE public.grupo_regras_clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID NOT NULL REFERENCES public.grupos_regras_precificacao(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL,
    primeira_etiqueta_emitida BOOLEAN NOT NULL DEFAULT false,
    data_primeira_emissao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(grupo_id, cliente_id)
);

-- RLS para grupos_regras_precificacao
ALTER TABLE public.grupos_regras_precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_grupos_regras" ON public.grupos_regras_precificacao
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admin_acesso_grupos_regras" ON public.grupos_regras_precificacao
    FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "deny_anon_grupos_regras" ON public.grupos_regras_precificacao
    FOR ALL USING (false) WITH CHECK (false);

-- RLS para grupo_regras_clientes
ALTER TABLE public.grupo_regras_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_grupo_clientes" ON public.grupo_regras_clientes
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admin_acesso_grupo_clientes" ON public.grupo_regras_clientes
    FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());

CREATE POLICY "deny_anon_grupo_clientes" ON public.grupo_regras_clientes
    FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "cliente_ve_proprio_grupo" ON public.grupo_regras_clientes
    FOR SELECT USING (cliente_id = get_cliente_id_from_jwt());
