# Sistema de Bloqueio de Créditos - Documentação

## Problema Identificado

O sistema de bloqueio de créditos não estava sendo processado automaticamente, resultando em:

1. **Créditos bloqueados expirados** (após 72h) que não eram liberados automaticamente
2. **Créditos de etiquetas postadas** que não eram consumidos automaticamente
3. **Falta de job CRON** para executar o processamento periódico

## Como Funciona o Bloqueio de Créditos

### 1. Geração de Etiqueta
Quando uma etiqueta é gerada (Step4Confirmacao):
- O sistema bloqueia o valor da etiqueta do saldo disponível
- Cria uma transação com:
  - `tipo: 'consumo'`
  - `status: 'bloqueado'`
  - `blocked_until: NOW() + 72 horas`
  - `valor: -valor_etiqueta`

### 2. Processamento Automático
A edge function `processar-creditos-bloqueados` deve verificar periodicamente:

#### Para cada etiqueta bloqueada:

**A. Etiqueta foi postada** (`status != 'pre-postado'`):
- Consome o crédito (muda status de 'bloqueado' para 'consumido')
- Marca como cobrada

**B. Etiqueta ainda em pré-postado mas expirou (>72h)**:
- Libera o crédito (cria estorno)
- Remove a transação bloqueada
- Cria nova transação de recarga com o valor estornado

**C. Etiqueta em pré-postado e dentro de 72h**:
- Mantém bloqueado
- Aguarda próximo processamento

### 3. Funções do Banco de Dados

```sql
-- Bloqueia crédito (usado na geração de etiqueta)
bloquear_credito_etiqueta(p_cliente_id, p_emissao_id, p_valor, p_codigo_objeto)

-- Consome crédito bloqueado (etiqueta foi postada)
consumir_credito_bloqueado(p_emissao_id, p_codigo_objeto)

-- Libera crédito bloqueado (etiqueta expirou sem ser postada)
liberar_credito_bloqueado(p_emissao_id, p_codigo_objeto)

-- Busca etiquetas com créditos bloqueados
buscar_etiquetas_bloqueadas()

-- Calcula saldo disponível (recargas - bloqueados - consumidos)
calcular_saldo_disponivel(p_cliente_id)

-- Calcula total de créditos bloqueados
calcular_creditos_bloqueados(p_cliente_id)
```

## Solução Implementada

### 1. Processamento Manual
Foi adicionado um botão na página de **Extrato de Créditos** para processar créditos bloqueados manualmente:

```typescript
// src/services/ProcessarCreditosService.ts
ProcessarCreditosService.executarProcessamento()
```

### 2. Edge Functions

**a) processar-creditos-bloqueados**
- Busca todas as etiquetas com créditos bloqueados
- Consulta status na API externa
- Processa cada etiqueta (consome ou libera)

**b) _cron/processar-creditos** (novo)
- Job CRON que invoca `processar-creditos-bloqueados`
- Configurado para execução automática

### 3. Configuração do Config.toml
```toml
[functions.processar-creditos-bloqueados]
verify_jwt = false

[functions._cron.processar-creditos]
verify_jwt = false
```

## Como Configurar Execução Automática

### Opção 1: Supabase Dashboard (Recomendado)
1. Acesse o Supabase Dashboard
2. Vá em **Database** → **Extensions** → **pg_cron**
3. Crie um job CRON:
```sql
SELECT cron.schedule(
  'processar-creditos-bloqueados',
  '0 */6 * * *', -- A cada 6 horas
  $$
  SELECT net.http_post(
    url:='https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/_cron/processar-creditos',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

### Opção 2: Serviço Externo (cron-job.org, GitHub Actions)
Configure um webhook que chama:
```
POST https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/processar-creditos-bloqueados
```

### Opção 3: Processamento Manual
Use o botão **"Processar Créditos"** na página de Extrato quando necessário.

## Monitoramento

### Verificar Créditos Bloqueados
```sql
SELECT 
  id,
  cliente_id,
  tipo,
  valor,
  status,
  descricao,
  emissao_id,
  blocked_until,
  created_at
FROM transacoes_credito 
WHERE tipo = 'consumo' 
  AND status = 'bloqueado'
ORDER BY created_at DESC;
```

### Verificar Créditos Expirados (>72h)
```sql
SELECT 
  *
FROM transacoes_credito 
WHERE tipo = 'consumo' 
  AND status = 'bloqueado'
  AND blocked_until < NOW();
```

## Logs da Edge Function

Os logs da `processar-creditos-bloqueados` mostram:
- 📋 Quantidade de etiquetas encontradas
- 🔍 Processamento de cada etiqueta
- ✅ Créditos consumidos
- ⏰ Créditos liberados (expirados)
- ⏳ Créditos mantidos (ainda válidos)
- ❌ Erros encontrados

## Fluxo Completo

```
1. Cliente gera etiqueta
   ↓
2. Sistema bloqueia crédito (72h)
   ↓
3. Etiqueta fica em "pre-postado"
   ↓
4. Job CRON executa periodicamente (ou manual)
   ↓
5a. Etiqueta foi postada?
    → SIM: Consome crédito (status: consumido)
    → NÃO: Continua para 5b
    ↓
5b. Passou 72h?
    → SIM: Libera crédito (estorno)
    → NÃO: Mantém bloqueado
```

## Troubleshooting

### Créditos não sendo processados
1. Verificar se a edge function está configurada corretamente
2. Verificar logs da função no Supabase Dashboard
3. Executar processamento manual via botão

### Saldo incorreto
1. Executar processamento de créditos
2. Verificar transações bloqueadas expiradas
3. Recalcular saldo:
```sql
SELECT calcular_saldo_disponivel('cliente_id');
```

### Erros na API externa
- A função continua processando outras etiquetas mesmo se uma falhar
- Erros são registrados e retornados no resultado

## Próximos Passos

1. ✅ Configurar job CRON no Supabase Dashboard
2. ✅ Testar processamento manual
3. ✅ Monitorar logs após configuração
4. ✅ Validar estornos automáticos após 72h
