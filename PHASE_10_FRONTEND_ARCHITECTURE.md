# Phase 10 — Frontend Architecture Improvement

## Objetivo
Introduzir a estrutura proposta para separar melhor primitives de UI, layouts reutilizáveis e módulos de feature sem mover agressivamente o código legado.

## Implementação Executada

### 1. Camada `ui`
- Criado `src/ui/index.ts` em `restaurante-app` e `restaurante-web`.
- A nova camada exporta os primitives de `components/ui-next` como API estável para as telas.
- Isso reduz o acoplamento direto das screens ao caminho físico de componentes.

### 2. Camada `layouts`
- Criado `src/layouts/ScreenScaffold.tsx` em ambos os apps.
- O layout encapsula shell de tela com `Navbar`, corpo com ou sem `ScrollView` e footer opcional.
- Primeiro uso aplicado nas telas de pagamento.

### 3. Camada `features/payments`
- Criados `PaymentStepIndicator.tsx`, `PaymentComandaSummary.tsx`, `PaymentOrderSummary.tsx` e `PaymentActionPanel.tsx` em ambos os apps.
- O indicador visual de etapas, o bloco de consulta da comanda, o resumo de pedidos e o painel de ações de pagamento saíram da screen e viraram componentes de feature.
- `PagamentoScreen` agora mantém a lógica de carregamento e pagamento, mas compõe a UI principal a partir da camada `features/payments`.

### 4. Camada `features/new-order`
- Criados `NewOrderHeaderForm.tsx`, `PizzaProductCard.tsx`, `NewOrderSelectedItem.tsx`, `NewOrderListFooter.tsx` e `NewOrderCartFooter.tsx` em ambos os apps.
- `NovoPedidoScreen` passou a usar esses componentes de feature para o formulário inicial, o card de pizza, a listagem de itens selecionados e o footer fixo do carrinho.
- A tela permanece dona da orquestração e do estado, mas a UI específica do fluxo saiu do arquivo principal.

## Resultado Arquitetural

Estrutura agora presente nas duas aplicações:

```text
src/
  design-system/
  ui/
  components/
  layouts/
  features/
  hooks/
  services/
  utils/
```

## Extensão Em Delivery Web

- `restaurante-web/src/screens/DeliveryScreen.tsx` agora usa `ScreenScaffold` e a camada `ui` em vez de importar `ui-next` diretamente.
- Criada a camada `features/delivery` no web com `DeliveryOrderForm.tsx` e `DeliverySubmitFooter.tsx`.
- A lista lateral de itens selecionados do delivery passou a reutilizar `NewOrderListFooter` de `features/new-order`, reduzindo duplicação de UI.
- O app mobile não possui `DeliveryScreen.tsx` equivalente neste caminho; hoje o fluxo espelhado mais próximo é `RotasDeliveryScreen.tsx`, então esta etapa ficou restrita ao web para evitar uma abstração artificial.

## Extensão Em Admin Dashboard

- Criada a camada `features/admin` em `restaurante-app` e `restaurante-web` com `AdminActionCard.tsx` e `AdminSection.tsx`.
- `AdminScreen` em ambos os apps agora usa esses componentes de feature para montar os blocos de navegação administrativa (`FINANCEIRO`, `SISTEMA` e bloco de operação de delivery no app).
- A extração removeu duplicação de UI dos helpers locais da screen e manteve intacta a lógica de estado, modais e navegação.
- Em seguida, os wrappers de modal administrativo também foram extraídos para `features/admin/components/AdminModals.tsx` (`AdminSlideModal`, `AdminBareModal`, `AdminCaixaModal`) e aplicados nas duas `AdminScreen`.
- Isso reduz acoplamento da screen com estrutura repetida de `Modal` sem alterar comportamento dos fluxos internos.

## Convergência De Contratos De Tipagem

- Criados `types.ts` locais em `features/payments` e `features/new-order` no `restaurante-app` e no `restaurante-web`.
- Interfaces de props e tipos repetidos (como contratos de painel de pagamento, resumo de comanda, resumo de pedidos e itens selecionados) deixaram de ficar duplicados em cada componente.
- Os componentes dessas features agora importam contratos de um ponto local único por módulo, reduzindo deriva entre arquivos irmãos sem acoplamento entre app e web.

## Próxima Onda Recomendada

1. Expandir `ScreenScaffold` para as demais telas administrativas secundárias (7 telas Pattern A restantes, e depois Pattern B/C).
2. Avaliar convergência de componentes duplicados entre app e web criando wrappers compartilhados onde fizer sentido.
3. Aplicar `types.ts` para features que ganharem novos componentes extraídos.

---

## Wave 3 — Convergência Admin/Delivery Types + ScreenScaffold Adoption

### Convergência De Tipagem — Admin e Delivery

- Criados `types.ts` locais em `features/admin` no `restaurante-app` e no `restaurante-web`:
  - `AdminSectionProps`, `BaseAdminModalProps`, `AdminSlideModalProps`, `AdminCaixaModalProps`, `AdminActionCardProps`.
  - 6 componentes rewired (`AdminSection`, `AdminActionCard`, `AdminModals` × 2 apps).
- Criado `types.ts` em `features/delivery` no `restaurante-web`:
  - `DeliveryOrderFormProps`, `DeliverySubmitFooterProps`.
  - 2 componentes rewired (`DeliveryOrderForm`, `DeliverySubmitFooter`).
- Todas as interfaces inline foram removidas dos componentes e substituídas por imports do `types.ts` local.
- Zero erros de diagnóstico após rewiring.

### ScreenScaffold — Primeira Onda de Adoção (Batch 1: Pattern A)

Telas Pattern A (back + título + spacer) refatoradas para usar `ScreenScaffold`:

| Tela | Web | App |
|------|-----|-----|
| `OperationalSettingsScreen` | ✅ | ✅ |
| `FinancialConfigScreen` | ✅ | ✅ |
| `GerenciarFornecedoresScreen` | ✅ | ✅ |
| `ExtrasConfigScreen` | ✅ | ✅ |

Mudanças aplicadas em cada tela:
- Import de `Ionicons` removido (quando não usado em outras partes do componente).
- Import de `ScreenScaffold` adicionado de `../layouts/ScreenScaffold`.
- Header manual (`<View style={styles.header}>` com back button + título) substituído por `<ScreenScaffold title="..." leftAction={{...}}>`.
- Styles `container`, `header`, `headerTitle`, `backButton`/`closeBtn`/`backBtn`, `headerRight` removidos.
- Loading states integrados dentro do ScreenScaffold onde aplicável.
- `BackgroundPattern` preservado como filho do ScreenScaffold em `FinancialConfigScreen`.
- `useSafeAreaInsets` mantido no app `ExtrasConfigScreen` para o floating add button (não mais usado para header).
- Zero erros de diagnóstico em todas 8 telas refatoradas.