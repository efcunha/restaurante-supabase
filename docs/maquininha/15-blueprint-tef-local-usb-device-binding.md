# 15 - Blueprint: TEF local USB + device binding (caixa)

Ultima atualizacao: **2026-04-13**

## 1. Objetivo

Definir um blueprint pronto para implementacao de producao para o cenario:

- `TEF -> USB`
- `Balanca -> USB/Serial`
- `Impressora termica -> USB`

Com mapeamento estavel por papel de dispositivo, evitando dependencia de `COMx` fixa.

## 2. Escopo

Incluido neste blueprint:

1. modelo de dados para binding de dispositivos por caixa;
2. contrato API do bridge TEF local USB;
3. regras de seguranca/idempotencia/auditoria;
4. checklist de rollout.

Nao incluido nesta fase:

1. migration aplicada em producao;
2. implementacao final de backend/bridge;
3. alteracao de UX final.

## 3. Modelo de dados proposto (SQL de referencia)

> Observacao: este SQL e blueprint para implementacao. Nao foi aplicado no banco nesta etapa.

```sql
create table if not exists public.pos_device_bindings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  terminal_id text not null,
  device_role text not null check (device_role in ('tef_terminal', 'scale', 'receipt_printer')),
  vendor_id text,
  product_id text,
  serial_number text,
  device_path text,
  protocol text,
  baud integer,
  provider_terminal_id text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pos_device_bindings_unique_role
  on public.pos_device_bindings (company_id, terminal_id, device_role)
  where is_active = true;

create index if not exists idx_pos_device_bindings_fingerprint
  on public.pos_device_bindings (company_id, vendor_id, product_id, serial_number)
  where is_active = true;
```

## 4. Regras de resolucao de dispositivo

Ordem de confianca para resolver binding:

1. `vendor_id + product_id + serial_number`
2. `vendor_id + product_id + device_path`
3. fallback operacional manual com confirmacao (somente admin/gerente)

Regras:

1. Nunca usar apenas `device_path` (COMx) como chave persistente.
2. `device_role` deve ser obrigatorio por terminal.
3. Mudanca de `device_path` deve atualizar binding sem trocar identidade logica.

## 5. Contrato de bridge TEF local USB

Contrato detalhado em:

- `docs/maquininha/contracts/tef-local-bridge.openapi.yaml`

Endpoints principais:

1. `GET /tef/status`
2. `GET /tef/devices`
3. `POST /tef/bindings/resolve`
4. `POST /tef/payments/initiate`
5. `GET /tef/payments/{transactionId}/status`
6. `POST /tef/payments/{transactionId}/cancel`

## 6. Estado de pagamento e integridade

Estados canonicos:

1. `pending`
2. `processing`
3. `approved`
4. `declined`
5. `cancelled`
6. `timeout`
7. `error`

Guardrails:

1. `idempotency_key` obrigatoria em iniciacao.
2. Nao baixar saldo definitivo com status intermediario.
3. Nao permitir regressao de estado terminal.

## 7. Seguranca obrigatoria

1. Header `x-api-key` obrigatorio no bridge local quando configurado.
2. Bindings por `company_id` e `terminal_id` (sem cross-tenant).
3. Sem PII/cartao completo em log.
4. Auditoria para override/remapeamento manual.

## 8. Auditoria minima

Eventos recomendados:

1. `device.binding.created`
2. `device.binding.updated`
3. `device.binding.mismatch_detected`
4. `tef.payment.initiated`
5. `tef.payment.processing`
6. `tef.payment.approved`
7. `tef.payment.declined`
8. `tef.payment.timeout`
9. `tef.payment.cancelled`

Cada evento com:

1. `company_id`
2. `terminal_id`
3. `device_role`
4. `transaction_id` (quando existir)
5. `operator_id`
6. `timestamp`

## 9. Checklist de rollout

1. Aplicar migration real com RLS em `pos_device_bindings`.
  - Arquivo criado no repositorio: `database-backup/migrations/20260413233000_create_pos_device_bindings.sql`
2. Implementar endpoints de bridge TEF local com auth e idempotencia.
3. Implementar tela de mapeamento inicial (3 USBs) por terminal.
4. Rodar smoke test de ponta a ponta:
   - leitura de balanca
   - transacao TEF
   - impressao de comprovante
5. Ativar por canary em tenant piloto com monitoramento.

## 10. Referencias

1. `docs/balanca/03-contratos-api-bridge.md`
2. `docs/balanca/07-checklist-homologacao-usb-serial-tef-balanca.md`
3. `docs/maquininha/06-matriz-homologacao-tef-balanca.md`
4. `docs/maquininha/14-guia-3-usbs-caixa-tef-balanca-impressora.md`
