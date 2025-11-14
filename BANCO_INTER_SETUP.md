# Configuração da Integração PIX com Banco Inter

## ✅ Já Configurado

- ✅ Client ID
- ✅ Client Secret
- ✅ Tabela `recargas_pix` criada
- ✅ Edge Functions criadas
- ✅ Webhook configurado
- ✅ Interface de recarga atualizada

## 📋 Próximos Passos - Quando Tiver Acesso

### 1. Obter Certificados no Banco Inter

Acesse o painel do Banco Inter:
1. Entre no dashboard da API do Banco Inter
2. Vá em **API → Certificados**
3. Baixe o certificado (você receberá dois arquivos):
   - `certificado.crt` (certificado público)
   - `certificado.key` (chave privada)

### 2. Obter Chave PIX

No painel do Banco Inter:
1. Vá em **PIX → Minhas Chaves**
2. Copie a chave cadastrada (pode ser email, telefone, CPF/CNPJ ou chave aleatória)

### 3. Adicionar Secrets no Lovable Cloud

Quando tiver os certificados e a chave PIX, adicione os seguintes secrets:

```
BANCO_INTER_CERT_KEY     = [conteúdo do arquivo certificado.key]
BANCO_INTER_CERT_CRT     = [conteúdo do arquivo certificado.crt]
BANCO_INTER_CHAVE_PIX    = [sua chave PIX cadastrada]
```

### 4. Atualizar a Edge Function

Após adicionar os secrets, será necessário:

1. Descomentar o código de autenticação OAuth2 na função `banco-inter-create-charge/index.ts`
2. Configurar mTLS usando os certificados
3. Testar a integração com uma cobrança real

## 🔧 Estrutura Atual

### Tabelas
- `recargas_pix`: Armazena as recargas PIX
- `transacoes_credito`: Atualizada com campo `cobrada`

### Edge Functions
- `banco-inter-create-charge`: Cria cobranças PIX
- `banco-inter-webhook`: Recebe confirmações de pagamento

### Fluxo Implementado

1. **Usuário solicita recarga**
   - Informa o valor desejado
   - Clica em "Gerar PIX"

2. **Sistema gera cobrança**
   - Edge function cria cobrança no Banco Inter
   - Retorna QR Code e código Pix Copia e Cola
   - Salva recarga com status `pendente_pagamento`

3. **Usuário paga**
   - Escaneia QR Code ou cola o código no app do banco
   - Confirma pagamento

4. **Webhook confirma pagamento**
   - Banco Inter envia notificação
   - Sistema atualiza recarga para `pago`
   - Adiciona créditos automaticamente via função `registrar_recarga`

5. **Consumo de créditos**
   - Função `verificar_e_cobrar_etiqueta` cobra etiquetas não pré-postadas
   - Garante que cada etiqueta seja cobrada apenas uma vez

## 🔐 Segurança

- ✅ RLS habilitado em todas as tabelas
- ✅ Clientes só veem suas próprias recargas
- ✅ Webhook público (verify_jwt = false)
- ✅ Função de cobrança protegida (verify_jwt = true)
- ✅ Validação de saldo antes de consumo

## 📊 Monitoramento

### URL do Webhook
```
https://xikvfybxthvqhpjbrszp.supabase.co/functions/v1/banco-inter-webhook
```

Configure esta URL no painel do Banco Inter para receber notificações de pagamento.

### Verificar Logs
- Use as ferramentas de debug do Lovable Cloud
- Monitore a tabela `recargas_pix` para status das recargas
- Acompanhe `transacoes_credito` para histórico de consumo

## ⚠️ Modo de Simulação Atual

Atualmente, a integração está em **modo de simulação** porque faltam os certificados.

O que funciona:
- ✅ Interface de recarga
- ✅ Geração de txid
- ✅ Código PIX simulado
- ✅ QR Code (via serviço externo)
- ✅ Webhook de confirmação
- ✅ Adição de créditos

O que **NÃO** funciona sem certificados:
- ❌ Comunicação real com API do Banco Inter
- ❌ Cobranças reais PIX
- ❌ Valores realmente cobrados

## 📝 Checklist de Ativação

Quando tiver todos os dados:

- [ ] Adicionar `BANCO_INTER_CERT_KEY` nas secrets
- [ ] Adicionar `BANCO_INTER_CERT_CRT` nas secrets  
- [ ] Adicionar `BANCO_INTER_CHAVE_PIX` nas secrets
- [ ] Descomentar código OAuth2 na função de cobrança
- [ ] Configurar mTLS com os certificados
- [ ] Configurar URL do webhook no Banco Inter
- [ ] Testar com cobrança real de valor baixo (R$ 1,00)
- [ ] Validar recebimento do webhook
- [ ] Confirmar adição automática de créditos
- [ ] Testar consumo de créditos por etiqueta

## 🆘 Suporte

Documentação oficial: https://developers.inter.co/

Em caso de dúvidas sobre a integração, consulte a documentação da API do Banco Inter.
