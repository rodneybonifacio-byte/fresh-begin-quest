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

## 1️⃣ Consultar Saldo do Cliente

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
    "timestamp": "2026-01-20T10:30:00.000Z"
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

### Erros Possíveis

| Código | Code | Descrição |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key inválida ou não fornecida |
| 400 | MISSING_PARAMETER | clienteId não fornecido |
| 400 | INVALID_PARAMETER | clienteId não é um UUID válido |
| 500 | INTERNAL_ERROR | Erro interno do servidor |

---

## 2️⃣ Adicionar Crédito (Recarga)

Adiciona créditos à conta do cliente. Suporta idempotência via referência externa.

### Endpoint

```
POST /api-adicionar-credito
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
    "timestamp": "2026-01-20T10:35:00.000Z"
  }
}
```

### Resposta de Duplicidade (200)

Se a mesma `referencia` for enviada novamente, retorna os dados da transação existente:

```json
{
  "success": true,
  "data": {
    "transacaoId": "789e0123-e89b-12d3-a456-426614174000",
    "clienteId": "123e4567-e89b-12d3-a456-426614174000",
    "valor": 100.00,
    "novoSaldo": 350.00,
    "referencia": "ORDER-12345",
    "duplicado": true,
    "mensagem": "Transação já processada anteriormente"
  }
}
```

### Erros Possíveis

| Código | Code | Descrição |
|--------|------|-----------|
| 401 | UNAUTHORIZED | API Key inválida ou não fornecida |
| 400 | MISSING_PARAMETER | clienteId não fornecido |
| 400 | INVALID_PARAMETER | clienteId ou valor inválido |
| 400 | LIMIT_EXCEEDED | Valor excede R$ 50.000 |
| 404 | CLIENT_NOT_FOUND | Cliente não encontrado |
| 405 | METHOD_NOT_ALLOWED | Método HTTP não permitido (use POST) |
| 500 | INTERNAL_ERROR | Erro interno do servidor |

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
| Rate limit | Não implementado (usar com responsabilidade) |

---

## 📝 Exemplos de Integração

### cURL - Consultar Saldo

```bash
curl -X GET \
  'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/api-consultar-saldo?clienteId=123e4567-e89b-12d3-a456-426614174000' \
  -H 'X-API-Key: sua-api-key-aqui'
```

### cURL - Adicionar Crédito

```bash
curl -X POST \
  'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/api-adicionar-credito' \
  -H 'X-API-Key: sua-api-key-aqui' \
  -H 'Content-Type: application/json' \
  -d '{
    "clienteId": "123e4567-e89b-12d3-a456-426614174000",
    "valor": 100.00,
    "descricao": "Recarga via plataforma Tech",
    "referencia": "ORDER-12345"
  }'
```

### Node.js/JavaScript

```javascript
const axios = require('axios');

const BASE_URL = 'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1';
const API_KEY = 'sua-api-key-aqui';

// Consultar saldo
async function consultarSaldo(clienteId) {
  const response = await axios.get(`${BASE_URL}/api-consultar-saldo`, {
    params: { clienteId },
    headers: { 'X-API-Key': API_KEY }
  });
  return response.data;
}

// Adicionar crédito
async function adicionarCredito(clienteId, valor, referencia) {
  const response = await axios.post(`${BASE_URL}/api-adicionar-credito`, {
    clienteId,
    valor,
    referencia,
    descricao: 'Recarga via plataforma Tech'
  }, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}
```

### Python

```python
import requests

BASE_URL = 'https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1'
API_KEY = 'sua-api-key-aqui'

headers = {'X-API-Key': API_KEY}

# Consultar saldo
def consultar_saldo(cliente_id):
    response = requests.get(
        f'{BASE_URL}/api-consultar-saldo',
        params={'clienteId': cliente_id},
        headers=headers
    )
    return response.json()

# Adicionar crédito
def adicionar_credito(cliente_id, valor, referencia=None):
    response = requests.post(
        f'{BASE_URL}/api-adicionar-credito',
        json={
            'clienteId': cliente_id,
            'valor': valor,
            'referencia': referencia,
            'descricao': 'Recarga via plataforma Tech'
        },
        headers={**headers, 'Content-Type': 'application/json'}
    )
    return response.json()
```

---

## 📞 Suporte

Para dúvidas ou problemas com a integração, entre em contato com a equipe BRHUB.
