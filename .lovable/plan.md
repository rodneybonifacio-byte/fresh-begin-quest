## Migração MessageBird → Bird API

Corte total da integração MessageBird legacy (`conversations.messagebird.com`, `rest.messagebird.com`) para a nova **Bird API** (`api.bird.com`). 13 arquivos afetados, 4 edge functions reescritas, schema do DB renomeado e secrets renovados.

---

### 1. Secrets a configurar (próximo passo após aprovação)

Vou pedir via `add_secret`:

- `BIRD_API_KEY` — Access Key gerada em Settings → Security → Access Keys (role `Application Developer`)
- `BIRD_WORKSPACE_ID` — UUID do workspace
- `BIRD_WHATSAPP_CHANNEL_ID` — UUID do canal WhatsApp ativo

Os secrets antigos `MESSAGEBIRD_ACCESS_KEY`, `MESSAGEBIRD_CHANNEL_ID`, `MESSAGEBIRD_WHATSAPP_NUMBER` ficarão presentes mas sem uso (posso removê-los depois que tudo estiver validado em produção).

---

### 2. Mudanças na Bird API vs MessageBird (resumo técnico)

| Aspecto | MessageBird (legacy) | Bird (novo) |
|---|---|---|
| Base URL | `conversations.messagebird.com/v1` | `api.bird.com` |
| Auth header | `Authorization: AccessKey <key>` | `Authorization: AccessKey <key>` (igual) |
| Send endpoint | `POST /send` | `POST /workspaces/{wsId}/channels/{chId}/messages` |
| Payload | `{to, from, type, content}` | `{receiver:{contacts:[{identifierValue}]}, body:{type, text/image/...}}` |
| Template HSM | `content.hsm` | `body.type:"template"` + `template.locale/projectId/...` |
| Webhook payload | `{message:{id, channelId, from, content}}` | `{event:"channel.message.created", payload:{message:{...}}}` |
| Saldo | `GET rest.messagebird.com/balance` | **não existe** — só via dashboard. Remover do CRM header. |

---

### 3. Edge Functions a reescrever

- **`messagebird-send` → renomear para `bird-send`**: usa `POST /workspaces/{wsId}/channels/{chId}/messages` com payload Bird. Mantém contrato externo `{conversationId, message, contentType, mediaUrl}` para não quebrar quem chama.
- **`messagebird-webhook` → renomear para `bird-webhook`**: parsea evento `channel.message.created`, normaliza para mesma estrutura interna usada hoje.
- **`send-whatsapp-template`**: substituir payload HSM. Bird usa `body.type:"template"` com `template.projectId`, `template.version`, `template.locale`, `template.parameters[]`.
- **`list-whatsapp-templates`**: nova rota Bird `GET /workspaces/{wsId}/channels/{chId}/whatsapp-templates`.
- **`messagebird-balance` → DELETAR**: Bird não expõe saldo via API. CRM header passa a esconder o widget.

---

### 4. Mudanças no schema (`whatsapp_channels`)

Migração para renomear/adicionar colunas com retrocompatibilidade:

```text
whatsapp_channels:
  - channel_id        → renomear para bird_channel_id (UUID)
  - access_key        → renomear para bird_api_key
  + bird_workspace_id (UUID, novo)
  - phone_number      → mantém (informativo)
```

`_shared/channel-resolver.ts` lê dos novos campos; mantém fallback para env vars `BIRD_*`.

---

### 5. Frontend

- **`CrmLayout.tsx`**: remover bloco do saldo MessageBird (chama `messagebird-balance`). Substituir por badge estática "Bird" ou esconder.
- **`CrmWhatsApp.tsx`**: trocar referências de texto "MessageBird" para "WhatsApp/Bird".
- **`src/integrations/supabase/types.ts`**: regenerado automaticamente após a migração.

---

### 6. Outras edge functions tocadas

- `chat-ai-whatsapp/index.ts` — apenas comentários/strings "MessageBird"; sem mudança funcional.
- `classify-intent/index.ts` — idem.
- `cron-followup-encerramento/index.ts` — usa `messagebird-send` → trocar para `bird-send`.
- `reenviar-postados-falhados/index.ts` — chama `send-whatsapp-template` (sem mudança no caller).
- `_shared/normalize-phone.ts` — comentário; sem mudança.

---

### 7. Ordem de execução

1. **Pedir os 3 secrets Bird** via `add_secret` (bloqueia até o usuário preencher).
2. **Migração SQL**: adicionar `bird_workspace_id`, renomear `channel_id`/`access_key`.
3. **Reescrever `_shared/channel-resolver.ts`** com novos nomes.
4. **Criar `bird-send` e `bird-webhook`**, deletar os antigos (`messagebird-send`, `messagebird-webhook`, `messagebird-balance`) via `delete_edge_functions`.
5. **Atualizar `send-whatsapp-template` e `list-whatsapp-templates`** para Bird API.
6. **Frontend**: remover widget de saldo, ajustar textos.
7. **Testar**: enviar mensagem texto, enviar template HSM, simular webhook inbound via `test_edge_functions`.

---

### 8. Riscos / pontos de atenção

- **Webhook URL muda**: depois do deploy, você precisa cadastrar a nova URL `https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/bird-webhook` no painel Bird → Connectors → Webhook Subscriptions. Isso eu não consigo fazer por API (Bird não tem API pública estável de subscription que cubra todos os canais).
- **Templates HSM**: o `projectId` dos templates muda entre MessageBird e Bird. Você terá que reaprovar/recriar templates no painel Bird. O código vai funcionar mas templates antigos podem não disparar até serem migrados no painel.
- **Conversas em andamento**: as `whatsapp_conversations` existentes continuam com o `whatsapp_channel_id` apontando para o registro renomeado, sem perda de histórico.
- **MessageBird vai deixar de receber inbounds** assim que você apontar o número para o canal Bird no painel — corte instantâneo.

Aprovando, sigo pedindo os 3 secrets e executando na ordem acima.