# Guia de Migração: n8n → Activepieces

## Arquivos gerados

| Arquivo                               | Descrição                                          |
| ------------------------------------- | -------------------------------------------------- |
| `activepieces_pedidos_whatsapp.json`  | Flow de notificações de pedidos (salão + delivery) |
| `activepieces_reservas_whatsapp.json` | Flow de notificações de reservas/agendamentos      |

---

## ⚠️ URGENTE: Segurança

A API key da Evolution API estava **em texto puro** no backup do n8n:

```
[REDACTED_SECRET]
```

**Rotacione essa chave agora** no painel da Evolution API antes de configurar o Activepieces.

---

## Mapeamento n8n → Activepieces

| n8n Node                        | Activepieces Equivalente                                       |
| ------------------------------- | -------------------------------------------------------------- |
| `webhook`                       | PIECE_TRIGGER: `@activepieces/piece-webhook` / `catch_hook`    |
| `if`                            | BRANCH (com `onSuccessAction` / `onFailureAction`)             |
| `switch`                        | Branches aninhadas (Activepieces não tem Switch nativo)        |
| `httpRequest`                   | PIECE: `@activepieces/piece-http` / `send_http_request_action` |
| `supabase` (insert)             | HTTP request direto para Supabase REST API                     |
| Expressão `$json.body.x`        | Expressão `{{ trigger.body.x }}`                               |
| Expressão `$json.field` de step | Expressão `{{ nome_do_step.output.field }}`                    |
| `.replace(/\D/g, '')` inline    | Step de código (CODE) separado                                 |

---

## Passo a passo para importar

### 1. Instalar o Activepieces

- Cloud: [activepieces.com](https://activepieces.com)
- Self-hosted: via Docker
  ```bash
  docker run -d -p 8080:80 activepieces/activepieces
  ```

### 2. Importar os flows

1. Acesse o Activepieces → **Flows** → botão **"Import"** (ou "+" > "Import")
2. Faça upload de `activepieces_pedidos_whatsapp.json`
3. Repita para `activepieces_reservas_whatsapp.json`

### 3. Configurar a API key da Evolution API em cada flow

Substitua o placeholder `TROQUE_PELA_SUA_EVOLUTION_API_KEY` em todos os steps HTTP.

**Melhor prática:** crie uma **Connection** no Activepieces para a Evolution API (tipo: Custom HTTP Connection com header `apikey`) e referencie via `{{ connections.evolution_api.apikey }}`. Isso evita repetição e facilita rotação de credenciais.

### 4. Ativar os flows e obter as URLs de webhook

1. Salve e **habilite** cada flow
2. Clique no step do webhook (trigger) → copie a **URL gerada** pelo Activepieces

### 5. Atualizar destinos que chamavam os webhooks do n8n

#### Flow de Pedidos

O n8n recebia chamadas pelo app/backend no path:

```
POST /webhook/0d65548d-5254-441e-ba4b-d5d699a99de0
```

Localize onde no backend/app o status dos pedidos dispara esse webhook e atualize para a nova URL do Activepieces.

#### Flow de Reservas

O Supabase enviava eventos via Database Webhook para:

```
POST /webhook/supa-agendamentos
```

Atualize no painel do Supabase:

- **Database Webhooks** → edite o webhook de `reservas`/`agendamentos`
- Troque a URL de destino pela nova URL gerada pelo Activepieces

---

## Configuração pendente: Inserir Pagamento Automático

O step `http_supabase_pgto` no flow de Pedidos está **incompleto** — o backup n8n original não continha o nome da tabela nem os campos mapeados.

Você precisa editar manualmente esse step no Activepieces:

1. **URL**: troque `SUA_SUPABASE_URL/rest/v1/NOME_DA_TABELA_DE_PAGAMENTOS` pela URL real
   - Ex: `https://xyzabc.supabase.co/rest/v1/payments`
2. **Headers**: troque `SUA_SUPABASE_SERVICE_ROLE_KEY` pela sua service role key
3. **Body**: ajuste os campos do objeto `data` para os campos reais da tabela

---

## Diferenças de comportamento a verificar

### Expressões de template

- n8n: `={{ $json.body.field }}`
- Activepieces: `{{ trigger.body.field }}`

### Operador TEXT_IS_NOT_EMPTY

Se o Activepieces na sua versão não reconhecer `TEXT_IS_NOT_EMPTY`, edite o branch `branch_tem_phone` no flow de reservas e use a combinação:

- Operator: `TEXT_DOES_NOT_MATCH`
- Second value: (campo vazio)

### Novo step de código para formatação de telefone

No n8n a expressão `.replace(/\D/g, '')` era inline no template. No Activepieces, isso foi extraído para um step **Code** separado que retorna `{ formatted: "55XXXXXXXXXX" }`. Os steps HTTP subsequentes referenciam esse output via `{{ nome_do_step.output.formatted }}`.

### Formato de data (Flow de Reservas — Confirmada)

O step `fmt_phone_e` formata tanto o telefone quanto a data da reserva:

- Entrada: `data_hora` (campo `trigger.body.record.data_hora_reserva`)
- Saída: `date_formatted` (ex: `"17/03/2026, 20:00"`)
- Timezone: `America/Sao_Paulo`

---

## Checklist final

- [ ] Chave da Evolution API rotacionada
- [ ] `activepieces_pedidos_whatsapp.json` importado e habilitado
- [ ] `activepieces_reservas_whatsapp.json` importado e habilitado
- [ ] API key substituída em todos os steps HTTP de ambos os flows
- [ ] Step `http_supabase_pgto` configurado com tabela e campos corretos
- [ ] URL do webhook de Pedidos atualizada no backend/app
- [ ] URL do webhook de Reservas atualizada no Supabase Database Webhooks
- [ ] Teste end-to-end: acionar um status de pedido e verificar mensagem no WhatsApp
- [ ] Teste end-to-end: criar/confirmar/cancelar uma reserva e verificar mensagem
