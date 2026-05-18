## Objetivo

Quando o usuário seleciona uma cotação, a emissão deve ser direcionada para a API correta:
- `origem: 'brhub'` → API atual (`BASE_API_URL/emissoes/etiqueta`)
- `origem: 'marketplace'` → nova API Marketplace (`/frete/emissao`)

A cotação já carrega o campo `origem` (setado em `cotacao-frete`). Falta propagar e rotear na emissão.

## Mudanças

### 1. Frontend — propagar `origem` no payload de emissão
- Onde a cotação selecionada é enviada para `emitir-etiqueta`, garantir que `cotacao.origem` seja preservado (hoje pode ser descartado em alguns mapeamentos).
- Persistir também `codigoServico` e (quando marketplace) qualquer identificador extra retornado pela cotação (ex: `id` da cotação marketplace, se houver).

### 2. Edge Function `emitir-etiqueta` — roteador
Logo após validar token/clienteId e montar `emissaoPayload`:

```text
origem = emissaoPayload.cotacao?.origem || 'brhub'
if origem === 'marketplace': emitirMarketplace(...)
else:                        emitirBRHUB(...)   // fluxo atual
```

Extrair o fluxo BRHUB atual numa função `emitirBRHUB(emissaoPayload, userToken)` e criar `emitirMarketplace(emissaoPayload)` em paralelo. Ambas retornam o mesmo formato normalizado:

```text
{ id, codigoObjeto, frete: { valorTotal }, pdfUrl?, origem }
```

### 3. Função `emitirMarketplace`
- Reutiliza `getMarketplaceAuth()` (mesma lógica já existente em `cotacao-frete`) — extrair para módulo compartilhado ou duplicar inline.
- Monta payload no contrato do Marketplace (mapear `destinatario`, `remetente`, `embalagem`, `cotacao.codigoServico`, `valorDeclarado`, `itensDeclaracaoConteudo`).
- POST `${MARKETPLACE_BASE}/frete/emissao` com header `x-api-key`.
- Normaliza resposta para o formato comum.
- Persiste `uuid_emissao_marketplace` e `origem` na tabela `emissoes` para uso posterior em rastreio/PDF/cancelamento.

### 4. Banco — adicionar coluna `origem` em `emissoes`
Migration:
- `ALTER TABLE emissoes ADD COLUMN origem TEXT NOT NULL DEFAULT 'brhub'`
- `ALTER TABLE emissoes ADD COLUMN uuid_marketplace TEXT NULL`
- index `idx_emissoes_origem` para filtros

### 5. Cobrança/multiplicador (já implementado)
- O bloco de bloqueio de crédito já está com multiplicador. Vale para ambos — fica fora desse roteador, executa após sucesso da emissão (qualquer origem).

### 6. Fora deste escopo (próximas etapas, em sequência)
1. **Rastreio**: detectar `origem` da emissão e chamar `/emissoes/status/:cod` do Marketplace quando aplicável.
2. **PDF**: idem, `/emissoes/etiqueta/pdf/:uuid`.
3. **Cancelamento** + estorno de crédito: roteador por `origem`.
4. **Reversa**: endpoint dedicado `/emissoes/reversa` do Marketplace.

## Detalhes técnicos

- Marketplace base URL já configurada: `https://icnwmceefmgavmbzsomo.supabase.co/functions/v1/marketplace-api`
- Credenciais: secrets `MARKETPLACE_EMAIL` e `MARKETPLACE_PASSWORD` (já existem)
- Para evitar divergência de auth, extrair `getMarketplaceAuth()` para `supabase/functions/_shared/marketplace.ts` e importar em ambas as functions
- Logs prefixados `[BRHUB]` e `[MP]` para facilitar debug

## Arquivos afetados

- `supabase/functions/emitir-etiqueta/index.ts` (refator + roteador)
- `supabase/functions/_shared/marketplace.ts` (novo)
- `supabase/functions/cotacao-frete/index.ts` (passar a importar shared)
- `src/pages/.../emissao/*` (garantir propagação de `cotacao.origem`)
- Migration nova: colunas `origem` e `uuid_marketplace` em `emissoes`

## Validação

1. Cotação retorna mix BRHUB + Marketplace (já ok).
2. Emitir cotação BRHUB → fluxo atual, sem regressão.
3. Emitir cotação Marketplace → chama nova API, registra `origem='marketplace'` e `uuid_marketplace`.
4. Conferir nos logs do edge function que o roteador entrou no branch certo.
5. Saldo bloqueado bate com valor exibido na cotação (com multiplicador, se aplicável) em ambos.

Aprovar para implementar a etapa 1 (emissão dual). Etapas 2–4 (rastreio/PDF/cancelamento/reversa) virão em sequência.