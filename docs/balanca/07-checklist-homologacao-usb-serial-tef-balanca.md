# 07 - Checklist de homologacao USB/Serial (TEF + balanca)

Ultima atualizacao: **2026-04-13**

## 1. Objetivo

Padronizar a homologacao operacional de:

- balanca serial/USB (via bridge HTTP), incluindo validacao de porta, baud e protocolo;
- fluxo de pagamento presencial (TEF integrado) via `restaurante-ops`.

Este documento e uma execucao pratica e complementar a:

- `docs/balanca/03-contratos-api-bridge.md`
- `docs/maquininha/06-matriz-homologacao-tef-balanca.md`

## 2. Escopo e limites

Coberto:

- validacao de balanca via endpoints do bridge (`/status`, `/peso`, `/peso/estavel`, `/tara`);
- validacao de TEF por API (`/payments/initiate`, `/payments/{id}/status`);
- evidencia minima para aceite em producao controlada.

Nao coberto:

- implementacao interna do processo local de serial (driver/daemon do bridge);
- ajuste eletrico/fisico de hardware (cabo, aterramento, fonte), exceto checklist basico.

## 3. Pre-check obrigatorio

Antes de iniciar os testes:

1. Confirmar feature flags do tenant alvo:
   - `EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT=true`
   - `EXPO_PUBLIC_FEATURE_PDV_SCALE=true` (ou equivalente usado no ambiente)
2. Confirmar endpoints:
   - `EXPO_PUBLIC_SCALE_BRIDGE_URL` valido e acessivel
   - `EXPO_PUBLIC_OPS_BASE_URL` valido e acessivel
3. Confirmar autenticacao:
   - token de acesso ativo (sem expor em evidencias)
4. Confirmar ambiente operacional:
   - bridge ativo
   - balanca conectada na porta esperada

## 4. Comandos de execucao - Bash

```bash
# 1) Variaveis
SCALE_URL="http://SEU_HOST_BRIDGE:3031"
OPS_URL="https://ops.restaurante-web.app.br"
API_KEY="SUA_API_KEY_OPCIONAL"
AUTH_TOKEN="SEU_BEARER_TOKEN"
COMPANY_ID="UUID_DA_EMPRESA"

# 2) Balança - status e leitura
curl -sS -H "x-api-key: $API_KEY" "$SCALE_URL/status"
curl -sS -H "x-api-key: $API_KEY" "$SCALE_URL/peso"
curl -sS -H "x-api-key: $API_KEY" "$SCALE_URL/peso/estavel"
curl -sS -X POST -H "x-api-key: $API_KEY" "$SCALE_URL/tara"

# 3) TEF - iniciacao
IDEMP_KEY="tef-$(date +%s)-001"
curl -sS -X POST "$OPS_URL/payments/initiate" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"companyId\":\"$COMPANY_ID\",\"comandaNumber\":\"10\",\"amount\":1000,\"paymentMethod\":\"cartao_credito\",\"idempotencyKey\":\"$IDEMP_KEY\"}"

# 4) TEF - idempotencia (repetir com mesma chave)
curl -sS -X POST "$OPS_URL/payments/initiate" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"companyId\":\"$COMPANY_ID\",\"comandaNumber\":\"10\",\"amount\":1000,\"paymentMethod\":\"cartao_credito\",\"idempotencyKey\":\"$IDEMP_KEY\"}"

# 5) TEF - status (substituir TX_ID)
TX_ID="COLE_AQUI_O_TRANSACTION_ID"
curl -sS "$OPS_URL/payments/$TX_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## 5. Comandos de execucao - PowerShell

```powershell
$ScaleUrl = "http://SEU_HOST_BRIDGE:3031"
$OpsUrl = "https://ops.restaurante-web.app.br"
$ApiKey = "SUA_API_KEY_OPCIONAL"
$AuthToken = "SEU_BEARER_TOKEN"
$CompanyId = "UUID_DA_EMPRESA"

# Balança
Invoke-RestMethod -Uri "$ScaleUrl/status" -Headers @{ "x-api-key" = $ApiKey }
Invoke-RestMethod -Uri "$ScaleUrl/peso" -Headers @{ "x-api-key" = $ApiKey }
Invoke-RestMethod -Uri "$ScaleUrl/peso/estavel" -Headers @{ "x-api-key" = $ApiKey }
Invoke-RestMethod -Method Post -Uri "$ScaleUrl/tara" -Headers @{ "x-api-key" = $ApiKey }

# TEF - iniciacao
$IdempKey = "tef-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())-001"
$Body = @{
  companyId = $CompanyId
  comandaNumber = "10"
  amount = 1000
  paymentMethod = "cartao_credito"
  idempotencyKey = $IdempKey
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$OpsUrl/payments/initiate" -Headers @{ Authorization = "Bearer $AuthToken"; "Content-Type" = "application/json" } -Body $Body

# Repetir para idempotencia com mesmo $Body
Invoke-RestMethod -Method Post -Uri "$OpsUrl/payments/initiate" -Headers @{ Authorization = "Bearer $AuthToken"; "Content-Type" = "application/json" } -Body $Body
```

## 6. Critérios de aceite

### 6.1 Balança (bridge)

1. `GET /status` retorna:
   - `serial_aberta=true`
   - `porta` preenchida
   - `baud` coerente com configuracao do equipamento (2400 ou 9600)
   - `protocolo` definido (`PRT1`, `PRT2` ou `PRT3`)
2. `GET /peso` e `GET /peso/estavel` retornam peso coerente em cenario estavel/instavel.
3. `POST /tara` confirma comando e afeta leitura subsequente.

### 6.2 TEF (pagamento presencial)

1. Iniciacao retorna `processing` (ou estado equivalente do fluxo atual).
2. Repeticao com mesma `idempotencyKey` retorna mesma transacao.
3. Consulta de status finaliza em `approved`, `declined` ou `timeout` sem falso sucesso.

### 6.3 Parametros seriais fisicos (obrigatorio validar no host do bridge)

- Data bits: `8`
- Stop bits: `1`
- Paridade: `none`
- Baud: conforme modelo/firmware (tipicamente `2400` ou `9600`)

## 7. Matriz de evidencias (preenchimento)

| Data/hora | Ambiente | Empresa (company_id) | Modelo balanca | Porta | Baud | Protocolo | Serial aberta | Leitura estavel OK | Tara OK | TEF init status | TEF idempotencia OK | TEF status final | Resultado | Observacoes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 8. Mapa rapido por fabricante (referencia)

| Fabricante/modelo | Protocolo mais comum | Baud mais comum | Observacao operacional |
| --- | --- | --- | --- |
| Toledo Prix | PRT2 | 9600 | Leitura continua frequente |
| Filizola | PRT1/PRT3 | 2400/9600 | Requisicao pode ser necessaria |
| Urano | PRT3 (varia por firmware) | 2400/9600 | Validar parser por frame real |
| Elgin | PRT2 (cenarios comuns) | 9600 | Confirmar protocolo no host |

## 9. Politica de evidencia segura

1. Nunca anexar token bruto, API key ou PII.
2. Sanear payloads antes de publicar em docs/PR.
3. Guardar apenas IDs operacionais necessarios para rastreio tecnico.

## 10. Go/No-Go operacional

Go:

- checklist dos itens 6.1 e 6.2 aprovado;
- matriz de evidencias preenchida;
- sem erro bloqueante de bridge, sem divergencia de baud/protocolo.

No-Go:

- `serial_aberta=false` recorrente;
- protocolo/baud divergente do equipamento;
- idempotencia TEF falhando ou status final inconsistente.

## 11. Runner automatizado (recomendado)

Para coletar evidencias em 1 comando:

### 11.1 Bash (Git Bash/Linux/macOS)

```bash
cd d:/restaurante-supabase

SCALE_URL="http://SEU_HOST_BRIDGE:3031" \
API_KEY="SUA_API_KEY_OPCIONAL" \
OPS_URL="https://ops.restaurante-web.app.br" \
AUTH_TOKEN="SEU_BEARER_TOKEN" \
COMPANY_ID="UUID_DA_EMPRESA" \
bash scripts/capture-usb-serial-tef-balanca.sh
```

### 11.2 PowerShell

```powershell
cd d:/restaurante-supabase

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-usb-serial-tef-balanca.ps1 \
   -ScaleUrl "http://SEU_HOST_BRIDGE:3031" \
   -ApiKey "SUA_API_KEY_OPCIONAL" \
   -OpsUrl "https://ops.restaurante-web.app.br" \
   -AuthToken "SEU_BEARER_TOKEN" \
   -CompanyId "UUID_DA_EMPRESA"
```

Saida padrao:

- pasta: `tmp/evidencias/`
- artefatos: `bridge-*.json`, `tef-*.json`, `homologacao-usb-serial-tef-balanca-*.json`, `homologacao-usb-serial-tef-balanca-*.md`

### 11.3 Launchers interativos (sem expor secrets no comando)

```bash
cd d:/restaurante-supabase
bash scripts/run-homologacao-usb-serial-tef-balanca-interactive.sh
```

```powershell
cd d:/restaurante-supabase
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-homologacao-usb-serial-tef-balanca-interactive.ps1
```