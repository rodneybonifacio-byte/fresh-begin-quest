
-- =====================================================
-- CORREÇÃO DE SEGURANÇA: Bloquear acesso anônimo em todas as tabelas
-- =====================================================

-- 1. parceiros - bloquear acesso anônimo
DROP POLICY IF EXISTS "deny_anon_access_parceiros" ON public.parceiros;
CREATE POLICY "deny_anon_parceiros_select" ON public.parceiros
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_parceiros_insert" ON public.parceiros
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_parceiros_update" ON public.parceiros
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_parceiros_delete" ON public.parceiros
FOR DELETE TO anon USING (false);

-- 2. remetentes - bloquear acesso anônimo
CREATE POLICY "deny_anon_remetentes_select" ON public.remetentes
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_remetentes_insert" ON public.remetentes
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_remetentes_update" ON public.remetentes
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_remetentes_delete" ON public.remetentes
FOR DELETE TO anon USING (false);

-- 3. integracoes - bloquear acesso anônimo
CREATE POLICY "deny_anon_integracoes_select" ON public.integracoes
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_integracoes_insert" ON public.integracoes
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_integracoes_update" ON public.integracoes
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_integracoes_delete" ON public.integracoes
FOR DELETE TO anon USING (false);

-- 4. recargas_pix - bloquear acesso anônimo
CREATE POLICY "deny_anon_recargas_pix_select" ON public.recargas_pix
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_recargas_pix_insert" ON public.recargas_pix
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_recargas_pix_update" ON public.recargas_pix
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_recargas_pix_delete" ON public.recargas_pix
FOR DELETE TO anon USING (false);

-- 5. comissoes_conecta - bloquear acesso anônimo
CREATE POLICY "deny_anon_comissoes_conecta_select" ON public.comissoes_conecta
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_comissoes_conecta_insert" ON public.comissoes_conecta
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_comissoes_conecta_update" ON public.comissoes_conecta
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_comissoes_conecta_delete" ON public.comissoes_conecta
FOR DELETE TO anon USING (false);

-- 6. clientes_indicados - bloquear acesso anônimo
CREATE POLICY "deny_anon_clientes_indicados_select" ON public.clientes_indicados
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_clientes_indicados_insert" ON public.clientes_indicados
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_clientes_indicados_update" ON public.clientes_indicados
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_clientes_indicados_delete" ON public.clientes_indicados
FOR DELETE TO anon USING (false);

-- 7. transacoes_credito - bloquear acesso anônimo
CREATE POLICY "deny_anon_transacoes_credito_select" ON public.transacoes_credito
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_transacoes_credito_insert" ON public.transacoes_credito
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_transacoes_credito_update" ON public.transacoes_credito
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_transacoes_credito_delete" ON public.transacoes_credito
FOR DELETE TO anon USING (false);

-- 8. user_avatars - bloquear acesso anônimo
CREATE POLICY "deny_anon_user_avatars_select" ON public.user_avatars
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_user_avatars_insert" ON public.user_avatars
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_user_avatars_update" ON public.user_avatars
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_user_avatars_delete" ON public.user_avatars
FOR DELETE TO anon USING (false);

-- 9. fechamentos_fatura - bloquear acesso anônimo
CREATE POLICY "deny_anon_fechamentos_fatura_select" ON public.fechamentos_fatura
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_fechamentos_fatura_insert" ON public.fechamentos_fatura
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_fechamentos_fatura_update" ON public.fechamentos_fatura
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_fechamentos_fatura_delete" ON public.fechamentos_fatura
FOR DELETE TO anon USING (false);

-- 10. pagamentos_parceiros - bloquear acesso anônimo
CREATE POLICY "deny_anon_pagamentos_parceiros_select" ON public.pagamentos_parceiros
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_pagamentos_parceiros_insert" ON public.pagamentos_parceiros
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_pagamentos_parceiros_update" ON public.pagamentos_parceiros
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_pagamentos_parceiros_delete" ON public.pagamentos_parceiros
FOR DELETE TO anon USING (false);

-- 11. etiquetas_pendentes_correcao - bloquear acesso anônimo
CREATE POLICY "deny_anon_etiquetas_pendentes_select" ON public.etiquetas_pendentes_correcao
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_etiquetas_pendentes_insert" ON public.etiquetas_pendentes_correcao
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_etiquetas_pendentes_update" ON public.etiquetas_pendentes_correcao
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_etiquetas_pendentes_delete" ON public.etiquetas_pendentes_correcao
FOR DELETE TO anon USING (false);

-- 12. contador_cadastros - bloquear acesso anônimo para INSERT/DELETE (já tem SELECT público para contador)
CREATE POLICY "deny_anon_contador_insert" ON public.contador_cadastros
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_contador_delete" ON public.contador_cadastros
FOR DELETE TO anon USING (false);
CREATE POLICY "deny_anon_contador_update" ON public.contador_cadastros
FOR UPDATE TO anon USING (false);

-- 13. audit_integracoes_access - garantir bloqueio anônimo
DROP POLICY IF EXISTS "deny_anon_access_audit_integracoes" ON public.audit_integracoes_access;
CREATE POLICY "deny_anon_audit_integracoes_select" ON public.audit_integracoes_access
FOR SELECT TO anon USING (false);
CREATE POLICY "deny_anon_audit_integracoes_insert" ON public.audit_integracoes_access
FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_audit_integracoes_update" ON public.audit_integracoes_access
FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_audit_integracoes_delete" ON public.audit_integracoes_access
FOR DELETE TO anon USING (false);
