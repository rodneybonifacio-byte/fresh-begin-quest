## Problema

Emissões via MaisEnvios (marketplace) são salvas só em `public.emissoes_marketplace`. Tudo no painel hoje lê da API BRHUB, então essas etiquetas:

- Não aparecem na lista `/app/emissao`
- Não disparam WhatsApp `etiqueta_criada`
- Não entram nos crons periódicos (`objeto-postado`, `saiu-para-entrega`, `aguardando-retirada`, `aviso-atraso`, `verificar-atrasos`, `avaliacao`)
- Não atualizam status com base em rastreio

3 emissões já existem assim: AD465405677BR, AD465343589BR, AD465320044BR.

## Solução em camadas

### 1. Modelo de dados — `emissoes_marketplace`
Adicionar colunas para servir como "espelho" de uma emissão BRHUB:

- `remetente_id`, `remetente_nome`, `remetente_cpf_cnpj`
- `destinatario_celular`, `destinatario_cpf_cnpj`, endereço completo
- `peso`, `altura`, `largura`, `comprimento`
- `valor_declarado`, `valor_nota_fiscal`, `chave_nfe`
- `status_rastreio` (último status SRO), `ultimo_evento_em`, `data_postagem`, `data_entrega`
- `notificou_etiqueta_criada`, `notificou_postado`, `notificou_saiu_entrega`, `notificou_aguardando_retirada` (boolean)
- `historico_rastreio` (jsonb)

Preencher backfill das 3 emissões existentes a partir de `payload_request`/`payload_response`.

### 2. Edge function `emitir-etiqueta`
No ponto onde já persiste em `emissoes_marketplace` (linhas 577–593), gravar também os novos campos (remetente, destinatário completo, dimensões, valores) extraídos de `emissaoPayload`.

### 3. Listagem `/app/emissao`
Em `ListaEmissoes.tsx`, após buscar emissões BRHUB, fazer um segundo fetch via `supabase.from('emissoes_marketplace').select(...).eq('cliente_id', ...)` e fundir os resultados, normalizando para o shape `IEmissaoViewModel` (mesma origem visual, com badge "Marketplace"). Reutilizar mesma ordenação, paginação e filtros (filtragem local conforme padrão BRHUB).

### 4. Detalhe / PDF / cancelamento
- Detalhe (`EmissaoViewDetail.tsx`): se `origem === 'marketplace'`, ler de `emissoes_marketplace` em vez de chamar BRHUB.
- PDF: já roteado via `marketplace-pdf-etiqueta` (ok).
- Cancelamento: estender `cancelar-etiqueta-admin` para chamar endpoint reversa marketplace quando `uuid_marketplace` existir, e estornar crédito via `liberar_credito_bloqueado`.

### 5. Notificação `etiqueta_criada`
Em `cron-notificar-etiqueta-criada`, adicionar segundo passo que varre `emissoes_marketplace WHERE notificou_etiqueta_criada = false AND codigo_objeto IS NOT NULL`, dispara `send-whatsapp-template` com `trigger_key=etiqueta_criada` e marca a flag.

### 6. Rastreio periódico
Criar `cron-rastreio-marketplace` (a cada 30 min) que:
- Lê `emissoes_marketplace` não-entregues
- Para cada `codigo_objeto`, chama o tracking BRHUB já existente (`testar-rastreio` / endpoint SRO atual)
- Atualiza `status_rastreio`, `historico_rastreio`, `data_postagem`, `data_entrega`
- Aciona, conforme transição de status, os mesmos triggers WhatsApp dos crons BRHUB:
  - postado → `objeto_postado`
  - saiu para entrega → `saiu_para_entrega`
  - aguardando retirada → `aguardando_retirada`
  - atraso (>prazo) → `aviso_atraso`
  - entregue → `avaliacao` (após X dias, conforme regra atual)
- Cada notificação consulta sua flag para evitar duplicidade (mesmo padrão dedup HSM universal).

### 7. Faturamento
`emissoes_marketplace.cobrada` + `valor_custo` para entrar no fechamento de fatura mensal junto com emissões BRHUB (alinhar com `realizar-fechamento`).

## Validação após deploy

- Backfill: as 3 etiquetas existentes precisam aparecer na lista do cliente RODNEY.
- Reemitir 1 etiqueta marketplace de teste → aparece na lista + WhatsApp `etiqueta_criada` chega.
- Forçar 1 ciclo do novo cron → status atualiza no Supabase + nenhuma duplicata de mensagem.
- Conferir log `ai_interaction_logs`/`emissoes_em_atraso` para garantir paridade com BRHUB.

## Escopo / ordem de execução sugerida

1. Migration (campos + backfill)
2. `emitir-etiqueta` (gravar campos novos)
3. `ListaEmissoes` (merge)
4. `cron-notificar-etiqueta-criada` (extensão MP)
5. Novo `cron-rastreio-marketplace` + disparos WhatsApp
6. Detalhe / cancelamento / faturamento

Confirma que avanço com tudo isso, ou prefere fazer só os passos 1–4 agora (lista + etiqueta_criada) e tratar rastreio/cancelamento/fatura num segundo ciclo?
