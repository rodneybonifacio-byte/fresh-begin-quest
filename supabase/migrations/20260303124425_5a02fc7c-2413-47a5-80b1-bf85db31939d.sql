
-- ========================================
-- TABELA: Agentes de IA (prompts, personalidade)
-- ========================================
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  personality text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  model text NOT NULL DEFAULT 'gpt-4o',
  provider text NOT NULL DEFAULT 'openai',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_ai_agents" ON public.ai_agents FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "deny_anon_ai_agents" ON public.ai_agents FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "service_role_ai_agents" ON public.ai_agents FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- TABELA: Funções/Tools disponíveis para IA
-- ========================================
CREATE TABLE public.ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  edge_function text,
  parameters jsonb DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT true,
  requires_approval boolean NOT NULL DEFAULT false,
  allowed_agents text[] DEFAULT '{}',
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_ai_tools" ON public.ai_tools FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "deny_anon_ai_tools" ON public.ai_tools FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "service_role_ai_tools" ON public.ai_tools FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- TABELA: Logs de interações da IA
-- ========================================
CREATE TABLE public.ai_interaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  agent_name text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  tool_used text,
  tool_approved boolean,
  input_tokens integer,
  output_tokens integer,
  response_time_ms integer,
  provider text,
  model text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_view_ai_logs" ON public.ai_interaction_logs FOR SELECT USING (is_admin_from_jwt());
CREATE POLICY "deny_anon_ai_logs" ON public.ai_interaction_logs FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "service_role_ai_logs" ON public.ai_interaction_logs FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- TABELA: Configurações de provedores de IA
-- ========================================
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  provider_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}',
  secret_key_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_ai_providers" ON public.ai_providers FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "deny_anon_ai_providers" ON public.ai_providers FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "service_role_ai_providers" ON public.ai_providers FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- TABELA: Pipeline de suporte (reclamações)
-- ========================================
CREATE TABLE public.ai_support_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  contact_phone text,
  contact_name text,
  category text NOT NULL DEFAULT 'reclamacao',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado')),
  subject text,
  description text,
  assigned_to text,
  resolution text,
  sentiment text CHECK (sentiment IN ('positivo', 'neutro', 'negativo', 'muito_negativo')),
  detected_by text DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_support_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_support_pipeline" ON public.ai_support_pipeline FOR ALL USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());
CREATE POLICY "deny_anon_support_pipeline" ON public.ai_support_pipeline FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "service_role_support_pipeline" ON public.ai_support_pipeline FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- TRIGGERS para updated_at
-- ========================================
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_updated_at();
CREATE TRIGGER update_ai_tools_updated_at BEFORE UPDATE ON public.ai_tools FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_updated_at();
CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_updated_at();
CREATE TRIGGER update_ai_support_pipeline_updated_at BEFORE UPDATE ON public.ai_support_pipeline FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_updated_at();

-- ========================================
-- DADOS INICIAIS: Agentes Maya e Felipe
-- ========================================
INSERT INTO public.ai_agents (name, display_name, description, system_prompt, personality, model, provider, temperature, max_tokens) VALUES
('maya', 'Maya', 'Assistente principal - simpática e empática', 
'Você é Maya, assistente virtual da BRHUB Envios. Você é simpática, prestativa e empática.
Você ajuda clientes com:
- Rastreamento de encomendas
- Informações sobre serviços de frete e transportadoras
- Dúvidas sobre preços, prazos e embalagens
- Suporte geral sobre envios e logística
- Reclamações e problemas com entregas
Responda sempre em português brasileiro, de forma acolhedora e clara.
Use emojis com moderação para tornar a conversa mais amigável.
Se não souber a resposta, diga que vai encaminhar para um atendente humano.
Quando o cliente enviar um áudio, responda normalmente ao conteúdo transcrito.
Quando o cliente enviar uma imagem, comente sobre o conteúdo da imagem e ajude no que for necessário.',
'Simpática, empática, acolhedora', 'gpt-4o', 'openai', 0.7, 500),

('felipe', 'Felipe', 'Assistente direto e profissional',
'Você é Felipe, assistente virtual da BRHUB Envios. Você é direto, profissional e eficiente.
Você ajuda clientes com:
- Rastreamento de encomendas
- Informações sobre serviços de frete
- Dúvidas sobre preços e prazos
- Suporte geral sobre envios
Responda sempre em português brasileiro, de forma concisa e útil.
Se não souber a resposta, diga que vai encaminhar para um atendente humano.',
'Direto, profissional, eficiente', 'gpt-4o', 'openai', 0.5, 500);

-- ========================================
-- DADOS INICIAIS: Provedores
-- ========================================
INSERT INTO public.ai_providers (name, display_name, provider_type, is_active, config, secret_key_name) VALUES
('openai', 'OpenAI', 'llm', true, '{"models": ["gpt-4o", "gpt-4o-mini"], "default_model": "gpt-4o"}', 'OPENAI_API_KEY'),
('gemini', 'Google Gemini', 'vision', true, '{"models": ["gemini-2.5-flash"], "default_model": "gemini-2.5-flash"}', 'GEMINI_API_KEY'),
('elevenlabs', 'ElevenLabs', 'stt', true, '{"models": ["scribe_v2"], "default_model": "scribe_v2"}', 'ELEVENLABS_API_KEY');

-- ========================================
-- DADOS INICIAIS: Tools/Funções
-- ========================================
INSERT INTO public.ai_tools (name, display_name, description, category, edge_function, is_enabled, requires_approval, allowed_agents, risk_level) VALUES
('rastrear_encomenda', 'Rastrear Encomenda', 'Consulta o status de rastreamento de uma encomenda pelo código', 'rastreamento', 'testar-rastreio', true, false, '{maya,felipe}', 'low'),
('consultar_saldo', 'Consultar Saldo', 'Verifica o saldo de créditos do cliente', 'financeiro', 'api-consultar-saldo', true, false, '{maya,felipe}', 'low'),
('consultar_cliente', 'Consultar Dados do Cliente', 'Busca informações cadastrais do cliente', 'cadastro', 'api-consultar-cliente', true, false, '{maya,felipe}', 'low'),
('cotacao_frete', 'Cotação de Frete', 'Calcula o valor do frete com base nos dados informados', 'comercial', 'cotacao-frete', true, false, '{maya,felipe}', 'low'),
('emitir_etiqueta', 'Emitir Etiqueta', 'Gera uma etiqueta de envio para o cliente', 'operacional', 'emitir-etiqueta', false, true, '{felipe}', 'high'),
('cancelar_etiqueta', 'Cancelar Etiqueta', 'Cancela uma etiqueta de envio existente', 'operacional', 'cancelar-etiqueta-admin', false, true, '{}', 'high'),
('consultar_servicos', 'Consultar Serviços', 'Lista os serviços de frete disponíveis para o cliente', 'comercial', 'consultar-servicos-cliente', true, false, '{maya,felipe}', 'low'),
('buscar_remetentes', 'Buscar Remetentes', 'Lista os remetentes cadastrados do cliente', 'cadastro', 'buscar-remetentes', true, false, '{maya,felipe}', 'low'),
('buscar_extrato', 'Buscar Extrato', 'Consulta o extrato de transações do cliente', 'financeiro', 'buscar-extrato', true, false, '{maya,felipe}', 'medium'),
('adicionar_credito', 'Adicionar Crédito', 'Adiciona créditos ao saldo do cliente', 'financeiro', 'adicionar-saldo-manual', false, true, '{}', 'high'),
('gerar_pix_recarga', 'Gerar PIX para Recarga', 'Gera um QR Code PIX para recarga de créditos', 'financeiro', 'api-gerar-pix-recarga', true, true, '{maya,felipe}', 'medium'),
('abrir_reclamacao', 'Abrir Reclamação', 'Registra uma reclamação no pipeline de suporte', 'suporte', null, true, false, '{maya,felipe}', 'low'),
('encaminhar_humano', 'Encaminhar para Humano', 'Encaminha a conversa para um atendente humano', 'suporte', null, true, false, '{maya,felipe}', 'low');

-- Realtime para pipeline de suporte
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_support_pipeline;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_interaction_logs;
