# 📦 Documentação Completa — Sistema de Gestão de Envios e Logística

> **Objetivo**: Este documento descreve toda a arquitetura, módulos, tipos, serviços, banco de dados, edge functions e fluxos de negócio do sistema. Use-o como referência para replicar o projeto com outra API de backend.

---

## 📐 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + HeroUI (NextUI fork) + shadcn/ui |
| State/Data | TanStack React Query + MobX |
| Roteamento | React Router DOM v7 |
| HTTP Client | Axios (wrapper customizado) |
| Backend/BaaS | Supabase (Lovable Cloud) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Pagamentos | Banco Inter (PIX + Boleto via mTLS/OAuth2) |
| WhatsApp | MessageBird Conversations API |
| IA | Lovable AI (Gemini/GPT) |
| Gráficos | ApexCharts |
| PDF | pdf-lib, html2pdf.js, jspdf |
| Mapas | Leaflet / Mapbox GL |

---

## 🏗️ Arquitetura Geral

### Autenticação (JWT Externo)

O sistema **NÃO usa Supabase Auth**. A autenticação é feita via uma **API REST externa** que retorna um JWT customizado.

```
POST {BASE_API_URL}/login
Body: { email, senha }
Response: { token, message, expires_in }
```

O JWT é armazenado em `localStorage` sob a chave `token` e enviado automaticamente em todas as requisições HTTP via interceptor Axios.

#### Estrutura do Token (JWT Payload)

```typescript
interface TokenPayload {
    id: string;
    name: string;
    email: string;
    sub: string;
    plano: string;            // Ex: "PRE_PAGO", "POS_PAGO"
    role: 'ADMIN' | 'CLIENTE';
    status: string;
    clienteId: string;        // UUID do cliente — chave principal de isolamento
    remetente: {
        nomeRemetente: string;
        enderecoRemetente: {
            cep: string;
            logradouro: string;
            numero: string;
            complemento: string;
            bairro: string;
            localidade: string;
            uf: string;
        }
    }
    permissions?: string[];
    iat: number;
    exp: number;
}
```

#### Validação de Token nas Edge Functions

As Edge Functions validam o token chamando o endpoint de perfil da API externa:

```typescript
// Fluxo de validação (helper validateBrhubToken):
// 1. Extrai token do header 'x-brhub-authorization' ou 'authorization'
// 2. Chama GET {BASE_API_URL}/account/profile com o token
// 3. Se 200 OK → token válido, decodifica payload
// 4. Extrai clienteId do payload para isolamento de dados
// 5. Verifica role ADMIN para operações privilegiadas
```

### HTTP Client (Axios Wrapper)

```typescript
// src/utils/http-axios-client.tsx
export interface IHttpClient {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T, R = unknown>(url: string, data?: R, config?: AxiosRequestConfig): Promise<T>;
    put<T, R = unknown>(url: string, data?: R, config?: AxiosRequestConfig): Promise<T>;
    delete<T, R = unknown>(url: string, data?: R, config?: AxiosRequestConfig): Promise<T>;
    patch<T, R = unknown>(url: string, data?: R, config?: AxiosRequestConfig): Promise<T>;
}

// Configuração:
// - baseURL: import.meta.env.VITE_BASE_API_URL
// - timeout: 120000ms
// - Interceptor: Adiciona Authorization Bearer {token} do localStorage
// - Tratamento de erros: 401 → logout automático, 400 → toast com mensagem, 403 → acesso negado
```

### Padrão de Resposta da API

```typescript
interface IResponse<T> {
    data: T;
    message?: string;
    total?: number;
    meta?: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        nextPage: number | null;
        prevPage: number | null;
        recordsOnPage: number | null;
    };
}
```

### BaseService (Padrão de Serviço)

Todos os serviços herdam de `BaseService<T>`:

```typescript
abstract class BaseService<T> {
    protected abstract endpoint: string;
    protected httpClient: IHttpClient;
    
    // Métodos padrão:
    getAll(params?, urlEndpoint?): Promise<IResponse<T[]>>
    getById(id): Promise<IResponse<T>>
    getWithParams(params?, subPath?): Promise<IResponse<T[]>>
    create<TResponse, TRequest>(item): Promise<IResponse<TResponse>>
    update<TResponse, TRequest>(id, item): Promise<TResponse>
    delete(id): Promise<void>
}
```

---

## 📁 Estrutura de Páginas

```
src/pages/
├── site/                          # Páginas públicas (login, cadastro, landing)
│   ├── login/                     # Login, recuperar senha, pin-code
│   └── cadastro/                  # Auto-cadastro de clientes
├── private/                       # Área do cliente autenticado
│   ├── home/                      # Dashboard principal
│   ├── emissao/                   # Emissão de etiquetas (formulário, listagem, importação)
│   ├── remetente/                 # CRUD de remetentes
│   ├── destinatario/              # CRUD de destinatários
│   ├── simulador/                 # Simulador/cotação de frete
│   ├── rastreio/                  # Rastreamento de objetos
│   ├── financeiro/
│   │   ├── extrato/               # Extrato de créditos
│   │   ├── fatura/                # Faturas a pagar
│   │   └── recarga/               # Recarga PIX
│   ├── ferramentas/
│   │   ├── integracoes/           # Shopify, Nuvemshop
│   │   └── manifestos/            # Manifestos de coleta
│   ├── embalagem/                 # Embalagens pré-cadastradas
│   ├── usuarios/                  # Gestão de usuários
│   └── profile/                   # Perfil do cliente
├── admin/                         # Área administrativa
│   ├── relatorios/                # Relatórios gerenciais
│   └── crm/                       # CRM WhatsApp (chat, tickets, pipeline)
└── conecta/                       # Portal de parceiros (programa de indicação)
```

---

## 🧩 Módulos Detalhados

### 1. 📊 Dashboard

**Service**: `DashboardService` → endpoint `dashboard`

**Endpoints da API:**
- `GET /dashboard` → Retorna dashboard geral com faturamento, envios e entregas
- `GET /dashboard/relatorio-desempenho` → Relatório por período/remetente/região

**Tipos:**

```typescript
interface IDashboardGeral {
    faturamento: IFaturaDashboard;
    envio: IEnvioDashboard;
    entregaAnalitico: IEntregaAnaliticoDashboard;
}

interface IDashboard {
    totalEnvios: number;
    totalVendas: number;
    totalEnvioPrepostado: number;
    totalEnvioEmTransito: number;
    totalEnvioEntregue: number;
    totalClientes: number;
    totalCusto: number;
}
```

---

### 2. 🏷️ Emissão de Etiquetas

**Service**: `EmissaoService` → endpoint `emissoes`

**Endpoints da API:**
- `GET /emissoes` → Lista emissões (suporta filtros via query params)
- `GET /emissoes/{id}` → Detalhes de uma emissão
- `POST /emissoes` → Criar emissão (via Edge Function `emitir-etiqueta`)
- `GET /emissoes/{id}/imprimir/etiqueta` → PDF da etiqueta
- `GET /emissoes/{id}/imprimir/declaracao` → PDF da declaração de conteúdo
- `GET /emissoes/{id}/imprimir/completa` → PDF completo (etiqueta + declaração)
- `POST /emissoes/imprimir/em-massa` → Impressão em lote
- `POST /emissoes/processar-pedidos-importados` → Processar pedidos de integrações
- `DELETE /emissoes/cancelar-emissao` → Cancelar emissão
- `PUT /emissoes/{id}/atualizar-precos` → Atualizar preços
- `PATCH /emissoes/{id}/reprocessar` → Reprocessar emissão
- `GET /emissoes/reenviar-prepostagem/{id}` → Reenviar pré-postagem

**Tipo Principal:**

```typescript
interface IEmissao {
    id?: string;
    remetenteId: string;
    externoId?: string;            // ID de pedido externo (Shopify/Nuvemshop)
    origem?: string;               // 'shopify', 'nuvemshop', 'manual'
    destinatarioId?: string;
    chaveNFe?: string;
    numeroNotaFiscal?: string;
    cienteObjetoNaoProibido: boolean;
    codigoObjeto?: string;         // Código de rastreio (ex: SS123456789BR)
    codigoServico?: string;        // Código do serviço postal
    servico?: string;              // Nome do serviço (SEDEX, PAC, etc.)
    embalagem?: IEmbalagem;
    cotacao: ICotacaoMinimaResponse;
    itensDeclaracaoConteudo?: { conteudo: string; quantidade: string; valor: string }[];
    listaServicoAdicional?: IEmissaolistaServicoAdicional[];
    logisticaReversa: "S" | "N";
    valorDeclarado: number;
    valorNotaFiscal: number;
    valor?: number;
    valorPostagem?: number;
    status?: string;               // 'PRE_POSTADO', 'POSTADO', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO'
    statusFaturamento?: string;
    criadoEm?: string;
    remetente?: IRemetente;
    destinatario?: IDestinatario;
    cliente?: { cpfCnpj: string; id: string; nome: string; telefone: string; email: string };
    transportadora?: string;
    quantidadeVolumes?: number;
}
```

**Fluxo de Emissão:**
1. Cliente seleciona remetente e destinatário
2. Informa dimensões e peso do pacote (embalagem)
3. Sistema faz cotação de frete (Edge Function `cotacao-frete`)
4. Cliente seleciona serviço/transportadora
5. Edge Function `emitir-etiqueta` é chamada com dados + token do usuário
6. API externa gera etiqueta e retorna código de rastreio
7. Sistema bloqueia crédito (para plano pré-pago) ou registra no faturamento (pós-pago)

---

### 3. 📬 Remetentes

**Service**: `RemetenteService` → endpoint `remetentes`

**Endpoints da API:**
- `GET /remetentes` → Lista remetentes do cliente
- `POST /remetentes` → Criar remetente
- `PUT /remetentes/{id}` → Atualizar remetente
- `DELETE /remetentes/{id}` → Remover remetente
- `GET /remetentes/config/{id}` → Configuração de preço por remetente
- `POST /remetentes/config` → Criar configuração
- `POST /remetentes/config/bulk` → Criar múltiplas configurações

**Tipo:**

```typescript
interface IRemetente {
    id: string;
    nome: string;
    cpfCnpj: string;
    documentoEstrangeiro: string;
    celular: string;
    telefone: string;
    email: string;
    endereco?: IAddress;
    criadoEm?: Date;
}

interface IAddress {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
}
```

**Tabela Supabase**: `remetentes` — Espelha remetentes da API externa com campos adicionais de criptografia (`cpf_cnpj_encrypted`) e data de sincronização.

---

### 4. 📮 Destinatários

**Service**: `DestinatarioService` → endpoint `clientes/destinatarios`

```typescript
interface IDestinatario {
    id: string;
    nome: string;
    cpfCnpj: string;
    telefone?: string;
    celular: string;
    endereco?: IAddress;
}
```

---

### 5. 🚚 Cotação de Frete

**Service**: `FreteService` → endpoint `frete`

**Fluxo:**
1. Frontend chama `FreteService.calculadoraFrete(item)` 
2. O service invoca a Edge Function `cotacao-frete` via Supabase
3. A Edge Function recebe `userToken` + dados de cotação
4. Valida o token e busca regras de precificação do cliente
5. Chama a API externa para obter preços base
6. Aplica markup/regras do plano do cliente
7. Retorna lista de serviços disponíveis

**Tipo de Resposta:**

```typescript
interface ICotacaoMinimaResponse {
    idLote?: string;
    codigoServico: string;
    nomeServico: string;        // Ex: "SEDEX", "PAC"
    preco: string;
    prazo: number;
    imagem?: string;
    isNotaFiscal?: boolean;
    transportadora?: string;    // Para transportadoras não-Correios
    embalagem?: {
        peso: number;
        comprimento: number;
        altura: number;
        largura: number;
        diametro: number;
    };
}
```

---

### 6. 💰 Sistema de Créditos (Pré-Pago)

**Service**: `CreditoService`

**Tabela Supabase**: `transacoes_credito`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| cliente_id | uuid | ID do cliente |
| tipo | varchar | 'recarga' ou 'consumo' |
| valor | numeric | Positivo para recarga, negativo para consumo |
| status | varchar | 'bloqueado', 'consumido', 'liberado' |
| emissao_id | uuid | Referência à emissão (para consumos) |
| blocked_until | timestamptz | Prazo do bloqueio (72h) |
| cobrada | boolean | Se já foi cobrada definitivamente |
| descricao | text | Descrição da transação |
| referencia_externa | varchar | Referência para idempotência |

**Funções do Banco de Dados:**

```sql
-- Calcular saldo disponível (recargas - bloqueados - consumidos)
calcular_saldo_disponivel(p_cliente_id uuid) → numeric

-- Bloquear crédito ao gerar etiqueta (reserva por 72h)
bloquear_credito_etiqueta(p_cliente_id, p_emissao_id, p_valor, p_codigo_objeto) → uuid

-- Consumir crédito bloqueado (quando etiqueta é confirmada/postada)
consumir_credito_bloqueado(p_emissao_id, p_codigo_objeto) → boolean

-- Liberar crédito bloqueado (cancelamento → estorno)
liberar_credito_bloqueado(p_emissao_id, p_codigo_objeto) → boolean

-- Registrar recarga
registrar_recarga(p_cliente_id, p_valor, p_descricao) → uuid
```

**Métodos do Service:**
- `calcularSaldoDisponivel(clienteId)` → Saldo disponível
- `calcularCreditosBloqueados(clienteId)` → Total bloqueado
- `calcularCreditosConsumidos(clienteId)` → Total consumido
- `registrarRecarga(clienteId, valor, descricao)` → Nova recarga
- `verificarSaldoSuficiente(clienteId, valor)` → Verifica se pode emitir
- `obterExtrato(clienteId)` → Lista de transações (via Edge Function)

---

### 7. 💳 Recarga PIX (Banco Inter)

**Service**: `RecargaPixService`

**Tabela Supabase**: `recargas_pix`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| cliente_id | uuid | Cliente |
| valor | numeric | Valor da recarga |
| status | varchar | 'pendente_pagamento', 'pago', 'expirado', 'cancelado' |
| txid | varchar | ID da transação PIX |
| qr_code | text | QR Code texto |
| qr_code_image | text | QR Code Base64 |
| pix_copia_cola | text | Código copia e cola |
| data_criacao | timestamptz | Criação |
| data_pagamento | timestamptz | Quando foi pago |
| data_expiracao | timestamptz | Expiração |

**Edge Functions envolvidas:**
- `banco-inter-create-charge` → Cria cobrança PIX via API Banco Inter (mTLS + OAuth2)
- `banco-inter-webhook` → Recebe webhook do Banco Inter quando PIX é pago
- `buscar-recargas` → Lista recargas do cliente

**Fluxo:**
1. Cliente solicita recarga informando valor
2. Edge Function cria cobrança via API Inter (mTLS)
3. Retorna QR Code para pagamento
4. Webhook do Banco Inter notifica pagamento
5. Sistema registra recarga de crédito automaticamente

---

### 8. 📄 Faturamento (Pós-Pago)

**Service**: `FaturaService` → endpoint `faturas`

**Endpoints da API:**
- `GET /faturas` → Lista faturas
- `GET /faturas/{id}` → Detalhes
- `GET /faturas/imprimir/{id}` → PDF da fatura
- `POST /faturas/{id}/confirma-pagamento` → Confirmar pagamento (FormData)
- `PATCH /faturas/{id}/notifica-via-whatsapp` → Enviar notificação

**Tipo:**

```typescript
interface IFatura {
    id: string;
    faturaId?: string;
    codigo?: string;
    clienteId: string;
    totalObjetos: number;
    precoMedioFaturado: number;
    totalFaturado: string;
    totalCusto: string;
    dataVencimento: string;
    dataPagamento: string;
    status: string;             // 'ABERTA', 'FECHADA', 'PAGA', 'ATRASADA'
    criadoEm: string;
    periodoInicial: string;
    periodoFinal: string;
    cliente: { id: string; nome: string; cpfCnpj: string };
    totalPago: string;
    valorRestante: string;
    faturas?: IFatura[];        // Subfaturas
}
```

**Fechamento de Fatura (Edge Functions):**
- `processar-fechamento-fatura` → Gera PDF + Boleto Banco Inter + Concatena
- `realizar-fechamento` → Processo completo de fechamento
- `gerar-fatura-boleto-manual` → Geração manual com regras customizadas

**Tabela Supabase**: `fechamentos_fatura`

| Campo | Tipo |
|-------|------|
| id | uuid |
| fatura_id | varchar |
| codigo_fatura | varchar |
| nome_cliente | varchar |
| cpf_cnpj | varchar |
| fatura_pdf | text (base64) |
| boleto_pdf | text (base64) |
| boleto_id | varchar |
| nosso_numero | varchar |
| pdf_url | text |
| status_pagamento | varchar |
| data_pagamento | timestamptz |
| subfatura_id | varchar |
| valor_pago | numeric |

---

### 9. 💬 CRM WhatsApp

**Integração**: MessageBird Conversations API

**Tabelas Supabase:**

#### `whatsapp_channels`
Canais de WhatsApp registrados (multi-tenant).

| Campo | Descrição |
|-------|-----------|
| channel_id | ID do canal MessageBird |
| access_key | Chave de acesso MessageBird |
| phone_number | Número do WhatsApp |
| ai_enabled | Se IA está habilitada |
| ai_agent | Nome do agente de IA ativo |

#### `whatsapp_conversations`
Conversas com contatos.

| Campo | Descrição |
|-------|-----------|
| contact_phone | Telefone do contato |
| contact_name | Nome do contato |
| status | 'open', 'closed' |
| ai_enabled | Se IA responde automaticamente |
| active_agent | Agente de IA ativo |
| unread_count | Mensagens não lidas |
| tags | Tags da conversa |
| cliente_id | Vínculo com cliente do sistema |

#### `whatsapp_messages`
Mensagens individuais.

| Campo | Descrição |
|-------|-----------|
| conversation_id | FK para conversa |
| direction | 'inbound' ou 'outbound' |
| content | Texto da mensagem |
| content_type | 'text', 'image', 'document', etc. |
| media_url | URL da mídia |
| ai_generated | Se foi gerada pela IA |
| status | 'sent', 'delivered', 'read', 'failed' |

#### `whatsapp_tickets`
Tickets de atendimento vinculados a conversas.

#### `whatsapp_notification_templates`
Templates HSM para notificações automáticas.

**Edge Functions:**
- `messagebird-webhook` → Recebe webhooks do MessageBird
- `messagebird-send` → Envia mensagens
- `send-whatsapp-template` → Hub centralizado de envio de templates HSM
- `chat-ai-whatsapp` → Processamento de IA para chat
- `classify-intent` → Classificação de intenção da mensagem
- `close-stale-tickets` → Fechar tickets inativos
- `cleanup-stale-conversations` → Limpar conversas sem interação

**IA no WhatsApp:**
- Agentes de IA configuráveis (`ai_agents` table)
- Classificação automática de intenção
- Respostas automáticas com aprovação
- Pipeline de suporte (`ai_support_pipeline`)
- Controle de permissão por telefone (`ai_tool_phone_rules`)

---

### 10. 🔗 Integrações E-commerce

**Service**: `IntegracaoService`

**Tabela Supabase**: `integracoes`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| cliente_id | uuid | Cliente |
| plataforma | varchar | 'shopify', 'nuvemshop' |
| credenciais | jsonb | `{"encrypted": true}` (real está em credenciais_encrypted) |
| credenciais_encrypted | text | Credenciais criptografadas (AES-256) |
| store_id | varchar | ID da loja |
| webhook_url | text | URL do webhook |
| ativo | boolean | Status |
| remetente_id | uuid | Remetente padrão |

**Criptografia de Credenciais:**
- Trigger automático `encrypt_credentials_on_insert/update` criptografa com AES-256
- RPC `decrypt_credentials(encrypted_data)` para descriptografar em Edge Functions
- View `integracoes_safe` mascara credenciais para consultas normais

**Edge Functions:**
- `gerenciar-integracoes` → CRUD de integrações
- `shopify-importar-pedidos` → Importar pedidos da Shopify
- `shopify-processar-pedido` → Processar pedido individual
- `nuvemshop-webhook` → Webhook da Nuvemshop
- `processar-pedido-nuvemshop` → Processar pedido Nuvemshop

**Tabela**: `pedidos_importados` — Armazena pedidos importados das integrações com todos os dados do destinatário e status de processamento.

---

## 🗄️ Banco de Dados Supabase — Tabelas Principais

### Tabelas de Negócio

| Tabela | Descrição |
|--------|-----------|
| `remetentes` | Remetentes com CPF/CNPJ criptografado |
| `integracoes` | Integrações e-commerce com credenciais criptografadas |
| `pedidos_importados` | Pedidos de integrações aguardando processamento |
| `transacoes_credito` | Extrato de créditos (recarga/consumo/bloqueio) |
| `recargas_pix` | Cobranças PIX para recarga |
| `fechamentos_fatura` | Fechamentos de fatura com PDF e boleto |
| `faturas_override` | Override de valores para relatórios |
| `emissoes_externas` | Emissões registradas externamente |
| `emissoes_em_atraso` | Emissões detectadas como atrasadas |
| `etiquetas_pendentes_correcao` | Etiquetas com erro para correção manual |

### Tabelas WhatsApp/CRM

| Tabela | Descrição |
|--------|-----------|
| `whatsapp_channels` | Canais WhatsApp |
| `whatsapp_conversations` | Conversas |
| `whatsapp_messages` | Mensagens |
| `whatsapp_tickets` | Tickets de atendimento |
| `whatsapp_notification_templates` | Templates HSM |
| `whatsapp_phone_blocklist` | Bloqueio de números |

### Tabelas de IA

| Tabela | Descrição |
|--------|-----------|
| `ai_agents` | Agentes de IA configuráveis |
| `ai_tools` | Ferramentas que a IA pode executar |
| `ai_tool_phone_rules` | Regras de permissão por telefone |
| `ai_interaction_logs` | Logs de interação |
| `ai_support_pipeline` | Pipeline de suporte |
| `ai_providers` | Provedores de IA |

### Tabelas Administrativas

| Tabela | Descrição |
|--------|-----------|
| `logs_acesso` | Logs de acesso ao sistema |
| `sessoes_ativas` | Sessões ativas em tempo real |
| `user_avatars` | Avatares dos usuários |
| `cadastros_origem` | Origem dos cadastros |
| `celulares_override` | Override de celulares para rastreio |
| `clientes_coleta_horarios` | Horários de coleta por cliente |
| `coletas_confirmadas` | Confirmações de coleta |

### Tabelas de Parceiros (Programa Conecta)

| Tabela | Descrição |
|--------|-----------|
| `parceiros` | Cadastro de parceiros |
| `clientes_indicados` | Clientes vinculados a parceiros |
| `comissoes_conecta` | Comissões por etiqueta |
| `pagamentos_parceiros` | Pagamentos a parceiros |

### Tabelas de Precificação

| Tabela | Descrição |
|--------|-----------|
| `grupos_regras_precificacao` | Grupos de regras de preço |
| `grupo_regras_clientes` | Vínculo cliente-grupo |

---

## ⚡ Edge Functions — Catálogo Completo

### Autenticação/Conta
| Função | Descrição |
|--------|-----------|
| `registrar-acesso` | Log de acesso |
| `atualizar-presenca` | Atualizar sessão ativa |
| `buscar-dados-usuario` | Dados do usuário |
| `buscar-logs-acesso` | Histórico de acessos |
| `criar-cliente-autocadastro` | Auto-cadastro de clientes |
| `criar-remetente-autocadastro` | Auto-cadastro de remetentes |

### Cotação e Emissão
| Função | Descrição |
|--------|-----------|
| `cotacao-frete` | Cotação de frete com regras de negócio |
| `cotacao-oportunidade` | Cotação para widget público |
| `emitir-etiqueta` | Emissão de etiqueta |
| `consultar-servicos-cliente` | Serviços disponíveis para o cliente |
| `analisar-precos-planilha` | Análise de preços via planilha |

### Remetentes
| Função | Descrição |
|--------|-----------|
| `buscar-remetentes` | Buscar remetentes do cliente via API externa |
| `buscar-remetentes-supabase` | Buscar remetentes do Supabase |
| `atualizar-remetente` | Atualizar dados do remetente |
| `sincronizar-remetentes` | Sincronizar com API externa |
| `sincronizar-remetente-para-api` | Enviar remetente para API |
| `listar-remetentes-admin` | Listagem admin |

### Créditos e Financeiro
| Função | Descrição |
|--------|-----------|
| `buscar-extrato` | Extrato de transações |
| `buscar-recargas` | Lista de recargas PIX |
| `adicionar-saldo-manual` | Adicionar saldo (admin) |
| `remover-saldo-manual` | Remover saldo (admin) |
| `processar-creditos-bloqueados` | Processar bloqueios expirados |

### Banco Inter
| Função | Descrição |
|--------|-----------|
| `banco-inter-create-charge` | Criar cobrança PIX |
| `banco-inter-create-boleto` | Criar boleto |
| `banco-inter-cancel-boleto` | Cancelar boleto |
| `banco-inter-webhook` | Webhook PIX |
| `banco-inter-webhook-boleto` | Webhook Boleto |
| `banco-inter-configure-webhook` | Configurar webhooks |
| `banco-inter-reconciliar-boletos` | Reconciliar boletos |
| `buscar-boleto-pdf` | Download PDF boleto |

### Faturamento
| Função | Descrição |
|--------|-----------|
| `processar-fechamento-fatura` | Fechamento individual |
| `realizar-fechamento` | Processo completo |
| `registrar-fechamento` | Registrar fechamento |
| `gerar-fatura-boleto-manual` | Geração manual |
| `gerar-fatura-exemplo` | Fatura de exemplo |
| `buscar-fechamentos` | Lista de fechamentos |
| `diagnostico-fechamento` | Diagnóstico de problemas |
| `processar-pagamento-manual` | Pagamento manual |

### WhatsApp/CRM
| Função | Descrição |
|--------|-----------|
| `messagebird-webhook` | Webhook MessageBird |
| `messagebird-send` | Envio de mensagens |
| `messagebird-balance` | Consultar saldo |
| `send-whatsapp-template` | Hub de envio de templates |
| `chat-ai-whatsapp` | Chat com IA |
| `classify-intent` | Classificar intenção |
| `close-stale-tickets` | Fechar tickets inativos |
| `cleanup-stale-conversations` | Limpar conversas |
| `list-whatsapp-templates` | Listar templates |

### IA
| Função | Descrição |
|--------|-----------|
| `ai-management` | Gestão de agentes e ferramentas |
| `ai-voice-preview` | Preview de voz (ElevenLabs) |

### Integrações E-commerce
| Função | Descrição |
|--------|-----------|
| `gerenciar-integracoes` | CRUD integrações |
| `shopify-importar-pedidos` | Importar pedidos Shopify |
| `shopify-processar-pedido` | Processar pedido Shopify |
| `nuvemshop-webhook` | Webhook Nuvemshop |
| `nuvemshop-oauth-token` | OAuth Nuvemshop |
| `processar-pedido-nuvemshop` | Processar pedido |

### Correios
| Função | Descrição |
|--------|-----------|
| `correios-abrir-manifestacao` | Abrir manifestação (PI) |
| `testar-rastreio` | Testar rastreio |
| `gerar-manifesto-api` | Gerar manifesto |

### Notificações Automáticas (CRON)
| Função | Descrição |
|--------|-----------|
| `cron-notificar-etiqueta-criada` | Notificar quando etiqueta é criada |
| `cron-objeto-postado` | Notificar quando objeto é postado |
| `cron-saiu-para-entrega` | Notificar saída para entrega |
| `cron-aviso-atraso` | Avisar atraso |
| `cron-verificar-atrasos` | Verificar atrasos |
| `cron-verificar-aguardando-retirada` | Verificar aguardando retirada |
| `cron-avaliacao` | Enviar pesquisa de satisfação |
| `cron-followup-encerramento` | Follow-up de encerramento |

### Logística
| Função | Descrição |
|--------|-----------|
| `tv-painel-coleta` | Painel de coleta em tempo real |
| `reconciliar-pipeline-rastreio` | Reconciliar pipeline |

### Etiquetas com Erro
| Função | Descrição |
|--------|-----------|
| `etiquetas-pendentes-salvar` | Salvar etiquetas com erro |
| `etiquetas-pendentes-listar` | Listar etiquetas com erro |
| `etiquetas-pendentes-deletar` | Deletar etiquetas |
| `buscar-dados-correcao-etiquetas` | Dados para correção |

### Admin/Gestão
| Função | Descrição |
|--------|-----------|
| `gerenciar-clientes` | Gestão de clientes |
| `cancelar-etiqueta-admin` | Cancelar etiqueta (admin) |
| `corrigir-consumos-incorretos` | Corrigir consumos |
| `corrigir-valores-etiquetas` | Corrigir valores |
| `atualizar-custo-operakids` | Atualizar custos |
| `atualizar-transportadora-cliente` | Config. transportadora |
| `debug-api-data` | Debug de dados |

### Parceiros (Conecta)
| Função | Descrição |
|--------|-----------|
| `parceiro-auth` | Autenticação de parceiros |
| `parceiro-dashboard` | Dashboard do parceiro |
| `registrar-parceiro` | Cadastro de parceiro |
| `admin-parceiros` | Gestão admin de parceiros |
| `migrar-senhas-parceiros` | Migração de senhas |

### APIs Externas (para parceiros)
| Função | Descrição |
|--------|-----------|
| `api-login-cliente` | Login de cliente via API |
| `api-consultar-cliente` | Consultar cliente |
| `api-consultar-saldo` | Consultar saldo |
| `api-gerar-pix-recarga` | Gerar PIX de recarga |
| `api-adicionar-credito` | Adicionar crédito |
| `api-cotacao-widget` | Cotação para widget |

---

## 🔐 Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `BASE_API_URL` | URL base da API externa de envios |
| `API_ADMIN_EMAIL` | Email do admin da API externa |
| `API_ADMIN_PASSWORD` | Senha do admin da API externa |
| `BANCO_INTER_CLIENT_ID` | Client ID Banco Inter |
| `BANCO_INTER_CLIENT_SECRET` | Client Secret Banco Inter |
| `BANCO_INTER_CLIENT_CERT` | Certificado PEM do Banco Inter |
| `BANCO_INTER_CLIENT_KEY` | Chave privada PEM do Banco Inter |
| `BANCO_INTER_CA_CERT` | CA Chain do Banco Inter |
| `BANCO_INTER_CHAVE_PIX` | Chave PIX (CNPJ/email) |
| `MESSAGEBIRD_ACCESS_KEY` | Chave de acesso MessageBird |
| `MESSAGEBIRD_CHANNEL_ID` | Channel ID do WhatsApp |
| `MESSAGEBIRD_WHATSAPP_NUMBER` | Número do WhatsApp |
| `CORREIOS_CARTAO_POSTAGEM` | Cartão de postagem Correios |
| `CORREIOS_SENHA` | Senha API Correios |
| `CORREIOS_ID_CORREIOS` | ID numérico do contrato |
| `ELEVENLABS_API_KEY` | API Key ElevenLabs (voz) |
| `FATURAMENTO_API_TOKEN` | Token para operações de faturamento |
| `BRHUB_EXTERNAL_API_KEY` | API Key para integrações externas |
| `WIDGET_CLIENT_EMAIL` | Email da conta para widget público |
| `WIDGET_CLIENT_PASSWORD` | Senha da conta para widget |
| `NUVEMSHOP_CLIENT_ID` | Client ID Nuvemshop |
| `NUVEMSHOP_CLIENT_SECRET` | Client Secret Nuvemshop |
| `SHOPIFY_ACCESS_TOKEN` | Token Shopify |
| `SHOPIFY_STORE_DOMAIN` | Domínio da loja Shopify |

---

## 🔧 Variáveis de Ambiente (Frontend)

```env
VITE_BASE_API_URL=https://sua-api.com/api    # URL base da API REST externa
VITE_SITE_NAME=NomeDaPlataforma
VITE_PHONE=5511999999999
VITE_EMAIL=contato@plataforma.com
VITE_ENDERECO_COMERCIAL=Endereço comercial
VITE_SUPABASE_URL=https://xxx.supabase.co     # Gerado automaticamente
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...          # Gerado automaticamente
VITE_SUPABASE_PROJECT_ID=xxx                  # Gerado automaticamente
```

---

## 🔄 Fluxos de Negócio Críticos

### Fluxo 1: Emissão de Etiqueta (Pré-Pago)

```
Cliente → Seleciona Remetente/Destinatário
        → Informa Dimensões/Peso
        → Cotação (Edge: cotacao-frete → API Externa)
        → Seleciona Serviço
        → Emissão (Edge: emitir-etiqueta → API Externa)
        → Bloqueia Crédito (DB: bloquear_credito_etiqueta)
        → Código de Rastreio Gerado
        → Notificação WhatsApp (CRON: cron-notificar-etiqueta-criada)
```

### Fluxo 2: Recarga PIX

```
Cliente → Informa Valor
        → Edge: banco-inter-create-charge (mTLS OAuth2)
        → QR Code Exibido
        → Pagamento PIX
        → Webhook: banco-inter-webhook
        → DB: registrar_recarga + atualizar_status_recarga
        → Saldo Atualizado
```

### Fluxo 3: Fechamento de Fatura (Pós-Pago)

```
Admin → Seleciona Fatura
      → Edge: processar-fechamento-fatura
      → Gera PDF da Fatura (API Externa)
      → Busca Dados do Cliente (enriquece endereço se necessário)
      → Gera Boleto (API Banco Inter)
      → Concatena PDFs (pdf-lib)
      → Persiste em fechamentos_fatura
      → Envia via WhatsApp (template HSM com documento)
```

### Fluxo 4: Importação de Pedidos (E-commerce)

```
Webhook → Edge: nuvemshop-webhook / shopify-processar-pedido
        → Descriptografa credenciais (RPC: decrypt_credentials)
        → Valida dados do pedido
        → Salva em pedidos_importados (status: 'pendente')
        → Cliente visualiza na lista
        → Processa: Edge: processar-pedidos-importados
        → Emite etiquetas automaticamente
```

### Fluxo 5: Rastreio com Notificações

```
CRON Jobs (a cada 15 min):
  → cron-objeto-postado: Detecta postagem → Notifica destinatário
  → cron-saiu-para-entrega: Detecta saída → Notifica
  → cron-verificar-atrasos: Detecta atraso → Notifica remetente
  → cron-verificar-aguardando-retirada: Detecta retirada → Notifica
  → cron-avaliacao: Após entrega → Pesquisa de satisfação
```

---

## 📋 Para Replicar com Outra API

### O que SUBSTITUIR:

1. **`VITE_BASE_API_URL`** → URL da sua nova API REST
2. **Endpoints da API** → Adaptar todos os endpoints em cada Service (emissoes, remetentes, destinatarios, frete, faturas, dashboard, etc.)
3. **Estrutura do JWT** → Adaptar `TokenPayload` para o formato do seu token
4. **Validação de Token** → Adaptar `validateBrhubToken` para chamar o endpoint de perfil da sua API
5. **Headers de autenticação** → Manter `Authorization: Bearer {token}` ou adaptar
6. **Formato de resposta** → Adaptar `IResponse<T>` se necessário

### O que MANTER:

1. **Supabase** → Todas as tabelas, edge functions e RLS
2. **Frontend** → Componentes React, UI, rotas
3. **Sistema de créditos** → Lógica de bloqueio/consumo/estorno
4. **CRM WhatsApp** → Integração MessageBird
5. **Banco Inter** → PIX e Boletos
6. **Integrações e-commerce** → Shopify e Nuvemshop

### Services que chamam a API externa (precisam adaptação de endpoints):

| Service | Endpoint Atual | Descrição |
|---------|---------------|-----------|
| `AccountService` | `account` | Perfil do usuário |
| `EmissaoService` | `emissoes` | Emissões de etiquetas |
| `RemetenteService` | `remetentes` | Remetentes |
| `DestinatarioService` | `clientes/destinatarios` | Destinatários |
| `FaturaService` | `faturas` | Faturas |
| `DashboardService` | `dashboard` | Dashboard |
| `ClienteService` | `clientes` | Clientes |
| `CorreriosService` | (correios) | Correios |
| `ManifestoService` | `manifestos` | Manifestos |
| `PlanoService` | `planos` | Planos |
| `UsuarioService` | `usuarios` | Usuários |
| `TransportadoraService` | (transportadoras) | Transportadoras |
| `TransportadoraConfigService` | (config) | Config. transportadoras |
| `EmbalagemService` | (embalagens) | Embalagens |
| `OrdemColetaService` | (ordens) | Ordens de coleta |
| `JobService` | (jobs) | Jobs assíncronos |

### Edge Functions que chamam a API externa (precisam adaptação):

- `cotacao-frete` — Cotação de preços
- `emitir-etiqueta` — Emissão de etiqueta
- `buscar-remetentes` — Busca de remetentes
- `sincronizar-remetentes` — Sincronização
- `atualizar-remetente` — Atualização
- `criar-cliente-autocadastro` — Auto-cadastro
- `criar-remetente-autocadastro` — Auto-cadastro remetente
- `consultar-servicos-cliente` — Serviços disponíveis
- `crm-buscar-envio-api` — Busca de envios para CRM
- `debug-api-data` — Debug
- `gerenciar-clientes` — Gestão de clientes
- `cancelar-etiqueta-admin` — Cancelamento
- `gerar-manifesto-api` — Manifestos
- `tv-painel-coleta` — Painel de coleta

---

*Documento gerado em 19/03/2026 — Sistema de Gestão de Envios e Logística*
