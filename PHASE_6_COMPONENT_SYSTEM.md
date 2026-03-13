# Phase 6 - Component System

Date: 2026-03-13
Scope: restaurante-app + restaurante-web
Status: Implemented

## Objective
Design and implement a reusable component architecture where all primitives follow the Design System tokens.

## Implemented component set

Already existing (kept and integrated):
- Button
- Card
- ProductCard
- RestaurantCard
- Navbar
- Sidebar
- FormInput
- Table

Implemented in this phase:
- Input
- Select
- Checkbox
- Badge
- Tag
- Avatar
- ListItem
- Modal
- Drawer
- BottomSheet
- Tabs
- Pagination
- Toast

## Paths

App library:
- restaurante-app/src/components/ui-next

Web library:
- restaurante-web/src/components/ui-next

Exports updated:
- restaurante-app/src/components/ui-next/index.ts
- restaurante-web/src/components/ui-next/index.ts

## Architectural conventions

1. Token-first styling
- Components consume colorSystem, typography, spacing, radius, shadows.

2. Variant-driven APIs
- Explicit variant and size props where relevant.

3. Cross-platform compatibility
- Components are React Native-first and portable to Expo web.

4. Accessibility baseline
- Checkbox uses accessibilityRole/state.
- Action components keep minimum touch-friendly dimensions.

## Contract summary by component

- Button: variant, size, loading, disabled, fullWidth.
- Input: native text input wrapper with hasError support.
- Select: simple controlled option selector.
- Checkbox: controlled checked state with label.
- Card: content container with elevation levels.
- ProductCard/RestaurantCard: domain cards for ordering/discovery.
- Badge/Tag: compact semantic markers and filters.
- Avatar: initials-based identity marker.
- ListItem: standardized list row with slots.
- Modal: centered overlay container.
- Drawer: left/right side panel overlay.
- BottomSheet: bottom anchored panel overlay.
- Navbar/Sidebar: layout navigation primitives.
- Tabs: segmented navigation filter.
- Table: horizontal-safe tabular data renderer.
- Pagination: previous/next controlled page selector.
- Toast: inline semantic feedback block.

## Migration guidance

1. Replace ad-hoc controls with ui-next primitives in high-density screens first.
2. Keep legacy components during transition; migrate per feature slice.
3. Prefer composition (ListItem + Badge + Avatar) instead of custom rows.
4. Use Modal/Drawer/BottomSheet wrappers to normalize overlays and spacing.

## Phase 6 completion checklist

- Reusable component architecture defined
- Required component inventory implemented
- Components aligned to design-system tokens
- Export indexes updated
- App and web component parity maintained
