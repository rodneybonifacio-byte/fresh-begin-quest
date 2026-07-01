# API Externa — Consulta de Etiquetas BRHUB

Endpoint público espelhando o `crm-buscar-envio-api` (usado pela IA interna). Retorna dados normalizados para consumo por sistemas externos, incluindo IAs.

## Base URL
```
https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/etiquetas-consulta-externa
```

## Autenticação
Envie a chave em **um** destes headers:
- `x-api-key: SUA_CHAVE`
- `apikey: SUA_CHAVE`
- `Authorization: Bearer SUA_CHAVE`

Chave: `BRHUB_EXTERNAL_API_KEY` (já configurada nos secrets).

## Métodos suportados

### 1) GET — 1 código
```
GET /etiquetas-consulta-externa?codigo=AP062389475BR
```

### 2) GET — múltiplos códigos
```
GET /etiquetas-consulta-externa?codes=AP062389475BR,AP062374590BR&includeTracking=true
```

### 3) GET — por clienteId (histórico)
```
GET /etiquetas-consulta-externa?clienteId=abc-123&limit=20
```

### 4) POST — flexível
```json
POST /etiquetas-consulta-externa
Content-Type: application/json
x-api-key: SUA_CHAVE

{
  "codes": ["AP062389475BR", "AP062374590BR"],
  "includeTracking": true
}
```

## Parâmetros

| Campo | Tipo | Descrição |
|---|---|---|
| `codigo` / `code` | string | 1 código de rastreio |
| `codes` | array/CSV | Até 10 códigos |
| `clienteId` | string | Retorna histórico do cliente (limit padrão 20, max 50) |
| `limit` | number | Máximo de itens por clienteId |
| `includeTracking` | boolean | Inclui `historicoRastreio` (eventos SRO) |

## Response

```json
{
  "data": [
    {
      "codigoObjeto": "AP062389475BR",
      "clienteId": "abc-123",
      "status": "em_transito",
      "servico": "SEDEX",
      "criadoEm": "2026-06-25T14:30:00Z",
      "destinatarioNome": "João Silva",
      "destinatarioEndereco": "Rua X, 123, Centro • São Paulo-SP • CEP 01000-000",
      "destinatarioCelular": "11999999999",
      "remetenteNome": "Carmen Jeans",
      "remetenteCpfCnpj": "12345678000199",
      "valorGasto": 32.5,
      "peso": 0.5,
      "altura": 10, "largura": 15, "comprimento": 20,
      "historicoRastreio": [
        { "descricao": "Objeto postado", "data": "...", "unidade": "..." }
      ]
    }
  ],
  "count": 1
}
```

Códigos não encontrados retornam `{ codigoObjeto, notFound: true }`.

## Exemplos

### cURL
```bash
curl "https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/etiquetas-consulta-externa?codigo=AP062389475BR&includeTracking=true" \
  -H "x-api-key: SUA_CHAVE"
```

### Node.js
```js
const r = await fetch(
  "https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/etiquetas-consulta-externa",
  {
    method: "POST",
    headers: { "x-api-key": process.env.BRHUB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ codes: ["AP062389475BR"], includeTracking: true }),
  }
);
const { data } = await r.json();
```

### Python
```python
import requests
r = requests.post(
    "https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/etiquetas-consulta-externa",
    headers={"x-api-key": KEY},
    json={"clienteId": "abc-123", "limit": 10, "includeTracking": False},
)
print(r.json())
```

## Boas práticas para IA no outro lado

- Sempre passe `includeTracking=true` quando precisar responder ao cliente sobre o status atual.
- Cite os códigos **exatamente** em texto; ao gerar áudio, descreva de forma amigável.
- Consulte por `codigo` para respostas pontuais; use `clienteId` só para listar histórico.
- Se receber `notFound`, informe que a etiqueta não está na base BRHUB (pode ainda não ter sido postada).

## Limites
- Máximo 10 códigos por request.
- Máximo 50 itens por consulta por `clienteId`.
- Timeout upstream: 15s por chamada.
