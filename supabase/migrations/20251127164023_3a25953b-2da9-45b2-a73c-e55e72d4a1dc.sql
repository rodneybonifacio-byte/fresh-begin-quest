-- Tabela para rastrear contador de cadastros e promoções
CREATE TABLE public.contador_cadastros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL DEFAULT 'primeiros_cadastros',
  contador INTEGER NOT NULL DEFAULT 0,
  limite INTEGER NOT NULL DEFAULT 105,
  valor_premio DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir registro inicial para a promoção dos 105 primeiros
INSERT INTO public.contador_cadastros (tipo, contador, limite, valor_premio, ativo)
VALUES ('primeiros_cadastros', 0, 105, 50.00, true);

-- Enable RLS
ALTER TABLE public.contador_cadastros ENABLE ROW LEVEL SECURITY;

-- Política pública de leitura (para mostrar o contador)
CREATE POLICY "Contador publicamente visível" 
ON public.contador_cadastros 
FOR SELECT 
USING (true);

-- Função para incrementar contador
CREATE OR REPLACE FUNCTION public.incrementar_contador_cadastro()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  novo_contador INTEGER;
BEGIN
  UPDATE public.contador_cadastros 
  SET contador = contador + 1, updated_at = now()
  WHERE tipo = 'primeiros_cadastros' AND ativo = true
  RETURNING contador INTO novo_contador;
  
  RETURN COALESCE(novo_contador, 0);
END;
$$;

-- Função para verificar se está dentro do limite
CREATE OR REPLACE FUNCTION public.verificar_elegibilidade_premio()
RETURNS TABLE(elegivel BOOLEAN, posicao INTEGER, limite INTEGER, valor DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (c.contador < c.limite) AS elegivel,
    c.contador AS posicao,
    c.limite,
    c.valor_premio AS valor
  FROM public.contador_cadastros c
  WHERE c.tipo = 'primeiros_cadastros' AND c.ativo = true
  LIMIT 1;
END;
$$;