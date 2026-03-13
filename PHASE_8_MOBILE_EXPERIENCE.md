# Phase 8 — Mobile Experience Transformation

Date: 2026-03-13
Scope: restaurante-app
Status: Complete

## Objective

Elevate the mobile app experience across five dimensions:
1. Navigation clarity — reduce tab overload for multi-role operators
2. Product discovery — faster category navigation in order creation
3. Cart feedback — compact, glanceable cart state with expand on demand
4. Checkout progression — visual step clarity in the payment flow
5. Thumb ergonomics — minimum 44dp touch targets on high-frequency actions

## Changes by Wave

### Wave 1 — Navigation Shell

**Files changed:**
- `App.js`
- `src/auth/roles.js`
- `src/screens/OverflowMenuScreen.tsx` (new)

**Before:** ADMIN/GERENTE saw 9 tabs in the bottom bar — navigation overload during rush hours.

**After:** Max 5 primary tabs per role. Secondary destinations accessible via "Mais" tab.

| Role | Primary tabs | Via "Mais" |
|------|-------------|------------|
| ADMIN/GERENTE | Novo Pedido, Mapa, Comandas, Cozinha, Mais | Montagem, Entrega Salão, Rotas Delivery, Reservas, Admin |
| GARCOM | Novo Pedido, Mapa, Comandas, Mais | Entrega Salão, Reservas |
| COZINHEIRO | Cozinha | — |
| MONTAGEM | Montagem, Prontos | — |
| ENTREGADOR | Rotas Delivery | — |

**Architecture:** `MaisStackScreen` (NativeStack) with `OverflowMenuScreen` as the root screen + secondary screens as stack screens. Navigation is `navigation.navigate(screenName)`.

**roles.js additions:**
- `RoleOverflowScreens`: maps each role to its overflow screen list
- `getRoleOverflowScreens(role)`: helper function
- `RoleScreens` updated to max 5 per role (with "Mais" added for applicable roles)

---

### Wave 2a — NovoPedidoScreen: Category Chips Bar

**File:** `src/screens/NovoPedidoScreen.tsx`

**Before:** SectionList with 8+ sections; no way to jump to a category without scrolling.

**After:** Horizontal ScrollView of category chips above the SectionList.

**Implementation details:**
- `sectionListRef = useRef<SectionList>()` connected to SectionList
- `activeChipIndex` state updated via `onViewableItemsChanged` (stable ref, reads from `filteredSectionsRef` to avoid stale closure)
- Chip press calls `sectionListRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0 })`
- Chips hidden when `filteredSections.length === 0`
- Chips update in real-time as search filters sections

---

### Wave 2b — NovoPedidoScreen: Cart Badge + Expand/Collapse

**File:** `src/screens/NovoPedidoScreen.tsx`

**Before:** Sticky footer showed total + CTA with no cart feedback.

**After:**
- Cart icon with badge showing item count
- Row with total + expand/collapse chevron toggle
- Collapsed: compact 1-row summary
- Expanded: `ScrollView` (maxHeight 180) showing all items with remove buttons
- Auto-collapses when last item is removed

---

### Wave 3a — PagamentoScreen: Step Indicator

**File:** `src/screens/PagamentoScreen.tsx`

**Before:** Single-screen with no visual progression cue.

**After:** `StepIndicator` component above the ScrollView showing:
- **Resumo** → **Pagamento** → **Confirmado**
- Active step auto-calculated from `saldo` state
- Completed steps show green checkmark
- Active step highlighted in primary color

---

### Wave 3b — Thumb Ergonomics

**Files:** `src/screens/NovoPedidoScreen.tsx`, `src/screens/PagamentoScreen.tsx`

| Element | Before | After |
|---------|--------|-------|
| `quantityBtn` (NovoPedido) | 32×32dp | 44×44dp |
| `roundBtn` (NovoPedido) | 32×32dp | 44×44dp |
| `removeBtn` (cart items) | 28×28dp | 44×44dp |
| `formaBtn` (Pagamento) | no minHeight | minHeight 48dp |

---

## Safety constraints followed

- No business logic changes (order creation, payment submission, comanda management)
- No Supabase query or subscription changes
- No navigation behavior changes for single-role users (COZINHEIRO, MONTAGEM, ENTREGADOR)
- TypeScript diagnostics: 0 errors in all modified files

## Validation

All changed files pass TypeScript/ESLint diagnostics (0 errors).
