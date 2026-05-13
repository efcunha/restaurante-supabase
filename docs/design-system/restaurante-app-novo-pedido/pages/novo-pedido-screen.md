# Novo Pedido Screen Page Overrides

> **PROJECT:** Restaurante App Novo Pedido
> **Generated:** 2026-03-18 17:13:35
> **Page Type:** General

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`docs/design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **App Layout:** mobile-first com foco em operacao de 1 mao
- **Primary Flow Sections:** 1) Identificacao do pedido (mesa/balcao/comanda), 2) Busca e filtros de produtos, 3) Lista de itens adicionados, 4) Observacoes, 5) Acao de avancar para pagamento
- **Sticky Areas:** barra inferior do carrinho sempre visivel com quantidade + total + CTA
- **Navigation Rule:** evitar passos escondidos; estado atual do pedido deve estar sempre claro

### Spacing Overrides

- **Product Grid/List:** espacamento compacto para densidade alta sem perder toque
- **Row Touch Targets:** minimo de 44px de altura em itens clicaveis
- **Cart Footer:** padding amplo para evitar toque acidental em CTA

### Typography Overrides

- **Preco e Quantidade:** destaque de peso para leitura rapida durante operacao
- **Nome de Produto:** truncar em 2 linhas com fallback claro
- **Observacoes do Pedido:** manter legivel e sem competir com preco/acoes

### Color Overrides

- **Operational Status Strategy:**
- **Item adicionado:** feedback positivo imediato
- **Item sem estoque/indisponivel:** erro de alto contraste
- **Pedido com pendencias:** alerta de atencao antes de avancar
- **CTA pronto para avancar:** estado visual primario consistente

### Component Overrides

- Usar card/list item de produto com acao primaria explicita (adicionar)
- Usar controle de quantidade inline para reduzir navegações extras
- Usar resumo de carrinho persistente com total atualizado em tempo real
- Evitar abrir modais para tarefas frequentes de operacao de balcao

---

## Page-Specific Components

- **NewOrderHeaderForm:** contexto da venda (mesa/balcao/comanda)
- **ProductFilterBar:** busca, categoria e filtros rapidos
- **ProductCardCompact:** nome, preco, disponibilidade, acao adicionar
- **SelectedItemsList:** itens do pedido com edicao rapida de quantidade
- **NewOrderCartFooter:** total + CTA de continuidade para pagamento

---

## Recommendations

- Priorizar velocidade operacional (menos toques para fechar pedido)
- Preservar contexto do operador durante busca e adicao de itens
- Garantir feedback imediato ao adicionar/remover/editar quantidade
- Manter CTA de avancar sempre acessivel no fluxo
- Validar usabilidade em 360x800, 390x844 e tablet
