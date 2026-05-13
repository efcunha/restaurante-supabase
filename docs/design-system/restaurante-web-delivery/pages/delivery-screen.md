# Delivery Screen Page Overrides

> **PROJECT:** Restaurante Web Delivery
> **Generated:** 2026-03-18 17:13:32
> **Page Type:** Checkout / Payment

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`docs/design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Desktop Layout:** 2 colunas (`minmax(340px, 1fr)` para formulario e `minmax(420px, 1.2fr)` para cardapio/resumo)
- **Mobile Layout:** 1 coluna com resumo colapsavel no rodape
- **Primary Flow Sections:** 1) Dados do cliente, 2) Endereco e referencia, 3) Forma de pagamento, 4) Itens e observacoes, 5) Resumo final com total e CTA
- **Checkout CTA:** Botao fixo no rodape mobile e no final da coluna de resumo no desktop

### Spacing Overrides

- **Form Groups:** `--space-lg` entre blocos do formulario
- **Field Rows:** `--space-sm` entre campos relacionados (ex.: numero/complemento)
- **Summary Area:** padding minimo `--space-lg` com separadores claros entre subtotal, taxa e total

### Typography Overrides

- **Field Labels:** peso 600 para leitura rapida
- **Order Total:** destaque visual com escala de heading menor (sem competir com titulo da tela)
- **Validation Messages:** tamanho de corpo reduzido com contraste AA

### Color Overrides

- **Status Strategy:**
- **Endereco invalido/incompleto:** erro com alto contraste
- **Taxa de entrega calculada:** feedback de sucesso
- **Pagamento pendente:** estado de atencao sem bloquear navegacao
- **Entrega estimada:** badge informativa de baixa carga visual

### Component Overrides

- Usar componente de endereco com validacao progressiva (nao bloquear digitacao)
- Usar resumo com recalculo em tempo real ao mudar itens/taxa/cupom
- Usar seletor de pagamento com estados claros (selecionado, indisponivel, erro)
- Evitar modais para passos obrigatorios; priorizar fluxo inline

---

## Page-Specific Components

- **DeliveryAddressBlock:** cep, logradouro, numero, complemento, referencia
- **DeliveryPaymentBlock:** dinheiro/cartao/pix com feedback de disponibilidade
- **DeliveryEtaBadge:** previsao de entrega e janela estimada
- **DeliverySummaryCard:** subtotal, taxa, desconto, total, CTA final
- **DeliveryValidationBanner:** erros bloqueantes antes do envio do pedido

---

## Recommendations

- Priorizar conclusao rapida do pedido em ate 1 rolagem no mobile
- Exibir total e CTA sempre visiveis quando teclado nao estiver aberto
- Tratar endereco e pagamento como pontos criticos com mensagens objetivas
- Garantir navegacao por teclado no web e foco visivel em todos os campos
- Validar em breakpoints: 375, 768, 1024 e 1440
