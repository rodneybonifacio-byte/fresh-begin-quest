# 📋 Arquitetura Completa: WhatsApp CRM + IA via MessageBird

## Visão Geral

Sistema de atendimento automatizado via WhatsApp usando **MessageBird** como provedor de mensagens e **OpenAI/Gemini** como motor de IA. Tudo orquestrado via **Supabase Edge Functions** + banco de dados PostgreSQL.

---

## 1. TABELAS DO BANCO DE DADOS

### 1.1 `whatsapp_channels` — Canais WhatsApp (Multi-tenant)
```sql
CREATE TABLE whatsapp_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,        -- Ex: "5511971144095"
  channel_id TEXT NOT NULL,          -- ID do canal no MessageBird
  access_key TEXT NOT NULL,          -- AccessKey do MessageBird
  is_default BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT true,
  ai_agent TEXT DEFAULT 'veronica',  -- Agente padrão do canal
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 `whatsapp_conversations` — Conversas
```sql
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_avatar_url TEXT,
  status TEXT DEFAULT 'open',           -- open, active, closed
  ai_enabled BOOLEAN DEFAULT true,
  active_agent TEXT,                     -- veronica, felipe
  whatsapp_channel_id UUID REFERENCES whatsapp_channels(id),
  cliente_id TEXT,                       -- ID do cliente na plataforma externa
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INT DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 `whatsapp_messages` — Mensagens
```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id),
  messagebird_id TEXT,                 -- ID no MessageBird (para deduplicação)
  direction TEXT NOT NULL,             -- inbound, outbound
  content_type TEXT DEFAULT 'text',    -- text, audio, image, video, document, hsm
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  status TEXT DEFAULT 'sent',          -- sent, delivered, read, failed
  sent_by TEXT DEFAULT 'system',       -- contact, system, admin, veronica, felipe
  ai_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',         -- { raw_event, hsm, template_name, rendered_body, etc }
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 `whatsapp_tickets` — Tickets de Atendimento
```sql
CREATE TABLE whatsapp_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id),
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  status TEXT DEFAULT 'open',          -- open, pending_close, closed, resolved
  category TEXT DEFAULT 'geral',
  subject TEXT,
  description TEXT,
  priority TEXT DEFAULT 'normal',      -- normal, alta, urgente
  sentiment TEXT,                      -- positivo, neutro, negativo
  resolution TEXT,
  closed_at TIMESTAMPTZ,
  closed_by TEXT,                      -- system_followup, system_hsm_timeout, auto_timeout, ai_soft_confirmed
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  opened_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 `ai_support_pipeline` — Pipeline CRM (Kanban)
```sql
CREATE TABLE ai_support_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  contact_phone TEXT,
  contact_name TEXT,
  category TEXT DEFAULT 'geral',       -- rastreio, reclamacao, elogio, duvida, financeiro
  status TEXT DEFAULT 'aberto',        -- verificando, localizado, em_transito, entregue, concluido, etc
  priority TEXT DEFAULT 'normal',
  subject TEXT,
  description TEXT,
  assigned_to TEXT,
  resolution TEXT,
  sentiment TEXT,
  detected_by TEXT,                    -- notificacao_ativa, ai_auto, tool_manifestacao
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.6 `whatsapp_notification_templates` — Templates HSM
```sql
CREATE TABLE whatsapp_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,         -- Nome na Meta (ex: pedido_saiu_entrega_brhub)
  template_language TEXT DEFAULT 'pt_BR',
  template_namespace TEXT,             -- Namespace do MessageBird
  template_body TEXT,                  -- JSON: {header, body, footer, buttons}
  trigger_key TEXT NOT NULL,           -- etiqueta_criada, atraso, objeto_postado, etc
  trigger_label TEXT NOT NULL,         -- Label legível
  trigger_description TEXT,
  variables JSONB DEFAULT '[]',        -- Array de variáveis com mapeamento
  channel_id UUID REFERENCES whatsapp_channels(id),
  is_active BOOLEAN DEFAULT true,
  send_delay_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.7 `ai_agents` — Configuração dos Agentes IA
```sql
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- veronica, felipe
  display_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,         -- Prompt completo do agente
  model TEXT DEFAULT 'gpt-4o',
  provider TEXT DEFAULT 'openai',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INT DEFAULT 200,
  personality TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  -- TTS (Text-to-Speech)
  tts_enabled BOOLEAN DEFAULT false,
  voice_id TEXT,                       -- ID da voz no ElevenLabs
  voice_name TEXT,
  respond_with_audio BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.8 `ai_tools` — Ferramentas da IA (Function Calling)
```sql
CREATE TABLE ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- rastrear_objeto, consultar_saldo, etc
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  edge_function TEXT,                  -- Nome da edge function (se aplicável)
  parameters JSONB DEFAULT '{}',
  ai_callable BOOLEAN DEFAULT false,   -- Se true, a IA pode chamar via function calling
  ai_function_schema JSONB,           -- Schema OpenAI function calling
  allowed_agents TEXT[] DEFAULT '{}',  -- Quais agentes podem usar (vazio = todos)
  is_enabled BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.9 `ai_tool_phone_rules` — Regras VIP por Telefone
```sql
CREATE TABLE ai_tool_phone_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  allow_all BOOLEAN DEFAULT false,     -- Acesso total a ferramentas
  skip_approval BOOLEAN DEFAULT false, -- Pula aprovação manual
  allowed_tool_names TEXT[],
  blocked_tool_names TEXT[],
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.10 `ai_interaction_logs` — Logs de IA
```sql
CREATE TABLE ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  agent_name TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  tool_used TEXT,
  tool_approved BOOLEAN,
  provider TEXT,
  model TEXT,
  input_tokens INT,
  output_tokens INT,
  response_time_ms INT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. SECRETS (Variáveis de Ambiente)

```
MESSAGEBIRD_ACCESS_KEY     = "AccessKey do MessageBird"
MESSAGEBIRD_CHANNEL_ID     = "ID do canal WhatsApp no MessageBird"
MESSAGEBIRD_WHATSAPP_NUMBER = "5511971144095"
OPENAI_API_KEY             = "sk-..."
GEMINI_API_KEY             = "AIza..."
ELEVENLABS_API_KEY         = "..." (para TTS/áudios)
SUPABASE_URL               = "https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY  = "eyJ..."
SUPABASE_ANON_KEY          = "eyJ..."
```

---

## 3. EDGE FUNCTIONS (Arquitetura)

### 3.1 Fluxo Principal de Mensagens

```
Cliente WhatsApp
    ↓
MessageBird (webhook)
    ↓
[messagebird-webhook] ← Recebe TODAS as mensagens
    ├── Normaliza telefone (normalize-phone.ts)
    ├── Resolve canal (channel-resolver.ts)
    ├── Busca/cria conversa
    ├── Resolve nome do contato (6 fontes)
    ├── Salva mensagem no banco
    ├── Re-upload de mídia para Storage
    └── Se inbound + IA habilitada:
        ↓
    [chat-ai-whatsapp] ← Core da IA
        ├── Pré-handoff (Veronica ↔ Felipe)
        ├── Busca config do agente (ai_agents)
        ├── Busca histórico (50 msgs)
        ├── Auto-identificação do contato
        ├── Injeta contexto HSM (notificações recentes)
        ├── Injeta envios pendentes
        ├── Injeta pacotes como destinatário
        ├── Processa mídia (imagem → Gemini, áudio → transcrição)
        ├── Detecta códigos de rastreio
        ├── Carrega tools dinâmicas (ai_tools)
        ├── Chama OpenAI com function calling
        ├── Loop de execução de tools (até 3 iterações)
        ├── Formatação de resposta (anti-markdown)
        ├── Divide mensagem longa em blocos
        ├── TTS (texto → áudio ElevenLabs)
        └── Envia resposta(s) via MessageBird
```

### 3.2 `messagebird-webhook` — Receptor de Webhooks

**URL do Webhook no MessageBird:** `https://<SUPABASE_URL>/functions/v1/messagebird-webhook`

**Eventos processados:**
- `message.created` → Nova mensagem (inbound ou outbound)
- `message.updated` → Atualização de status (sent → delivered → read)

**Lógica principal:**
1. Parsear payload do MessageBird
2. Normalizar telefone brasileiro (9° dígito)
3. Resolver canal via `channel_id`
4. Resolver nome real do contato (6 fontes em cascata):
   - Conversa existente
   - Remetentes por `cliente_id`
   - Remetentes por telefone
   - `cadastros_origem`
   - `pedidos_importados` (destinatários)
   - `etiquetas_pendentes_correcao`
5. Buscar ou criar conversa
6. Deduplicar mensagem por `messagebird_id`
7. Re-upload de mídia autenticada para Storage público
8. Se inbound + IA habilitada → chamar `chat-ai-whatsapp`

### 3.3 `chat-ai-whatsapp` — Motor de IA (3457 linhas)

**Este é o CORE do sistema.** Responsabilidades:

#### A. Pré-Handoff entre Agentes
- **Veronica → Felipe:** Detecta keywords de problema (atraso, extravio, etc.) e faz handoff automático com:
  - Mensagem de transição profissional
  - Delay de 60 segundos (simula análise)
  - Áudio de boas-vindas do Felipe (ElevenLabs TTS)
  - Análise técnica em blocos de texto
- **Triagem:** Se cliente pede Felipe sem problema claro, Veronica questiona antes
- **Felipe → Veronica:** Handoff reverso se solicitado

#### B. Auto-Identificação do Contato
Busca em cascata:
1. `cliente_id` salvo na conversa
2. API externa de clientes
3. Remetentes por `cliente_id`
4. `contact_name` da conversa
5. Remetentes por telefone
6. `cadastros_origem`
7. `pedidos_importados` (destinatários)
8. `etiquetas_pendentes_correcao`
9. `notificacoes_aguardando_retirada`

#### C. Contexto Enriquecido
O prompt é montado em camadas:
1. **System prompt** (do `ai_agents`)
2. **Contexto do contato** (nome, tipo, ID)
3. **Regras VIP** (se aplicável, via `ai_tool_phone_rules`)
4. **Envios pendentes** (API de envios)
5. **Pacotes como destinatário** (busca por telefone)
6. **Contexto de rastreio** (códigos detectados no chat)
7. **Histórico** (50 mensagens recentes)
8. **HSM injection** (notificações ativas recentes — injetado APÓS histórico para peso máximo)
9. **VIP reminder** (se contato VIP)

#### D. Function Calling (Tools Dinâmicas)
Tools carregadas do banco (`ai_tools.ai_callable = true`):

| Tool | Descrição |
|------|-----------|
| `rastrear_objeto` | Consulta rastreio em tempo real |
| `cotacao_frete` | Calcula frete entre CEPs |
| `consultar_saldo` | Saldo de créditos do cliente |
| `consultar_extrato` | Últimas transações |
| `consultar_cliente_api` | Identificar cliente por CPF/email |
| `buscar_emissoes_atraso` | Pacotes em atraso |
| `consultar_servicos_cliente` | Serviços disponíveis |
| `buscar_remetentes_api` | Remetentes cadastrados |
| `buscar_recargas` | Recargas PIX recentes |
| `gerar_pix_recarga` | Gerar QR Code PIX |
| `listar_etiquetas_pendentes` | Etiquetas com erro |
| `criar_cliente_autocadastro` | Auto-cadastro |
| `consultar_dashboard_plataforma` | Dashboard admin (VIP) |
| `consultar_faturas_a_receber` | Faturas financeiras (VIP) |
| `listar_objetos_cliente` | Envios do cliente |
| `abrir_manifestacao` | Reclamação nos Correios |

**Loop:** Até 3 iterações de tool calling → resposta → nova tool call.

#### E. Processamento de Mídia
- **Imagem** → Gemini Vision extrai dados (código rastreio, CEPs, etc.)
- **Áudio** → OpenAI Whisper transcreve para texto
- **TTS** → ElevenLabs gera áudio a partir da resposta (se agente tem `respond_with_audio`)

#### F. Formatação de Resposta
- Remove prefixos duplicados (`*Veronica:*`)
- Divide mensagens longas em 2-4 blocos
- Delay entre blocos (1.5s a 4s) para naturalidade
- Remove URLs (`[link removido]`)
- Proíbe markdown/bullets

### 3.4 `messagebird-send` — Envio Manual (CRM)

Chamado pelo frontend do CRM quando o admin envia mensagem:
```json
POST /functions/v1/messagebird-send
{
  "conversationId": "uuid",
  "message": "texto",
  "contentType": "text|image|audio|file",
  "mediaUrl": "https://..."
}
```

### 3.5 `send-whatsapp-template` — Envio de HSM (Notificações Ativas)

Envia templates/notificações automáticas:
```json
POST /functions/v1/send-whatsapp-template
{
  "trigger_key": "etiqueta_criada|objeto_postado|saiu_para_entrega|atraso|aguardando_retirada|avaliacao",
  "phone": "5511999999999",
  "variables": {
    "nome_destinatario": "João",
    "nome_remetente": "Loja X",
    "codigo_rastreio": "AB123456789BR",
    "data_previsao": "15/03/2026"
  }
}
```

**Automações após envio:**
- Cria/atualiza card no pipeline
- Cria conversa se não existe
- Salva mensagem com `content_type: "hsm"` e `metadata.rendered_body`
- Se trigger = "atraso", auto-assign Felipe

### 3.6 `cron-followup-encerramento` — Encerramento Automático (5min)

**Execução:** A cada 5 minutos via `pg_cron`

**Lógica:**
1. Busca conversas open/active com `last_message_at` > 5 min atrás
2. Para cada conversa:
   - Se última mensagem é `inbound` → pula (esperando nossa resposta)
   - Se já enviou follow-up → pula
   - Se NÃO tem mensagem `inbound` (HSM puro) → fecha silenciosamente
   - Se TEM interação → envia mensagem de despedida e fecha ticket

### 3.7 `close-stale-tickets` — Limpeza de Tickets (4h)

**Execução:** A cada hora via `pg_cron`

1. Fecha tickets "open" com 4h+ sem mensagem
2. Confirma tickets "pending_close" cuja data agendada já passou
3. Reabre tickets "pending_close" onde o cliente respondeu

---

## 4. SHARED UTILITIES (`_shared/`)

### 4.1 `channel-resolver.ts`
```typescript
// Funções:
resolveChannelByMessageBirdId(channelId)  // Webhook → busca canal pelo ID MB
resolveChannelForConversation(convId)      // Chat → busca canal da conversa
resolveDefaultChannel()                    // Fallback → canal padrão ou env vars
```

### 4.2 `normalize-phone.ts`
```typescript
normalizeBrazilianPhone(phone)  // Normaliza BR: adiciona 55, 9° dígito
phoneVariants(phone)            // Gera variantes para busca flexível
```

---

## 5. CRON JOBS (pg_cron)

```sql
-- Encerramento automático (5min)
SELECT cron.schedule('followup-encerramento', '*/5 * * * *', $$
  SELECT net.http_post(
    url:='https://<SUPABASE_URL>/functions/v1/cron-followup-encerramento',
    headers:='{"Authorization": "Bearer <ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );
$$);

-- Limpeza de tickets (a cada hora)
SELECT cron.schedule('close-stale-tickets', '0 * * * *', $$
  SELECT net.http_post(
    url:='https://<SUPABASE_URL>/functions/v1/close-stale-tickets',
    headers:='{"Authorization": "Bearer <ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );
$$);

-- Notificações ativas (exemplos):
-- objeto_postado: */5 * * * *
-- saiu_para_entrega: */10 * * * *
-- avaliacao: */30 * * * *
-- atraso: */15 * * * *
```

---

## 6. CONFIGURAÇÃO DO MESSAGEBIRD

### 6.1 Dashboard MessageBird

1. **Criar conta:** https://dashboard.messagebird.com
2. **Ativar WhatsApp Business** → Channels → WhatsApp
3. **Obter credenciais:**
   - `AccessKey` → Developers → API access keys
   - `Channel ID` → Channels → WhatsApp → copiar ID do canal
4. **Configurar Webhook:**
   - URL: `https://<SUPABASE_URL>/functions/v1/messagebird-webhook`
   - Eventos: `message.created`, `message.updated`

### 6.2 API Endpoints Usados

| Endpoint | Uso |
|----------|-----|
| `POST /v1/send` | Enviar mensagem (texto, mídia, HSM) |
| `GET /balance` | Consultar saldo |

**Payload de envio de texto:**
```json
{
  "to": "5511999999999",
  "from": "<CHANNEL_ID>",
  "type": "text",
  "content": { "text": "Olá!" }
}
```

**Payload de envio de HSM (template):**
```json
{
  "to": "5511999999999",
  "from": "<CHANNEL_ID>",
  "type": "hsm",
  "content": {
    "hsm": {
      "namespace": "<NAMESPACE>",
      "templateName": "pedido_saiu_entrega_brhub",
      "language": { "policy": "deterministic", "code": "pt_BR" },
      "components": [
        { "type": "body", "parameters": [{ "type": "text", "text": "João" }] },
        { "type": "button", "sub_type": "url", "index": 0, "parameters": [{ "type": "text", "text": "AB123456789BR" }] }
      ]
    }
  }
}
```

---

## 7. CONFIGURAÇÃO DA IA

### 7.1 Modelo Principal: OpenAI GPT-4o

**Chamada via API:**
```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [...],
    tools: dynamicTools,       // Function calling
    tool_choice: "auto",
    temperature: 0.7,
    max_tokens: 250,
  }),
});
```

### 7.2 Gemini (Análise de Imagens)
Usado para extrair dados de imagens enviadas pelo WhatsApp (códigos de rastreio, CEPs, etc.)

### 7.3 ElevenLabs (Text-to-Speech)
Gera áudios com a "voz" do agente. Usado especialmente no Felipe para o áudio de boas-vindas.

### 7.4 OpenAI Whisper (Speech-to-Text)
Transcreve áudios enviados pelo cliente para texto, permitindo que a IA processe mensagens de voz.

---

## 8. HIERARQUIA DE AGENTES

### Veronica (Nível 1)
- **Papel:** Atendimento geral, saudações, informações
- **Tom:** Informal, concisa, empática
- **Regras:**
  - NUNCA menciona Felipe ou transferências
  - Máximo 2-3 frases por mensagem
  - Sem listas/bullets/markdown
  - Usa primeiro nome do contato

### Felipe (Nível 2)
- **Papel:** Especialista em resoluções complexas
- **Ativação:** Automática via keywords de problema
- **Tom:** Técnico mas acessível, usa áudios
- **Especialidades:** Atrasos, extravios, apreensão fiscal, avarias

### Handoff Automático
```
Veronica recebe mensagem com "atrasado" →
  Sistema envia: "Vou te passar pro Felipe, nosso especialista..."
  Delay 60s →
  Felipe envia áudio de boas-vindas →
  Felipe analisa e responde em texto (blocos)
```

---

## 9. PIPELINE CRM (Kanban)

### Categorias e Estágios:

**Rastreio:**
```
verificando → localizado → em_transito → entregue → concluido
```

**Reclamação:**
```
aberto → em_andamento → aguardando_cliente → resolvido → fechado
```

**Elogio:**
```
recebido → respondido → agradecido → concluido
```

### Automação HSM → Pipeline:
| Trigger | Categoria | Status |
|---------|-----------|--------|
| etiqueta_criada | rastreio | verificando |
| objeto_postado | rastreio | em_transito |
| saiu_para_entrega | rastreio | em_transito |
| atraso | rastreio | localizado |
| aguardando_retirada | rastreio | localizado |
| avaliacao | elogio | recebido |

---

## 10. COMO REPLICAR EM OUTRO PROJETO

### Passo a Passo:

1. **Criar projeto Lovable com Cloud**
2. **Criar as tabelas** (SQL acima) via migrações
3. **Configurar Secrets:**
   - MESSAGEBIRD_ACCESS_KEY
   - MESSAGEBIRD_CHANNEL_ID
   - MESSAGEBIRD_WHATSAPP_NUMBER
   - OPENAI_API_KEY
   - GEMINI_API_KEY (opcional, para imagens)
   - ELEVENLABS_API_KEY (opcional, para áudio)
4. **Copiar Edge Functions:**
   - `_shared/channel-resolver.ts`
   - `_shared/normalize-phone.ts`
   - `messagebird-webhook/index.ts`
   - `chat-ai-whatsapp/index.ts`
   - `messagebird-send/index.ts`
   - `send-whatsapp-template/index.ts`
   - `cron-followup-encerramento/index.ts`
   - `close-stale-tickets/index.ts`
5. **Configurar `supabase/config.toml`:**
   ```toml
   [functions.messagebird-webhook]
   verify_jwt = false
   
   [functions.chat-ai-whatsapp]
   verify_jwt = false
   
   [functions.messagebird-send]
   verify_jwt = false
   
   [functions.send-whatsapp-template]
   verify_jwt = false
   
   [functions.cron-followup-encerramento]
   verify_jwt = false
   
   [functions.close-stale-tickets]
   verify_jwt = false
   ```
6. **Configurar webhook no MessageBird:**
   - URL: `https://<NOVO_SUPABASE_URL>/functions/v1/messagebird-webhook`
   - Eventos: `message.created`, `message.updated`
7. **Inserir agentes no banco** (`ai_agents`)
8. **Inserir tools no banco** (`ai_tools` com `ai_callable = true` e `ai_function_schema`)
9. **Configurar pg_cron** para os cron jobs
10. **Inserir templates HSM** (`whatsapp_notification_templates`)
11. **Inserir canal padrão** (`whatsapp_channels`)
12. **Habilitar Realtime** para `whatsapp_messages` e `whatsapp_conversations`

### RLS Recomendado:
- Service role: acesso total (Edge Functions usam service_role)
- Admin: acesso via `is_admin_from_jwt()`
- Anon: bloqueado em tudo
- Webhook: `verify_jwt = false` no config.toml

---

## 11. DIAGRAMA DE FLUXO RESUMIDO

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   WhatsApp   │────▶│  MessageBird │────▶│  messagebird-webhook │
│   (Cliente)  │◀────│  (Provider)  │◀────│  (Edge Function)     │
└──────────────┘     └──────────────┘     └──────────┬───────────┘
                                                      │
                                          ┌───────────▼───────────┐
                                          │  chat-ai-whatsapp     │
                                          │  ┌─────────────────┐  │
                                          │  │ OpenAI GPT-4o   │  │
                                          │  │ + Function Call  │  │
                                          │  │ + Gemini Vision  │  │
                                          │  │ + ElevenLabs TTS│  │
                                          │  └─────────────────┘  │
                                          └───────────┬───────────┘
                                                      │
                              ┌────────────────────────┼────────────────────┐
                              │                        │                    │
                    ┌─────────▼────────┐   ┌──────────▼─────────┐  ┌──────▼──────┐
                    │ whatsapp_messages │   │ whatsapp_tickets   │  │ pipeline    │
                    │ (Histórico)      │   │ (Atendimento)      │  │ (CRM Kanban)│
                    └──────────────────┘   └────────────────────┘  └─────────────┘
```
