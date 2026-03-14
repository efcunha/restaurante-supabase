# Phase 9 — Web Dashboard Transformation

## Objetivo
Transformar o `restaurante-web` de uma interface com barra inferior para um **layout SaaS profissional** com sidebar fixa, KPIs em grade, tabelas avançadas e tela de delivery em 2 colunas.

## Waves Executadas

---

### Wave 1 — Sidebar Shell (`p9-sidebar-tabbar` + `p9-web-appjs-shell`)

**Arquivos modificados:**
- `restaurante-web/src/components/WebSidebarTabBar.tsx` *(criado)*
- `restaurante-web/App.js` *(reescrito)*

**Mudanças:**
- Criado componente `WebSidebarTabBar` como custom `tabBar` prop do `Tab.Navigator`
- Sidebar posicionada absolutamente à esquerda com largura 270px (`SIDEBAR_WIDTH`)
- Inclui: cabeçalho com marca (ícone `restaurant` + texto "Restaurante"), chip com nome/email do usuário logado, itens de navegação com ícone + label + destaque de ativo, rodapé fixo com texto "PDV Web"
- `App.js` reescrito para usar `WebSidebarTabBar` + `sceneContainerStyle={{ marginLeft: 270 }}` que desloca todo o conteúdo para a direita da sidebar
- Todas as screens role-gated preservadas sem alteração

---

### Wave 2 — AdminScreen KPI Grid (`p9-admin-kpi-grid`)

**Arquivo modificado:**
- `restaurante-web/src/components/AdminStatsCards.tsx` *(reescrito)*
- `restaurante-web/src/screens/AdminScreen.tsx` *(removida prop `styles`)*

**Mudanças:**
- Componente `AdminStatsCards` completamente reescrito como **autocontido** — não depende mais da prop `styles` do pai
- Sub-componente `KpiCard`: ícone colorido com fundo circular, label muted, valor grande e bold
- **Bloco Operacional**: 3 KPI cards (Pedidos, Itens vendidos, Tempo médio) com ícone Ionicons + cor semântica
- **Bloco Vendas**: chips de período (Hoje / Semana / Mês), 3 KPI cards (Total Vendido, Pedidos, Ticket Médio)
- **Bloco Cancelamentos** (condicional): aparece somente quando `vendasStats.qtdCanceladas > 0`, com cards Total Cancelado, Comandas, Taxa %
- Botão de refresh individual em cada bloco
- Tokens do design system (`colorSystem`, `typography`, `spacing`, `radius`)
- `AdminScreen.tsx`: removida a prop `styles={styles}` na chamada de `<AdminStatsCards />`

---

### Wave 3 — Table Enhancements (`p9-table-enhancements`)

**Arquivo modificado:**
- `restaurante-web/src/components/ui-next/Table.tsx` *(reescrito)*

**Novas props:**
| Prop | Tipo | Descrição |
|------|------|-----------|
| `loading` | `boolean` | Exibe `ActivityIndicator` centralizado em vez das linhas |
| `sortable` | `boolean` | Ativa ordenação em todas as colunas |
| `onSort` | `(key, dir) => void` | Callback chamado ao clicar em cabeçalho ordenável |
| `TableColumn.sortable` | `boolean` | Ativa ordenação coluna a coluna |

**Novos comportamentos:**
- Cabeçalhos com `TouchableOpacity` quando ordenável; ícones `swap-vertical` / `chevron-up` / `chevron-down`
- Estado vazio: ícone `document-outline` + texto `emptyLabel`
- Estado loading: `ActivityIndicator` + "Carregando..."
- Linhas zebradas (fundo alternado `#FAFBFE` nas linhas pares)
- `ScrollView` horizontal removido — scroll horizontal agora é responsabilidade do componente pai quando necessário
- Compatibilidade retroativa total (nenhuma prop existente alterada)

---

### Wave 4 — DeliveryScreen 2 Colunas (`p9-delivery-two-col`)

**Arquivo modificado:**
- `restaurante-web/src/screens/DeliveryScreen.tsx`

**Mudanças:**
- Layout principal alterado de coluna única para **2 colunas** (`flexDirection: 'row'`)
- **Painel esquerdo** (width: 380px): `ScrollView` com `HeaderDeliveryComponent` (formulário do cliente: nome, telefone, CEP, endereço, taxa, forma de pagamento) + `FooterComponent` (lista de itens selecionados com botão remover)
- **Painel direito** (flex: 1): campo de busca + `SectionList` do cardápio (sem `ListHeaderComponent`/`ListFooterComponent`)
- `ListHeaderComponent` e `ListFooterComponent` removidos do SectionList — agora renderizados diretamente no painel esquerdo
- **Footer sticky** mantido full-width abaixo dos 2 painéis (total + botão "Confirmar Delivery")
- `ScrollView` adicionado aos imports do React Native
- Novos estilos: `twoColLayout`, `leftPanel`, `leftPanelContent`, `rightPanel`

---

## Resultados

| Métrica | Antes | Depois |
|---------|-------|--------|
| Navegação web | Bottom tab bar | Sidebar SaaS 270px |
| AdminStatsCards | Props acopladas ao pai | Autocontido com design system |
| Table component | Sem sort/loading/empty | Sort, loading e estados vazios |
| DeliveryScreen | Layout único vertical | 2 colunas (form + cardápio) |
| Diagnósticos TypeScript | 0 erros | 0 erros |

## Arquivos Criados / Modificados

| Arquivo | Ação |
|---------|------|
| `restaurante-web/src/components/WebSidebarTabBar.tsx` | ✅ Criado |
| `restaurante-web/App.js` | ✅ Reescrito |
| `restaurante-web/src/components/AdminStatsCards.tsx` | ✅ Reescrito |
| `restaurante-web/src/screens/AdminScreen.tsx` | 🔧 Removida prop `styles` |
| `restaurante-web/src/components/ui-next/Table.tsx` | ✅ Reescrito |
| `restaurante-web/src/screens/DeliveryScreen.tsx` | 🔧 Layout 2 colunas |
