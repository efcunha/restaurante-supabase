# Design Token Usage Guide

Date: 2026-03-13
Scope: restaurante-app + restaurante-web

This guide defines where each semantic color should be used to avoid WCAG contrast failures.

## Text on white/surface backgrounds

| Token | Hex | Contrast on white | Normal text (AA >= 4.5) | Recommendation |
|---|---|---:|---|---|
| primary | #0E7490 | 5.36 | PASS | Use for links, section titles, secondary emphasis text |
| secondary | #0F172A | 17.85 | PASS | Use for high-priority titles and labels |
| text | #0B1220 | 18.65 | PASS | Default body text |
| textMuted | #5B6472 | 5.98 | PASS | Secondary body text and metadata |
| accent | #F97316 | 2.80 | FAIL | Do not use as normal text on white |
| accentText | #B45309 | 5.02 | PASS | Use when accent semantic text is needed on white |
| warning | #D97706 | 3.20 | FAIL | Do not use as normal text on white |
| warningText | #92400E | 7.09 | PASS | Use for warning text on white |
| error | #DC2626 | 4.83 | PASS | Error text and destructive labels |

## Practical rules

1. Use colorSystem.text for default text.
2. Use colorSystem.secondary for key headings.
3. Use colorSystem.accent and colorSystem.warning for fills/badges/icons, not default text on white.
4. When accent semantics must appear as text on white, use colorSystem.accentText.
5. When warning semantics must appear as text on white, use colorSystem.warningText.
6. For filled buttons:
- primary button text: colorSystem.onPrimary
- secondary button text: colorSystem.onSecondary
- accent button text: colorSystem.onAccent

## Token-level enforcement reference

Implemented in both projects:
- restaurante-app/src/design-system/tokens.ts
- restaurante-web/src/design-system/tokens.ts

Look for colorUsageRules in these files to enforce text-safe color choices.
