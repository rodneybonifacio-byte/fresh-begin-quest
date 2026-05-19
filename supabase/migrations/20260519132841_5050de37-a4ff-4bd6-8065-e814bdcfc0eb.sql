
-- 1) Drop e recria policies service_role_* para que apliquem apenas ao role service_role
DROP POLICY IF EXISTS service_role_ai_agents ON public.ai_agents;
CREATE POLICY service_role_ai_agents ON public.ai_agents AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_ai_logs ON public.ai_interaction_logs;
CREATE POLICY service_role_ai_logs ON public.ai_interaction_logs AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_ai_providers ON public.ai_providers;
CREATE POLICY service_role_ai_providers ON public.ai_providers AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_support_pipeline ON public.ai_support_pipeline;
CREATE POLICY service_role_support_pipeline ON public.ai_support_pipeline AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_phone_rules ON public.ai_tool_phone_rules;
CREATE POLICY service_role_phone_rules ON public.ai_tool_phone_rules AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_ai_tools ON public.ai_tools;
CREATE POLICY service_role_ai_tools ON public.ai_tools AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_audit_remetentes ON public.audit_remetentes_access;
CREATE POLICY service_role_full_access_audit_remetentes ON public.audit_remetentes_access AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_acesso_celulares_override ON public.celulares_override;
CREATE POLICY service_role_acesso_celulares_override ON public.celulares_override AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_horarios ON public.clientes_coleta_horarios;
CREATE POLICY service_role_full_access_horarios ON public.clientes_coleta_horarios AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_clientes_indicados ON public.clientes_indicados;
CREATE POLICY service_role_full_access_clientes_indicados ON public.clientes_indicados AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_coletas_confirmadas ON public.coletas_confirmadas;
CREATE POLICY service_role_coletas_confirmadas ON public.coletas_confirmadas AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_comissoes ON public.comissoes_conecta;
CREATE POLICY service_role_full_access_comissoes ON public.comissoes_conecta AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage emissoes_em_atraso" ON public.emissoes_em_atraso;
CREATE POLICY "Service role can manage emissoes_em_atraso" ON public.emissoes_em_atraso AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_faturas_override ON public.faturas_override;
CREATE POLICY service_role_faturas_override ON public.faturas_override AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_grupo_clientes ON public.grupo_regras_clientes;
CREATE POLICY service_role_full_access_grupo_clientes ON public.grupo_regras_clientes AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_grupos_regras ON public.grupos_regras_precificacao;
CREATE POLICY service_role_full_access_grupos_regras ON public.grupos_regras_precificacao AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_acesso_total_notificacoes_aguardando ON public.notificacoes_aguardando_retirada;
CREATE POLICY service_role_acesso_total_notificacoes_aguardando ON public.notificacoes_aguardando_retirada AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_pagamentos ON public.pagamentos_parceiros;
CREATE POLICY service_role_full_access_pagamentos ON public.pagamentos_parceiros AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_sessoes ON public.sessoes_ativas;
CREATE POLICY service_role_full_access_sessoes ON public.sessoes_ativas AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_channels ON public.whatsapp_channels;
CREATE POLICY service_role_channels ON public.whatsapp_channels AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_conversations ON public.whatsapp_conversations;
CREATE POLICY service_role_conversations ON public.whatsapp_conversations AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_messages ON public.whatsapp_messages;
CREATE POLICY service_role_messages ON public.whatsapp_messages AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_notification_templates ON public.whatsapp_notification_templates;
CREATE POLICY service_role_notification_templates ON public.whatsapp_notification_templates AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service role" ON public.whatsapp_phone_blocklist;
CREATE POLICY "Allow all for service role" ON public.whatsapp_phone_blocklist AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_tickets ON public.whatsapp_tickets;
CREATE POLICY service_role_tickets ON public.whatsapp_tickets AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) Fechar coletas_confirmadas para acesso público
DROP POLICY IF EXISTS public_read_coletas_confirmadas ON public.coletas_confirmadas;
DROP POLICY IF EXISTS public_write_coletas_confirmadas ON public.coletas_confirmadas;
DROP POLICY IF EXISTS public_delete_coletas_confirmadas ON public.coletas_confirmadas;

CREATE POLICY admin_manage_coletas_confirmadas ON public.coletas_confirmadas
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin_from_jwt()) WITH CHECK (is_admin_from_jwt());

-- 3) Remover leitura pública dos horários de coleta
DROP POLICY IF EXISTS public_read_horarios ON public.clientes_coleta_horarios;

-- 4) Bloquear leitura da coluna senha_hash em parceiros para usuários autenticados
REVOKE SELECT (senha_hash) ON public.parceiros FROM authenticated, anon;
