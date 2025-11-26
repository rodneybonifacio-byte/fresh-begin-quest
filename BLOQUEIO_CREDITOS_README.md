# Sistema de Bloqueio de Créditos - Documentação

## ✅ Status: CONFIGURADO E ATIVO

O sistema está **totalmente funcional** com processamento automático configurado!

### Job CRON Configurado
- ✅ **Nome:** `processar-creditos-bloqueados-automatico`
- ✅ **Frequência:** A cada 6 horas (00:00, 06:00, 12:00, 18:00)
- ✅ **Status:** Ativo
- ✅ **Autenticação:** Admin credentials configuradas

---

## Problema Identificado (RESOLVIDO)

O sistema de bloqueio de créditos não estava sendo processado automaticamente, resultando em:

1. **Créditos bloqueados expirados** (após 72h) que não eram liberados automaticamente ✅
2. **Créditos de etiquetas postadas** que não eram consumidos automaticamente ✅
3. **Falta de job CRON** para executar o processamento periódico ✅
4. **Falta de autenticação admin** nas requisições à API externa ✅

## Como Funciona o Bloqueio de Créditos

### 1. Geração de Etiqueta
Quando uma etiqueta é gerada (Step4Confirmacao):
- O sistema bloqueia o valor da etiqueta do saldo disponível
- Cria uma transação com:
  - `tipo: 'consumo'`
  - `status: 'bloqueado'`
  - `blocked_until: NOW() + 72 horas`
  - `valor: -valor_etiqueta`

### 2. Processamento Automático (A cada 6h)
A edge function `processar-creditos-bloqueados` verifica periodicamente:

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
Botão na página de **Extrato de Créditos** para processar créditos bloqueados manualmente:

```typescript
// src/services/ProcessarCreditosService.ts
ProcessarCreditosService.executarProcessamento()
```

### 2. Edge Functions

**a) processar-creditos-bloqueados**
- Faz login com credenciais admin
- Busca todas as etiquetas com créditos bloqueados
- Consulta status na API externa (autenticado)
- Processa cada etiqueta (consome ou libera)

**b) Job CRON Automático** ✅
- Executa a cada 6 horas: 00:00, 06:00, 12:00, 18:00
- Invoca `processar-creditos-bloqueados` automaticamente
- Logs disponíveis no Supabase Dashboard

### 3. Configuração do Config.toml
```toml
[functions.processar-creditos-bloqueados]
verify_jwt = false

[functions._cron.processar-creditos]
verify_jwt = false
```

## Verificar Job CRON

### Verificar se está ativo
```sql
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job
WHERE jobname = 'processar-creditos-bloqueados-automatico';
```

### Verificar histórico de execuções
```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'processar-creditos-bloqueados-automatico'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Desabilitar (se necessário)
```sql
SELECT cron.unschedule('processar-creditos-bloqueados-automatico');
```

### Reabilitar (se desabilitado)
```sql
SELECT cron.schedule(
  'processar-creditos-bloqueados-automatico',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/processar-creditos-bloqueados',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa3ZmeWJ4dGh2cWhwamJyc3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzU3MTYsImV4cCI6MjA3ODcxMTcxNn0.zZpiOTQPhfCdRkpQxVEf79q7gCOTYWdy-cEtMrjrn3A"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

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

### Verificar Logs da Edge Function
1. Acesse Supabase Dashboard
2. Vá em **Edge Functions**
3. Selecione `processar-creditos-bloqueados`
4. Visualize os logs

## Logs da Edge Function

Os logs mostram:
- 🔐 Login admin
- 📋 Quantidade de etiquetas encontradas
- 🔍 Processamento de cada etiqueta
- ✅ Créditos consumidos
- ⏰ Créditos liberados (expirados)
- ⏳ Créditos mantidos (ainda válidos)
- ❌ Erros encontrados

Exemplo de log bem-sucedido:
```
🔐 Fazendo login com credenciais de admin...
✅ Login admin realizado com sucesso
📋 Encontradas 5 etiquetas com créditos bloqueados
🔍 Processando etiqueta xxx
📊 Status: postado
✅ Etiqueta postada - consumindo crédito
✅ Crédito consumido com sucesso
📊 Resultado: { consumidas: 3, liberadas: 2, mantidas: 0 }
```

## Fluxo Completo

```
1. Cliente gera etiqueta
   ↓
2. Sistema bloqueia crédito (72h)
   ↓
3. Etiqueta fica em "pre-postado"
   ↓
4. Job CRON executa a cada 6h (automático)
   ↓
5a. Etiqueta foi postada?
    → SIM: Consome crédito (status: consumido)
    → NÃO: Continua para 5b
    ↓
5b. Passou 72h?
    → SIM: Libera crédito (estorno)
    → NÃO: Mantém bloqueado
```

## Processamento Manual

Além do processamento automático, você pode executar manualmente:

1. **Via Botão no Extrato:**
   - Acesse: Financeiro > Extrato de Créditos
   - Clique em **"Processar Créditos"**

2. **Via Edge Function (Supabase Dashboard):**
   - Vá em Edge Functions
   - Selecione `processar-creditos-bloqueados`
   - Clique em **"Invoke Function"**

## Troubleshooting

### Créditos não sendo processados
1. Verificar se o job CRON está ativo
2. Verificar logs da edge function no Supabase Dashboard
3. Executar processamento manual via botão no Extrato
4. Verificar credenciais admin (API_ADMIN_EMAIL, API_ADMIN_PASSWORD)

### Saldo incorreto
1. Executar processamento de créditos (botão ou CRON)
2. Verificar transações bloqueadas expiradas
3. Recalcular saldo:
```sql
SELECT calcular_saldo_disponivel('cliente_id');
```

### Erros de autenticação
- Verificar se as variáveis de ambiente estão configuradas:
  - `API_ADMIN_EMAIL`
  - `API_ADMIN_PASSWORD`
  - `BASE_API_URL`

### Erros na API externa
- A função continua processando outras etiquetas mesmo se uma falhar
- Erros são registrados e retornados no resultado
- Verificar logs para detalhes específicos

## Status das Etiquetas

- **pre-postado**: Etiqueta gerada mas não foi postada nos Correios
- **postado**: Etiqueta postada, crédito deve ser consumido
- **em_transito**: Em trânsito, crédito já consumido
- **entregue**: Entregue, crédito já consumido

## Checklist de Configuração ✅

- ✅ Extensões habilitadas (pg_cron, pg_net)
- ✅ Job CRON criado e ativo
- ✅ Edge function com autenticação admin
- ✅ Funções do banco de dados criadas
- ✅ Botão de processamento manual
- ✅ Logs e monitoramento configurados
- ✅ Documentação completa

## Próximos Horários de Execução

O job executa automaticamente em:
- **00:00** (meia-noite)
- **06:00** (manhã)
- **12:00** (meio-dia)
- **18:00** (tarde)

**Próxima execução:** Verifique a hora atual e calcule o próximo horário múltiplo de 6.

---

## Suporte

Para dúvidas ou problemas:
1. Verificar logs da edge function
2. Executar processamento manual
3. Verificar histórico de execuções do CRON
4. Consultar esta documentação

**Sistema totalmente operacional! ✅**
