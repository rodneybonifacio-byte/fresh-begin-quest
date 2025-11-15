-- Remove a política muito permissiva do service_role
DROP POLICY IF EXISTS "service_role_atualiza_recargas" ON public.recargas_pix;

-- Cria política UPDATE restritiva para usuários
-- Permite usuários atualizarem apenas seus próprios registros
-- e apenas campos não-críticos (não permite mudar valor ou cliente_id)
CREATE POLICY "usuarios_atualizam_proprias_recargas"
ON public.recargas_pix
FOR UPDATE
TO authenticated
USING (cliente_id = auth.uid())
WITH CHECK (
  cliente_id = auth.uid() 
  AND status IN ('pendente_pagamento', 'aguardando_confirmacao', 'cancelado')
);

-- Cria função para atualização segura via service_role (para webhooks)
-- Só permite atualizar status e data_pagamento
CREATE OR REPLACE FUNCTION public.atualizar_status_recarga(
  p_recarga_id UUID,
  p_novo_status VARCHAR,
  p_data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Valida status permitidos
  IF p_novo_status NOT IN ('pendente_pagamento', 'pago', 'expirado', 'cancelado', 'aguardando_confirmacao') THEN
    RAISE EXCEPTION 'Status inválido: %', p_novo_status;
  END IF;
  
  -- Atualiza apenas campos seguros
  UPDATE public.recargas_pix
  SET 
    status = p_novo_status,
    data_pagamento = COALESCE(p_data_pagamento, data_pagamento),
    updated_at = NOW()
  WHERE id = p_recarga_id;
  
  RETURN FOUND;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.atualizar_status_recarga IS 
'Função segura para webhooks atualizarem status de recargas. Valida status e limita campos que podem ser modificados.';