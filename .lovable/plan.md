## Objetivo

Substituir o `_shared/marketplace.ts` (que hoje empilha workarounds de versões antigas — campos `sender/delivery/contact/object/complement/dc/nf/service/serviceCode` etc.) por uma implementação **enxuta** que respeita o contrato público v3.1 da API Marketplace BRHUB. O servidor MP já resolve internamente `customerId`, `cardpost`, CEP de origem, tradução para MaisEnvios e fallback de tracking — o cliente só precisa mandar o payload documentado.

## Mudanças

### 1. `supabase/functions/_shared/marketplace.ts` — reescrita enxuta

Manter helpers públicos (mesmas assinaturas): `getMarketplaceAuth`, `emitirEtiquetaMarketplace`, `rastrearMarketplace`, `getPdfEtiquetaMarketplace`, `cancelarEmissaoMarketplace`, `criarReversaMarketplace`.

**`emitirEtiquetaMarketplace`** — payload reduzido ao contrato v3.1:

```text
{
  remetenteId?      ou  remetente:{ nome, cpfCnpj, celular, email,
                                    cep, logradouro, numero, complemento, bairro, cidade, uf },
  destinatario:     { nome, cpfCnpj, celular(obrig), email,
                      cep, logradouro, numero, complemento, bairro, cidade, uf },
  embalagem:        { peso(kg), altura, largura, comprimento, diametro },
  cotacao:          objeto OPACO devolvido por /frete/cotacao (não mexer),
  valorDeclarado?,
  itensDeclaracaoConteudo?: [{ conteudo, quantidade, valor }],
  numeroNotaFiscal?, chaveNFe?,   // 44 dígitos quando privada
  numeroPedido?,                  // v2.9 — reconciliação
  logisticaReversa?: 'S'|'N',
  cienteObjetoNaoProibido?: boolean
}
```

Regras locais:
- Validar `destinatario.celular` (HTTP 400 antes da API — v2.8).
- Validar NF (`numeroNotaFiscal` + `chaveNFe` 44 dígitos) quando `cotacao.requerNotaFiscal === true` **ou** quando `codigoServico` ∈ `{sameday, nextday, nextdayhub, hot3h, hot3horas, expresso1, +expresso1, economico1, +economico1, jadlog, .package}` (v3.0).
- Peso sempre em kg (a API converte para gramas internamente quando Correios).
- **Remover** todos os campos legacy (`sender`, `delivery`, `contact`, `object`, `complement`, `service*`, `dc`, `nf`, `request`, `invoice`, `nota`, `pedido`, `integratorId`, recotação prévia, `idLote`, etc.).
- Em caso de erro, propagar `details: string[]` da resposta (v2.4).

**`rastrearMarketplace`** — `GET /emissoes/status/{codigo}`, devolver `{ status, statusDescricao, transportadora, formatoCodigo, fonteStatus, eventos[] }` (v3.1) além do shape BRHUB para compat.

**`getPdfEtiquetaMarketplace`** — sem mudanças funcionais; continua `GET /emissoes/etiqueta/pdf/{uuid}` retornando `{ nome, dados(base64) }`.

**`cancelarEmissaoMarketplace`** — `DELETE /emissoes/{uuid}/cancelar` (já está correto).

**`criarReversaMarketplace`** — `POST /emissoes/reversa` com mesmo payload reduzido da emissão; remover envio de `reverse: true` top-level (v2.9).

### 2. `supabase/functions/emitir-etiqueta/index.ts` — limpar roteador

- **Remover o redirect SEDEX/PAC → BRHUB** (`/^\d{4,5}$/` em códigos marketplace) — v2.2 corrigiu o bug "CEP não encontrado" e v2.5–v2.7 estabilizaram payload. Agora Correios funciona pelo Marketplace normalmente.
- **Remover a "recotação BRHUB para recuperar idLote"** — só faz sentido no fluxo BRHUB nativo; manter intacta a chamada `${BASE_API_URL}/emissoes` para `origem === 'brhub'`.
- Manter carregamento do remetente do Supabase quando `remetenteId` veio sem objeto remetente (Marketplace precisa do objeto completo).
- Propagar `details: string[]` da MP no erro retornado ao frontend.
- Resto do fluxo (bloqueio de créditos, grupo de regras, persistência em `emissoes_marketplace`) fica como está.

### 3. `supabase/functions/cotacao-frete/index.ts` — pequeno ajuste

- Adicionar `requerNotaFiscal` ao mapeamento das cotações Marketplace (já vem no JSON da MP via `...c`, mas garantir que não é sobrescrito por valor falso).
- Sem outras mudanças — o endpoint `/frete/cotacao` já estava alinhado.

### 4. Frontend — sinalizar NF obrigatória

- Em `src/pages/private/emissao/*` (tela de seleção de cotação), quando `cotacao.requerNotaFiscal === true` exibir badge "NF obrigatória" e bloquear o botão **Emitir** até o usuário preencher `numeroNotaFiscal` e `chaveNFe` (44 dígitos). Validação espelhada do servidor (v2.3 + v3.0).
- Mostrar `details: string[]` quando vier no erro (toast com lista).
- Continuar enviando `numeroPedido` quando disponível (pedido importado de marketplace).

### 5. Sem migrations

Tabelas `emissoes_marketplace`, `transacoes_credito` etc. já estão prontas. Nenhum DDL.

## Arquivos afetados

- `supabase/functions/_shared/marketplace.ts` (reescrita — ~250 linhas, antes 521)
- `supabase/functions/emitir-etiqueta/index.ts` (remove redirect + recotação BRHUB-para-idLote-vindo-de-MP)
- `supabase/functions/cotacao-frete/index.ts` (garantir `requerNotaFiscal` preservado)
- `src/pages/private/emissao/` (componente de cotação + emissão — bloqueio NF + exibição de `details[]`)

## Validação

1. Cotar Nick Atacado → Lasa Luciano (9,26 kg / 23x30x50 / SP→SP), conferir mix BRHUB + Marketplace.
2. Emitir **SEDEX (03220) via Marketplace** — deve sair sem o redirect forçado para BRHUB nativo.
3. Emitir **Same Day** sem NF — deve bloquear no frontend; com NF 44-dig deve passar.
4. Rastrear o `codigoObjeto` retornado — confirmar `transportadora`, `formatoCodigo`, `fonteStatus` na resposta.
5. Imprimir PDF da etiqueta — `GET /emissoes/etiqueta/pdf/{uuid}`.
6. Cancelar a etiqueta — confirmar estorno em `transacoes_credito`.
7. Emitir reversa — `POST /emissoes/reversa` com remetente=cliente final, destinatario=loja.

## Fora do escopo

- Não mexer no fluxo BRHUB nativo (`/emissoes` direto na BASE_API_URL) — segue inalterado para clientes que ainda usam contrato Correios próprio.
- Não tocar em `cancelar-etiqueta-admin`, `marketplace-pdf-etiqueta`, `marketplace-reversa` (são wrappers finos sobre o `_shared/marketplace.ts` reescrito — herdam as melhorias automaticamente).

Aprovar para implementar.
