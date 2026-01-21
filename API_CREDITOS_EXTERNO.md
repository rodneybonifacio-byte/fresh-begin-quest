# 🔐 API de Créditos BRHUB - Documentação para Integração Externa

Este documento descreve as APIs disponíveis para integração com a plataforma Tech do BRHUB e-commerce.

## 🔑 Autenticação

Todas as requisições devem incluir o header `X-API-Key` com a chave de API fornecida.

```http
X-API-Key: sua-api-key-aqui
```

## 📊 Base URL

```
https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1
```

---

## 📋 Fluxo Recomendado de Integração

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE RECARGA PIX                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. IDENTIFICAR CLIENTE                                             │
│     ├─ Opção A: POST /api-login-cliente (se tiver email+senha)      │
│     └─ Opção B: GET /api-consultar-cliente (busca por CPF/email)    │
│                         ↓                                           │
│  2. GERAR PIX                                                       │
│     └─ POST /api-gerar-pix-recarga (retorna QR Code)                │
│                         ↓                                           │
│  3. CLIENTE PAGA                                                    │
│     └─ Exibir QR Code ou Pix Copia e Cola                           │
│                         ↓                                           │
│  4. WEBHOOK CONFIRMA (automático)                                   │
│     └─ Crédito adicionado automaticamente                           │
│                         ↓                                           │
│  5. VERIFICAR SALDO                                                 │
│     └─ GET /api-consultar-saldo                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Login de Cliente (NOVO)

Autentica o cliente na API BRHUB e retorna o `clienteId` extraído do JWT.

### Endpoint

```
POST /api-login-cliente
Content-Type: application/json
```

### Headers Obrigatórios

| Header | Tipo | Descrição |
|--------|------|-----------|
| X-API-Key | string | Chave de API para autenticação |
| Content-Type | string | application/json |

### Body da Requisição

```json
{
  "email": "cliente@email.com",
  "senha": "senha123"
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| email | string | Sim | Email do cliente cadastrado |
| senha | string | Sim | Senha do cliente |

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "data": {
    "clienteId": "123e4567-e89b-12d3-a456-426614174000",
    "nome": "Nome do Cliente",
    "email": "cliente@email.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "timestamp": "2026-01-21T12:00:00.000Z"
  }
}
```

### Erros Possíveis

| Código | Code | Descrição |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key inválida ou não fornecida |
| 401 | INVALID_CREDENTIALS | Email ou senha incorretos |
| 404 | USER_NOT_FOUND | Usuário não encontrado |
| 400 | MISSING_PARAMETER | email ou senha não fornecidos |
| 500 | INTERNAL_ERROR | Erro interno do servidor |

---

## 2️⃣ Consultar Cliente (por CPF/Email)

Localiza o `clienteId` através do CPF/CNPJ ou email, **sem necessidade de senha**.

### Endpoint

```
GET /api-consultar-cliente?cpfCnpj={CPF_OU_CNPJ}
GET /api-consultar-cliente?email={EMAIL}
```

ou

```
POST /api-consultar-cliente
Content-Type: application/json

{
  "cpfCnpj": "12345678900"
}
```

### Headers Obrigatórios

| Header | Tipo | Descrição |
|--------|------|-----------|
| X-API-Key | string | Chave de API para autenticação |

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| cpfCnpj | string | * | CPF (11 dígitos) ou CNPJ (14 dígitos) |
| email | string | * | Email do cliente |

\* Pelo menos um dos campos é obrigatório

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "data": {
    "clienteId": "123e4567-e89b-12d3-a456-426614174000",
    "nome": "Nome do Cliente",
    "email": "cliente@email.com",
    "cpfCnpj": "***.***.***-00",
    "status": "ativo",
    "timestamp": "2026-01-21T12:00:00.000Z"
  }
}
```

### Erros Possíveis

| Código | Code | Descrição |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key inválida ou não fornecida |
| 400 | MISSING_PARAMETER | cpfCnpj ou email não fornecidos |
| 400 | INVALID_PARAMETER | Formato inválido |
| 404 | NOT_FOUND | Cliente não encontrado |
| 500 | INTERNAL_ERROR | Erro interno do servidor |

---

## 3️⃣ Consultar Saldo do Cliente

Retorna o saldo disponível e informações detalhadas de créditos do cliente.

### Endpoint

```
GET /api-consultar-saldo?clienteId={UUID}
```

ou

```
POST /api-consultar-saldo
Content-Type: application/json

{
  "clienteId": "uuid-do-cliente"
}
```

### Headers Obrigatórios

| Header | Tipo | Descrição |
|--------|------|-----------|
| X-API-Key | string | Chave de API para autenticação |

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| clienteId | UUID | Sim | ID único do cliente |

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "data": {
    "clienteId": "123e4567-e89b-12d3-a456-426614174000",
    "saldoDisponivel": 1250.50,
    "creditosBloqueados": 50.00,
    "creditosConsumidos": 200.00,
    "totalRecargas": 1500.50,
    "timestamp": "2026-01-21T10:30:00.000Z"
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| saldoDisponivel | number | Créditos disponíveis para uso |
| creditosBloqueados | number | Créditos reservados (etiquetas pendentes) |
| creditosConsumidos | number | Créditos já utilizados |
| totalRecargas | number | Total histórico de recargas |

---

## 4️⃣ Gerar PIX para Recarga

Gera uma cobrança PIX para recarga de crédito do cliente.

### Endpoint

```
POST /api-gerar-pix-recarga
Content-Type: application/json
```

### Headers Obrigatórios

| Header | Tipo | Descrição |
|--------|------|-----------|
| X-API-Key | string | Chave de API para autenticação |
| Content-Type | string | application/json |

### Body da Requisição

```json
{
  "clienteId": "123e4567-e89b-12d3-a456-426614174000",
  "valor": 100.00,
  "expiracao": 3600,
  "referencia": "ORDER-12345"
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| clienteId | UUID | Sim | ID único do cliente |
| valor | number | Sim | Valor da recarga (máx: R$ 50.000) |
| expiracao | number | Não | Tempo em segundos (padrão: 3600 = 1 hora) |
| referencia | string | Não | ID externo para rastreabilidade (idempotência) |

### Resposta de Sucesso (201)

```json
{
  "success": true,
  "data": {
    "transacaoId": "uuid-da-recarga",
    "txid": "BRHUB1234567890ABC",
    "pixCopiaECola": "00020126580014br.gov.bcb.pix...",
    "qrCodeBase64": "data:image/png;base64,...",
    "valor": 100.00,
    "expiraEm": "2026-01-21T13:00:00.000Z",
    "referencia": "ORDER-12345"
  }
}
```

### Resposta de Duplicidade (200)

Se a mesma `referencia` for enviada novamente:

```json
{
  "success": true,
  "data": {
    "transacaoId": "uuid-da-recarga",
    "txid": "BRHUB1234567890ABC",
    "pixCopiaECola": "00020126580014br.gov.bcb.pix...",
    "qrCodeBase64": "data:image/png;base64,...",
    "valor": 100.00,
    "expiraEm": "2026-01-21T13:00:00.000Z",
    "referencia": "ORDER-12345",
    "duplicado": true,
    "mensagem": "PIX já gerado anteriormente"
  }
}
```

---

## 5️⃣ Adicionar Crédito (Direto)

Adiciona créditos diretamente à conta do cliente, **sem necessidade de PIX**.

### Endpoint

```
POST /api-adicionar-credito
Content-Type: application/json
```

### Body da Requisição

```json
{
  "clienteId": "123e4567-e89b-12d3-a456-426614174000",
  "valor": 100.00,
  "descricao": "Recarga via plataforma Tech",
  "referencia": "ORDER-12345"
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| clienteId | UUID | Sim | ID único do cliente |
| valor | number | Sim | Valor da recarga (máx: R$ 50.000) |
| descricao | string | Não | Descrição da transação |
| referencia | string | Não | ID externo para rastreabilidade (idempotência) |

### Resposta de Sucesso (201)

```json
{
  "success": true,
  "data": {
    "transacaoId": "789e0123-e89b-12d3-a456-426614174000",
    "clienteId": "123e4567-e89b-12d3-a456-426614174000",
    "valor": 100.00,
    "novoSaldo": 350.00,
    "referencia": "ORDER-12345",
    "timestamp": "2026-01-21T10:35:00.000Z"
  }
}
```

---

## 🔒 Segurança

### Boas Práticas

1. **Nunca exponha a API Key** em código frontend ou repositórios públicos
2. **Use HTTPS** em todas as requisições
3. **Implemente timeout** de 30 segundos nas requisições
4. **Use a referência** para garantir idempotência em recargas

### Limites

| Limite | Valor |
|--------|-------|
| Valor máximo por transação | R$ 50.000,00 |
| Expiração padrão PIX | 3600 segundos (1 hora) |

---

## 📝 Códigos de Erro

| Código HTTP | Code | Descrição |
|-------------|------|-----------|
| 401 | UNAUTHORIZED | API Key inválida ou não fornecida |
| 401 | INVALID_CREDENTIALS | Email ou senha incorretos |
| 400 | MISSING_PARAMETER | Parâmetro obrigatório não fornecido |
| 400 | INVALID_PARAMETER | Parâmetro com formato inválido |
| 400 | LIMIT_EXCEEDED | Valor excede R$ 50.000 |
| 404 | NOT_FOUND | Cliente não encontrado |
| 404 | USER_NOT_FOUND | Usuário não encontrado |
| 404 | CLIENT_NOT_FOUND | Cliente não encontrado |
| 405 | METHOD_NOT_ALLOWED | Método HTTP não permitido |
| 500 | INTERNAL_ERROR | Erro interno do servidor |

---

## 📝 Exemplos de Integração

### cURL - Login de Cliente

```bash
curl -X POST \
  'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/api-login-cliente' \
  -H 'X-API-Key: sua-api-key-aqui' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "cliente@email.com",
    "senha": "senha123"
  }'
```

### cURL - Consultar Cliente por CPF

```bash
curl -X GET \
  'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/api-consultar-cliente?cpfCnpj=12345678900' \
  -H 'X-API-Key: sua-api-key-aqui'
```

### cURL - Gerar PIX

```bash
curl -X POST \
  'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/api-gerar-pix-recarga' \
  -H 'X-API-Key: sua-api-key-aqui' \
  -H 'Content-Type: application/json' \
  -d '{
    "clienteId": "123e4567-e89b-12d3-a456-426614174000",
    "valor": 100.00,
    "referencia": "ORDER-12345"
  }'
```

### Node.js/JavaScript

```javascript
const axios = require('axios');

const BASE_URL = 'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1';
const API_KEY = 'sua-api-key-aqui';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

// 1. Login do cliente
async function loginCliente(email, senha) {
  const response = await axios.post(`${BASE_URL}/api-login-cliente`, 
    { email, senha },
    { headers }
  );
  return response.data; // { success, data: { clienteId, nome, token } }
}

// 2. Consultar cliente (alternativa sem senha)
async function consultarCliente(cpfCnpj) {
  const response = await axios.get(`${BASE_URL}/api-consultar-cliente`, {
    params: { cpfCnpj },
    headers: { 'X-API-Key': API_KEY }
  });
  return response.data;
}

// 3. Gerar PIX para recarga
async function gerarPixRecarga(clienteId, valor, referencia) {
  const response = await axios.post(`${BASE_URL}/api-gerar-pix-recarga`, 
    { clienteId, valor, referencia },
    { headers }
  );
  return response.data; // { success, data: { txid, pixCopiaECola, qrCodeBase64 } }
}

// 4. Consultar saldo
async function consultarSaldo(clienteId) {
  const response = await axios.get(`${BASE_URL}/api-consultar-saldo`, {
    params: { clienteId },
    headers: { 'X-API-Key': API_KEY }
  });
  return response.data;
}

// Exemplo de uso completo
async function fluxoCompleto() {
  // Passo 1: Login
  const login = await loginCliente('cliente@email.com', 'senha123');
  const { clienteId } = login.data;
  
  // Passo 2: Gerar PIX
  const pix = await gerarPixRecarga(clienteId, 100.00, 'ORDER-12345');
  console.log('QR Code:', pix.data.pixCopiaECola);
  
  // Passo 3: Aguardar pagamento (webhook automático)
  
  // Passo 4: Verificar saldo
  const saldo = await consultarSaldo(clienteId);
  console.log('Saldo:', saldo.data.saldoDisponivel);
}
```

### Python

```python
import requests

BASE_URL = 'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1'
API_KEY = 'sua-api-key-aqui'

headers = {'X-API-Key': API_KEY}

# 1. Login do cliente
def login_cliente(email, senha):
    response = requests.post(
        f'{BASE_URL}/api-login-cliente',
        json={'email': email, 'senha': senha},
        headers={**headers, 'Content-Type': 'application/json'}
    )
    return response.json()

# 2. Consultar cliente
def consultar_cliente(cpf_cnpj=None, email=None):
    params = {}
    if cpf_cnpj:
        params['cpfCnpj'] = cpf_cnpj
    if email:
        params['email'] = email
    
    response = requests.get(
        f'{BASE_URL}/api-consultar-cliente',
        params=params,
        headers=headers
    )
    return response.json()

# 3. Gerar PIX
def gerar_pix_recarga(cliente_id, valor, referencia=None):
    response = requests.post(
        f'{BASE_URL}/api-gerar-pix-recarga',
        json={
            'clienteId': cliente_id,
            'valor': valor,
            'referencia': referencia
        },
        headers={**headers, 'Content-Type': 'application/json'}
    )
    return response.json()

# 4. Consultar saldo
def consultar_saldo(cliente_id):
    response = requests.get(
        f'{BASE_URL}/api-consultar-saldo',
        params={'clienteId': cliente_id},
        headers=headers
    )
    return response.json()

# Exemplo de uso
if __name__ == '__main__':
    # Login
    login = login_cliente('cliente@email.com', 'senha123')
    cliente_id = login['data']['clienteId']
    
    # Gerar PIX
    pix = gerar_pix_recarga(cliente_id, 100.00, 'ORDER-12345')
    print(f"Pix Copia e Cola: {pix['data']['pixCopiaECola']}")
```

---

## 📞 Suporte

Para dúvidas ou problemas com a integração, entre em contato com a equipe BRHUB.
