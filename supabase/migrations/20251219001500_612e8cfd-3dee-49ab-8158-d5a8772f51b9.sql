-- =====================================================
-- CORREÇÃO DE SEGURANÇA: remetentes_masked view protection
-- =====================================================

-- 1. Recriar a view com security_invoker para herdar RLS da tabela base
DROP VIEW IF EXISTS public.remetentes_masked;

CREATE VIEW public.remetentes_masked
WITH (security_invoker = on)
AS
SELECT 
  id,
  cliente_id,
  nome,
  mask_cpf_cnpj(cpf_cnpj) AS cpf_cnpj_masked,
  celular,
  telefone,
  email,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  localidade,
  uf,
  criado_em,
  atualizado_em,
  sincronizado_em,
  CASE
    WHEN cpf_cnpj_encrypted IS NOT NULL THEN true
    ELSE false
  END AS tem_cpf_encrypted
FROM public.remetentes;

-- 2. Adicionar comentário de segurança
COMMENT ON VIEW public.remetentes_masked IS 'SECURITY: View com security_invoker habilitado. Herda políticas RLS da tabela remetentes. CPF/CNPJ é mascarado via função mask_cpf_cnpj().';