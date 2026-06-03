# Fila de Upload — Templates WhatsApp / Bird

**Status:** preparado. **NÃO subir hoje.** Subir amanhã pela API do Bird.

Ordem definida pelo usuário:
1. ✅ **PRIMEIRO** — `pedido_criado_brhub` (trigger `etiqueta_criada`)
2. `pedido_postado_brhub`
3. `pedido_saiu_entrega_brhub`
4. `pedido_aguardando_retirada_brhub`
5. `brhub_objeto_atrasado` (tem header de imagem)
6. `objeto_entregue` (sem corpo cadastrado — revisar antes)
7. `pedido_avaliacao_brhub` (botão URL fixa)

Todos `pt_BR`, categoria sugerida: **UTILITY** (exceto `pedido_avaliacao_brhub` → **MARKETING**).

---

## 1. `pedido_criado_brhub` ⭐ PRIMEIRO A SUBIR

- **trigger:** `etiqueta_criada`
- **language:** `pt_BR`
- **category:** `UTILITY`
- **components:**
  - **BODY** (3 vars):
    ```
    Olá, *{{1}}* !

    Você fez um pedido na loja *{{2}}* e temos uma atualização:

    📦 Código de rastreamento: *{{3}}*

    Avisamos assim que tiver uma nova atualização
    ```
    | var | system_field |
    |---|---|
    | {{1}} | nome_destinatario |
    | {{2}} | nome_remetente |
    | {{3}} | codigo_rastreio |
- **header:** nenhum
- **footer:** nenhum
- **buttons:** nenhum

**Exemplo de variáveis (review do WhatsApp):**
- {{1}} = Maria Silva
- {{2}} = Loja BRHUB
- {{3}} = BR123456789BR

---

## 2. `pedido_postado_brhub`

- **trigger:** `objeto_postado` — **UTILITY**
- **BODY** (4 vars):
  ```
  Olá *{{1}}*

  Sua encomenda, referente ao pedido realizado na *{{2}}* foi postado e está em trânsito.

  🔎 Código de rastreio: *{{3}}*
  📆 Previsão de entrega: *{{4}}*

  Acompanhe a entrega clicando no botão abaixo.
  ```
  | var | system_field |
  |---|---|
  | {{1}} | nome_destinatario |
  | {{2}} | nome_remetente |
  | {{3}} | codigo_rastreio |
  | {{4}} | data_previsao_entrega |
- **BUTTONS:** 1 botão URL dinâmica
  - text: `RASTREAR`
  - type: `URL`
  - url: `https://envios.brhubb.com.br/rastreio/encomenda?objeto={{1}}`
  - btn {{1}} = codigo_rastreio

---

## 3. `pedido_saiu_entrega_brhub`

- **trigger:** `saiu_para_entrega` — **UTILITY**
- **BODY** (3 vars):
  ```
  Olá *{{1}}*

  Boas notícias!

  Sua encomenda referente ao pedido realizado na loja *{{2}}* .

  Código de rastreio: *{{3}}* .

  *Saiu para entrega e chegará em breve*
  ```
  | var | system_field |
  |---|---|
  | {{1}} | nome_destinatario |
  | {{2}} | nome_remetente |
  | {{3}} | codigo_rastreio |

---

## 4. `pedido_aguardando_retirada_brhub`

- **trigger:** `retirada_agencia` — **UTILITY**
- **BODY** (6 vars):
  ```
  Olá *{{1}}*

  📦 Sua encomenda *{{2}}*

  Referente ao pedido realizado na loja *{{3}}* está disponível para retirada na agência.

  Por favor, compareça com um documento de identificação e o código do pedido.

  📍
  Local: *{{4}}*
  Bairro: *{{5}}*
  Endereço: *{{6}}*

  🕒 Horário de atendimento:
  de segunda a sexta das 9h às 17h

  Em caso de dúvidas, nossa equipe está à disposição para ajudar.

  _Obrigado por escolher a *BRHUB* !_
  ```
  | var | system_field |
  |---|---|
  | {{1}} | nome_destinatario |
  | {{2}} | codigo_rastreio |
  | {{3}} | nome_remetente |
  | {{4}} | nome_agencia |
  | {{5}} | bairro_agencia |
  | {{6}} | endereco_agencia |

---

## 5. `brhub_objeto_atrasado`

- **trigger:** `atraso` — **UTILITY**
- **HEADER:** tipo `IMAGE` (variável dinâmica: `header_image_url`)
- **BODY** (3 vars):
  ```
  Olá *{{1}}*

  🚨 Atenção! Atualização sobre sua encomenda *{{2}}* .

  Pedido realizado na loja: *{{3}}*

  Devido a fatores operacionais fora do nosso controle.

  Informamos que sua encomenda sofrerá atraso na entrega .

  *Nossa equipe está acompanhando de perto o processo para garantir que sua entrega seja finalizada o mais breve possível*

  _Agradecemos pela compreensão e seguimos à disposição!_
  ```
  | var | system_field |
  |---|---|
  | {{1}} | nome_destinatario |
  | {{2}} | codigo_rastreio |
  | {{3}} | nome_remetente |

⚠️ Header de imagem precisa de URL de amostra no submit.

---

## 6. `objeto_entregue`

- **trigger:** `entregue` — **UTILITY**
- ⚠️ **Body vazio no banco.** Revisar conteúdo antes de submeter.

---

## 7. `pedido_avaliacao_brhub`

- **trigger:** `avaliacao` — **MARKETING**
- **BODY** (1 var):
  ```
  Olá, *{{1}}* !

  Gostaríamos de saber como foi *sua experiência com o envio que realizamos para você recentemente.*

  _Sua opinião é muito importante para melhorarmos nosso serviço!_

  O *BRHUB Envios* agradece pela colaboração!

  Faça agora sua avaliação

  📝 Para avaliar, no botão abaixo
  ```
  | var | system_field |
  |---|---|
  | {{1}} | nome_destinatario |
- **BUTTONS:** 1 botão URL estática
  - text: `AVALIAR`
  - url: `https://g.page/r/CZneyrS2oTJ6EBM/review`

---

## Próximos passos (amanhã)

1. Criar edge function `bird-template-submit` (POST individual por template).
2. Subir o **#1 `pedido_criado_brhub`** primeiro, aguardar aprovação do WhatsApp.
3. Subir os demais em ordem.
4. `objeto_entregue` precisa de conteúdo definido antes do submit.
