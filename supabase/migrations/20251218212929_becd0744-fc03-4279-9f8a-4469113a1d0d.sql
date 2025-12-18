-- Remover políticas antigas com json
DROP POLICY IF EXISTS "Clientes podem ver seus pedidos importados" ON public.pedidos_importados;
DROP POLICY IF EXISTS "Clientes podem inserir pedidos importados" ON public.pedidos_importados;
DROP POLICY IF EXISTS "Clientes podem atualizar seus pedidos importados" ON public.pedidos_importados;
DROP POLICY IF EXISTS "Clientes podem deletar seus pedidos importados" ON public.pedidos_importados;

-- Criar políticas usando a função get_cliente_id_from_jwt() que já funciona
CREATE POLICY "clientes_veem_pedidos_importados"
ON public.pedidos_importados
FOR SELECT
USING (
  cliente_id = get_cliente_id_from_jwt()
  OR (cliente_id)::text = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'clienteId')
);

CREATE POLICY "clientes_inserem_pedidos_importados"
ON public.pedidos_importados
FOR INSERT
WITH CHECK (
  cliente_id = get_cliente_id_from_jwt()
  OR (cliente_id)::text = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'clienteId')
);

CREATE POLICY "clientes_atualizam_pedidos_importados"
ON public.pedidos_importados
FOR UPDATE
USING (
  cliente_id = get_cliente_id_from_jwt()
  OR (cliente_id)::text = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'clienteId')
);

CREATE POLICY "clientes_deletam_pedidos_importados"
ON public.pedidos_importados
FOR DELETE
USING (
  cliente_id = get_cliente_id_from_jwt()
  OR (cliente_id)::text = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'clienteId')
);

-- Política para service_role ter acesso total
CREATE POLICY "service_role_pedidos_importados"
ON public.pedidos_importados
FOR ALL
USING (true)
WITH CHECK (true);