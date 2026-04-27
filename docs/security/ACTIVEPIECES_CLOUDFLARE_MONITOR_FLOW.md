# Monitoramento Cloudflare via Activepieces

Flow de agendamento periódico que verifica a integridade da zona Cloudflare
e envia alerta WhatsApp se detectar anomalias.

## Pré-requisitos

1. **Variáveis configuradas no Railway** (serviço `restaurante-ops`):
   - `CLOUDFLARE_API_TOKEN` — token com permissão de leitura (Zone:Read, Workers:Read, Audit Logs:Read)
   - `CLOUDFLARE_ACCOUNT_ID` — `4bd3ea56830a535d27f275d33cc07f62`
   - `CLOUDFLARE_ZONE_NAME` — `restaurante-web.app.br`
   - `CLOUDFLARE_ALLOWED_CNAMES` — lista separada por vírgula:
     ```
     restaurante-web.app.br=xy9xiv5i.up.railway.app,www.restaurante-web.app.br=mjaqusj2.up.railway.app,ops.restaurante-web.app.br=etb2td77.up.railway.app
     ```
   - `CLOUDFLARE_ALLOWED_WORKER_ROUTES` — deixar vazio (sem routes autorizadas atualmente)
   - `CLOUDFLARE_ALLOWED_WORKER_SCRIPTS` — deixar vazio (sem workers autorizados atualmente)
   - `CLOUDFLARE_AUDIT_LOOKBACK_HOURS` — `6` (analisa últimas 6h nos logs de auditoria)
   - `OPS_LOG_API_KEY` — já configurado; será reutilizado como auth do endpoint

2. **Endpoint disponível** após deploy do `restaurante-ops`:

   ```
   GET https://ops.restaurante-web.app.br/api/security/cloudflare-check
   Header: x-log-api-key: <valor de OPS_LOG_API_KEY>
   ```

   - Retorna HTTP 200 + `{ ok: true }` se tudo estiver limpo
   - Retorna HTTP 409 + `{ ok: false, alerts: [...] }` se houver alertas

---

## Configuração do Flow no Activepieces

### URL do Activepieces

`https://activepieces-production-4e63.up.railway.app`

### Estrutura do Flow

```
[TRIGGER: Schedule]
      ↓
[STEP 1: HTTP Request — verificar Cloudflare]
      ↓
[STEP 2: Branch — ok = false?]
      ↓ (ramo alerta)
[STEP 3: HTTP Request — enviar WhatsApp via Evolution API]
```

---

### TRIGGER — Schedule

- Tipo: **Schedule**
- Expressão cron: `0 */6 * * *` (a cada 6 horas)
- Timezone: `America/Sao_Paulo`

---

### STEP 1 — HTTP Request: verificar Cloudflare

- Nome: `check_cloudflare_integrity`
- Method: `GET`
- URL: `https://ops.restaurante-web.app.br/api/security/cloudflare-check`
- Headers:
  ```
  x-log-api-key: {{secret("OPS_LOG_API_KEY")}}
  ```
  > Crie uma **Connection** do tipo `Secret Text` no Activepieces com o valor do `OPS_LOG_API_KEY` configurado no Railway.
- Body: nenhum
- Fail on Error: **desativado** (queremos tratar 409 manualmente na branch)

---

### STEP 2 — Branch: detectar alertas

- Nome: `branch_has_alerts`
- Condição:
  ```
  {{step_1.body.ok}} is equal to false
  ```
  ou, se o endpoint retornou 4xx/5xx:
  ```
  {{step_1.status}} is not equal to 200
  ```
- Use **OR** entre as duas condições

---

### STEP 3 — HTTP Request: enviar alerta WhatsApp (ramo TRUE)

- Nome: `send_whatsapp_alert`
- Method: `POST`
- URL: `{{env.EVOLUTION_API_BASE_URL}}/message/sendText/restaurante`
  > Substitua `restaurante` pelo nome da instância Evolution configurada
- Headers:
  ```
  apikey: {{secret("EVOLUTION_API_KEY")}}
  Content-Type: application/json
  ```
- Body (JSON):
  ```json
  {
    "number": "5511999999999",
    "textMessage": {
      "text": "🚨 *ALERTA DE SEGURANÇA — Cloudflare*\n\nDetectada anomalia na zona restaurante-web.app.br em {{formatDate(now(), 'dd/MM/yyyy HH:mm')}}.\n\nAlertas:\n{{step_1.body.alerts.join('\\n')}}\n\nVerifique imediatamente o painel Cloudflare."
    }
  }
  ```
  > Substitua `5511999999999` pelo número de destino (com código do país + DDD, sem `+`)

---

## Variáveis / Connections necessárias no Activepieces

| Connection name     | Tipo        | Valor                                           |
| ------------------- | ----------- | ----------------------------------------------- |
| `OPS_LOG_API_KEY`   | Secret Text | Copiar do Railway `restaurante-ops` → Variables |
| `EVOLUTION_API_KEY` | Secret Text | Chave da instância Evolution API                |

---

## Teste manual

Após publicar o flow, use **Test Flow** no Activepieces para validar:

1. Step 1 deve retornar `{ ok: true }` (sem alertas atuais)
2. Branch deve ir para o ramo FALSE (nenhum alerta)
3. Step 3 **não** deve ser executado

Para forçar um alerta de teste (opcional):

```bash
# Na máquina local com as env vars configuradas:
CLOUDFLARE_ALLOWED_CNAMES="" pnpm run security:cloudflare:check
```

---

## Referência rápida de evidência

- Incidente anterior: Worker `worker-billowing-wood-c879` — removido em 2026-04-27
- Contenção documentada em: `docs/security/cloudflare-worker-incident-2026-04-27.md`
- Módulo de verificação: `restaurante-ops/src/modules/cloudflare-integrity.ts`
- Script local (execução manual): `scripts/security/cloudflare-integrity-check.mjs`
