# 08 - Runbook de recuperacao do bridge (bloqueio T0)

Ultima atualizacao: **2026-04-14**

## 1. Objetivo

Desbloquear rapidamente o T0 da homologacao `INT_REAL` quando o preflight indicar bridge indisponivel (`status_http=000` ou diferente de `200`).

## 2. Sintoma de bloqueio

Sinais comuns:

1. `scripts/preflight-int-real-balanca-tef.sh` retorna `overall_preflight_ok=false`.
2. `bridge.status_http=000`.
3. Falha de conexao em `http://localhost:3031/status`.

Observacao importante deste repositorio:

- O codigo executavel do processo `balanca-bridge` nao esta versionado neste monorepo (ha documentacao e clientes app/web, mas nao um entrypoint local do servidor bridge).
- Se o host nao tiver um servico externo do bridge instalado/rodando, o T0 permanecera bloqueado.

## 3. Diagnostico rapido (1 comando)

```bash
cd d:/restaurante-supabase
SCALE_URL="http://localhost:3031" bash scripts/check-balanca-bridge.sh
```

Com API key no bridge:

```bash
cd d:/restaurante-supabase
SCALE_URL="http://SEU_HOST_BRIDGE:3031" API_KEY="SUA_API_KEY" bash scripts/check-balanca-bridge.sh
```

## 4. Fluxo de recuperacao

1. Confirmar URL correta do bridge no host do caixa (`SCALE_URL`).
2. Validar se o processo local do bridge esta em execucao.
	- Em Windows, confirme que existe processo ouvindo `localhost:3031`.
3. Se nao existir processo, provisionar o bridge do monorepo no host:

```powershell
cd d:/restaurante-supabase/balanca-bridge
copy .env.example .env
# ajustar BALANCA_PORT, BALANCA_BAUD e BALANCA_PROTO no .env
npm install
npm start
```

Opcional como servico:

```powershell
npm install -g pm2
cd d:/restaurante-supabase/balanca-bridge
pm2 start index.js --name balanca-bridge
pm2 save
```

bash scripts/preflight-int-real-balanca-tef.sh
```

6. Se `overall_preflight_ok=true`, liberar inicio do T1.

## 5. Criterio de desbloqueio

Liberar T1 somente quando:

1. `bridge.status_http=200`;
2. `serial_aberta=true` (quando aplicavel ao equipamento conectado);
3. `ops.healthz_http=200` e `ops.api_status_http=200`.

## 6. Escalonamento

Escalar para suporte de infraestrutura/hardware quando:

1. bridge nao sobe apos tentativas de restart;
2. `/status` responde sem `serial_aberta` consistente;
3. porta/baud/protocolo divergentes do equipamento homologado.

## 7. Evidencia minima de recuperacao

1. output do `check-balanca-bridge.sh`;
2. artefatos `preflight-int-real-balanca-tef-*.json/md` apos recuperacao;
3. atualizacao do checklist de turno (`T0`) com status desbloqueado.