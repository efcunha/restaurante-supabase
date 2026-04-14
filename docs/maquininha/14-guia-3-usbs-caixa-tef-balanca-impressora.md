# 14 - Guia operacional: 3 USBs no caixa (TEF + balanca + impressora)

Ultima atualizacao: **2026-04-13**

## 1. Objetivo

Explicar de forma direta como operar um caixa com:

1. maquininha/pinpad TEF na USB;
2. balanca serial/USB;
3. impressora termica USB.

E evitar o erro comum de depender apenas de `COM3/COM4` para identificar equipamentos.

## 2. Conceito-chave

Existem dois modelos de TEF:

1. **TEF local (USB/serial no PC)**
   - a maquininha fica conectada fisicamente no computador;
   - um servico local conversa com o pinpad;
   - o PDV inicia pagamento nesse servico local.

2. **TEF por API (backend/gateway)**
   - o frontend chama endpoint de pagamento;
   - o controle do terminal pode estar em camada externa;
   - o frontend nao abre porta serial diretamente.

### Estado atual no projeto

1. balanca: padrao via bridge local (serial/USB);
2. TEF: padrao via API do `restaurante-ops`;
3. impressora: web via WebUSB e mobile via biblioteca de impressao.

## 3. Regra de ouro para mapeamento de hardware

Nao mapear por porta apenas (`COMx`).

Mapear por assinatura do dispositivo:

- `vendorId`
- `productId`
- `serialNumber` (quando existir)

E salvar o papel logico:

- `device_role=tef_terminal`
- `device_role=scale`
- `device_role=receipt_printer`

## 4. Fluxo recomendado de cadastro inicial (1 vez por caixa)

1. Conectar apenas a balanca e registrar assinatura como `scale`.
2. Conectar apenas a impressora e registrar assinatura como `receipt_printer`.
3. TEF:
   - se for API: salvar `provider_terminal_id` e parametros operacionais;
   - se for local USB: registrar assinatura como `tef_terminal` no servico local.
4. Executar teste de ponta a ponta:
   - leitura de peso;
   - pagamento teste;
   - impressao de comprovante.

## 5. Como relacionar cada acao ao dispositivo correto

1. **Leitura de peso**
   - sempre rotear para `device_role=scale`.

2. **Pagamento TEF**
   - TEF API: rotear por `company_id + terminal_id + provider_terminal_id`.
   - TEF local USB: rotear por `device_role=tef_terminal`.

3. **Impressao de comprovante**
   - sempre rotear para `device_role=receipt_printer`.

## 6. Anti-patterns que causam falha em campo

1. Fixar `COM3` no codigo e assumir que nunca muda.
2. Compartilhar mesma identificacao para balanca e pinpad.
3. Fechar comanda antes de estado final de pagamento (`approved/declined/timeout`).
4. Tratar impressora e pinpad como se fossem o mesmo periférico USB.

## 7. Runbook rapido de troubleshooting

1. Se `COM` mudou apos reboot:
   - reidentificar pela assinatura (`vendorId/productId/serialNumber`);
   - atualizar apenas `path` atual, sem perder o papel logico.

2. Se balanca responde mas impressora nao:
   - validar autorizacao WebUSB da impressora;
   - validar se endpoint OUT foi reclamado corretamente.

3. Se TEF fica em `processing` sem finalizacao:
   - nao baixar saldo da comanda;
   - manter polling;
   - registrar evento para reconciliacao.

## 8. Check de aceite (operacao)

1. Balanca le peso estavel e tara com sucesso.
2. TEF inicia e finaliza com estado terminal consistente.
3. Comprovante imprime no dispositivo correto.
4. Nenhuma acao depende de porta fixa (`COMx`) como unica chave.

## 9. Referencias no repositorio

- `restaurante-web/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-app/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-web/src/features/pdv/services/devicePaymentService.ts`
- `restaurante-app/src/features/pdv/services/devicePaymentService.ts`
- `restaurante-web/src/services/PrinterService.ts`
- `docs/balanca/07-checklist-homologacao-usb-serial-tef-balanca.md`
