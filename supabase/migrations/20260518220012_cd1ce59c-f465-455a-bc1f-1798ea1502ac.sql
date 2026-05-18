
ALTER TABLE public.emissoes_marketplace
  ADD COLUMN IF NOT EXISTS remetente_id uuid,
  ADD COLUMN IF NOT EXISTS remetente_nome text,
  ADD COLUMN IF NOT EXISTS remetente_cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS destinatario_celular text,
  ADD COLUMN IF NOT EXISTS destinatario_cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS destinatario_cep text,
  ADD COLUMN IF NOT EXISTS destinatario_logradouro text,
  ADD COLUMN IF NOT EXISTS destinatario_numero text,
  ADD COLUMN IF NOT EXISTS destinatario_complemento text,
  ADD COLUMN IF NOT EXISTS destinatario_bairro text,
  ADD COLUMN IF NOT EXISTS destinatario_cidade text,
  ADD COLUMN IF NOT EXISTS destinatario_uf text,
  ADD COLUMN IF NOT EXISTS peso numeric,
  ADD COLUMN IF NOT EXISTS altura numeric,
  ADD COLUMN IF NOT EXISTS largura numeric,
  ADD COLUMN IF NOT EXISTS comprimento numeric,
  ADD COLUMN IF NOT EXISTS valor_declarado numeric,
  ADD COLUMN IF NOT EXISTS valor_nota_fiscal numeric,
  ADD COLUMN IF NOT EXISTS chave_nfe text,
  ADD COLUMN IF NOT EXISTS numero_nota_fiscal text,
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS status_rastreio text,
  ADD COLUMN IF NOT EXISTS ultimo_evento_em timestamptz,
  ADD COLUMN IF NOT EXISTS data_postagem timestamptz,
  ADD COLUMN IF NOT EXISTS data_entrega timestamptz,
  ADD COLUMN IF NOT EXISTS data_previsao_entrega timestamptz,
  ADD COLUMN IF NOT EXISTS historico_rastreio jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notificou_etiqueta_criada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificou_postado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificou_saiu_entrega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificou_aguardando_retirada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificou_atraso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificou_entregue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificou_avaliacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_rastreio_em timestamptz,
  ADD COLUMN IF NOT EXISTS valor_custo numeric,
  ADD COLUMN IF NOT EXISTS cobrada boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS emissoes_marketplace_codigo_objeto_idx
  ON public.emissoes_marketplace(codigo_objeto);
CREATE INDEX IF NOT EXISTS emissoes_marketplace_cliente_created_idx
  ON public.emissoes_marketplace(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS emissoes_marketplace_status_rastreio_idx
  ON public.emissoes_marketplace(status_rastreio);
CREATE INDEX IF NOT EXISTS emissoes_marketplace_notif_criada_idx
  ON public.emissoes_marketplace(notificou_etiqueta_criada)
  WHERE notificou_etiqueta_criada = false;

-- Backfill a partir do payload_request armazenado
UPDATE public.emissoes_marketplace
SET
  remetente_id = COALESCE(remetente_id, NULLIF((payload_request->>'remetenteId'), '')::uuid),
  remetente_nome = COALESCE(remetente_nome, payload_request->'remetente'->>'nome'),
  remetente_cpf_cnpj = COALESCE(remetente_cpf_cnpj, payload_request->'remetente'->>'cpfCnpj'),
  destinatario_celular = COALESCE(destinatario_celular,
    payload_request->'destinatario'->>'celular',
    payload_request->'destinatario'->>'telefone'),
  destinatario_cpf_cnpj = COALESCE(destinatario_cpf_cnpj, payload_request->'destinatario'->>'cpfCnpj'),
  destinatario_cep = COALESCE(destinatario_cep, payload_request->'destinatario'->'endereco'->>'cep'),
  destinatario_logradouro = COALESCE(destinatario_logradouro, payload_request->'destinatario'->'endereco'->>'logradouro'),
  destinatario_numero = COALESCE(destinatario_numero, payload_request->'destinatario'->'endereco'->>'numero'),
  destinatario_complemento = COALESCE(destinatario_complemento, payload_request->'destinatario'->'endereco'->>'complemento'),
  destinatario_bairro = COALESCE(destinatario_bairro, payload_request->'destinatario'->'endereco'->>'bairro'),
  destinatario_cidade = COALESCE(destinatario_cidade, payload_request->'destinatario'->'endereco'->>'cidade'),
  destinatario_uf = COALESCE(destinatario_uf, payload_request->'destinatario'->'endereco'->>'uf'),
  peso = COALESCE(peso, NULLIF(payload_request->'embalagem'->>'peso','')::numeric),
  altura = COALESCE(altura, NULLIF(payload_request->'embalagem'->>'altura','')::numeric),
  largura = COALESCE(largura, NULLIF(payload_request->'embalagem'->>'largura','')::numeric),
  comprimento = COALESCE(comprimento, NULLIF(payload_request->'embalagem'->>'comprimento','')::numeric),
  valor_declarado = COALESCE(valor_declarado, NULLIF(payload_request->>'valorDeclarado','')::numeric),
  valor_nota_fiscal = COALESCE(valor_nota_fiscal, NULLIF(payload_request->>'valorNotaFiscal','')::numeric),
  chave_nfe = COALESCE(chave_nfe, payload_request->>'chaveNFe'),
  numero_nota_fiscal = COALESCE(numero_nota_fiscal, payload_request->>'numeroNotaFiscal'),
  observacao = COALESCE(observacao, payload_request->>'observacao')
WHERE payload_request IS NOT NULL;
