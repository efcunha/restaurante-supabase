# Phase 5 - Design System Creation

Date: 2026-03-13
Scope: restaurante-app + restaurante-web
Status: Implemented and documented

## Goal
Create a scalable, reusable, and cross-platform design system to unify visual language and interaction patterns between mobile and web.

## 1) Color System (implemented)

Core tokens:
- Primary: #0E7490
- Secondary: #0F172A
- Accent: #F97316
- Background: #F4F6FB
- Surface: #FFFFFF
- Success: #16A34A
- Warning: #D97706
- Error: #DC2626

Accessibility semantic text tokens:
- accentText: #B45309
- warningText: #92400E
- onPrimary: #FFFFFF
- onSecondary: #FFFFFF
- onAccent: #0B1220

Usage guardrails:
- textOnLightAllowed: primary, secondary, accentText, warningText, text, textMuted
- textOnLightDisallowed: accent, warning
- textOnLightMinimumRatio: 4.5

## 2) Typography (implemented)

- Heading XL: 34 / 40 / 800
- Heading L: 28 / 34 / 800
- Heading M: 22 / 28 / 700
- Body: 16 / 24 / 400
- Small: 13 / 18 / 500
- Button: 15 / 18 / 700

## 3) Spacing Scale (implemented)

- 4, 8, 12, 16, 24, 32, 48, 64

Token keys:
- s4, s8, s12, s16, s24, s32, s48, s64

## 4) Border Radius (implemented)

- Small: 8
- Medium: 12
- Large: 18
- Extra Large: 26

## 5) Shadow Levels (implemented)

- low
- medium
- high
- floating

Platform-aware shadow mapping is defined for iOS, Android, and Web.

## 6) Cross-project implementation status

Implemented in both projects:
- src/design-system/tokens.ts
- src/design-system/index.ts

Legacy bridge applied in both projects:
- src/theme/colors.ts now maps to design-system color tokens.

This preserves backward compatibility for legacy imports while enforcing a single visual source of truth.

## 7) Enforcement and migration model

Current model:
- New UI must consume `colorSystem`, `typography`, `spacing`, `radius`, `shadows`.
- Legacy screens importing `colors` now automatically inherit the new system semantics.

Recommended enforcement next:
1. Add lint guard for forbidden hardcoded color values.
2. Add CI check for low-contrast text color usage.
3. Migrate high-density screens first (NovoPedido, Delivery, Pagamento, Admin, GerenciarCardapio).

## 8) Phase 5 completion checklist

- Color system defined
- Typography scale defined
- Spacing scale defined
- Radius scale defined
- Shadow levels defined
- Accessibility usage rules defined
- Legacy bridge wired for app and web
