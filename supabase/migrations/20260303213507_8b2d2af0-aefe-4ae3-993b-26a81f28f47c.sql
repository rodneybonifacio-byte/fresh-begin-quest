-- Adicionar campo para indicar se a tool pode ser chamada pela IA via WhatsApp
ALTER TABLE public.ai_tools 
ADD COLUMN ai_callable boolean NOT NULL DEFAULT false;

-- Adicionar campo para os parâmetros no formato OpenAI function calling
ALTER TABLE public.ai_tools 
ADD COLUMN ai_function_schema jsonb DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.ai_tools.ai_callable IS 'Indica se essa ferramenta pode ser chamada diretamente pela IA no WhatsApp via function calling';
COMMENT ON COLUMN public.ai_tools.ai_function_schema IS 'Schema no formato OpenAI function calling (name, description, parameters) para tools callable';