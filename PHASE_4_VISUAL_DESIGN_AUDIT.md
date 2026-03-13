# Phase 4 - Visual Design Audit

Date: 2026-03-13
Scope: restaurante-app + restaurante-web
Method: static style analysis across screens/components + contrast checks.

## 1) Color Palette Audit

### Current state
- Legacy palette dominates most screens/components.
- Hardcoded color volume is very high in both projects.

Hardcoded color frequency (screens + components):
- App top values:
  - #8B2F2F: 245
  - #FFF: 197
  - #999: 131
  - #FFFFFF: 105
  - #666: 105
- Web top values:
  - #8B2F2F: 264
  - #FFF: 216
  - #999: 138
  - #666: 115
  - #333: 112

### Findings
1. Strong palette fragmentation due to many ad-hoc hex values.
2. Case variants and duplicates (#FFF, #fff, #FFFFFF) signal token bypass.
3. Legacy and new design-system palettes currently coexist, creating transition inconsistency.

### Severity
- High

## 2) Typography Audit

### Current state
- Typography is mostly manually defined at screen level.
- Repeated use of common sizes exists, but with many outliers.

fontSize distribution:
- App (most used): 16 (189), 14 (130), 12 (83), 18 (80), 20 (66)
- Web (most used): 16 (204), 14 (138), 18 (90), 12 (84), 20 (69)
- Outliers observed: 64 and 80 in both projects.

### Findings
1. Base sizes are relatively consistent but not enforced via a single typographic scale in legacy screens.
2. Outliers are likely valid for special widgets, yet should be componentized and documented.
3. Visual rhythm varies because heading/body/button roles are not universally tokenized yet.

### Severity
- Medium-High

## 3) Spacing and Shape Audit

### Current state
- Significant dispersion in border radius values.
- Spacing and layout values are mostly local and ad-hoc.

borderRadius distribution:
- App: 8 (96), 12 (79), 10 (57), 15 (34), 20 (29), plus many minor variants.
- Web: 8 (111), 12 (87), 10 (62), 15 (36), 20 (30), plus many minor variants.

### Findings
1. Several radius scales coexist (8/10/12/15/20/30/50/999), reducing visual cohesion.
2. Near-duplicate values suggest missing migration to a canonical radius scale.
3. Similar issue likely applies to margins/paddings in large screen files.

### Severity
- High

## 4) Alignment and Layout Consistency Audit

### Current state
- Heavy inline style usage across UI layer.

Inline style occurrences:
- App: 226
- Web: 256

Text alignment usage:
- App: center 92, left 10, right 2
- Web: center 100, left 19, right 4

### Findings
1. Inline styles at this volume reduce maintainability and visual consistency.
2. Center alignment is dominant, but left/right patterns are inconsistent between equivalent flows.
3. Layout behavior is harder to normalize while styles are dispersed.

### Severity
- High

## 5) Component Consistency Audit

### Current state
- Many UI blocks with similar behavior still use local style implementations.
- New ui-next library exists, but migration is partial.

### Findings
1. Card/button/input/table patterns still diverge in legacy screens.
2. Component-level consistency is improving, but old variants remain active in core journeys.
3. Visual drift risk remains high until core transaction screens are migrated.

### Severity
- High

## 6) Visual Hierarchy Audit

### Current state
- Hierarchy is often diluted in long screens with mixed concerns.
- CTA prominence varies between equivalent actions.

Hotspot screens by size and density:
- GerenciarCardapioScreen (app/web) 2500+ lines
- AdminScreen (app/web) 1500+ lines
- NovoPedidoScreen (app/web) 1291 lines
- PagamentoScreen with high navigation branch density

### Findings
1. Primary actions are not always visually dominant.
2. Information grouping (overview vs action vs detail) can be clearer.
3. Dense screens increase scanning cost and reduce visual clarity under time pressure.

### Severity
- Critical

## 7) Contrast and Accessibility Audit

WCAG contrast checks (sample critical pairs):
- Legacy primary #8B2F2F on white: 8.25 (PASS AA normal)
- Legacy secondary #E5B84A on white: 1.86 (FAIL)
- Legacy secondary #E5B84A on dark text #2C2C2C: 7.51 (PASS)
- New primary #0E7490 on white: 5.36 (PASS)
- New secondary #0F172A on white: 17.85 (PASS)
- New accent #F97316 on white: 2.80 (FAIL)
- New muted text #5B6472 on white: 5.98 (PASS)

### Findings
1. Accent/secondary warm tones are not safe for normal text on white surfaces.
2. These colors should be used for badges/highlights/fills with dark text, not body text.
3. Token guidance should encode accessibility usage rules per role.

### Severity
- Critical

## Top visual problems (ordered by severity)

1. Critical - Weak visual hierarchy in large, multi-purpose screens.
2. Critical - Accessibility risk when accent/warm tones are used as text on white backgrounds.
3. High - Palette fragmentation from extensive hardcoded color usage.
4. High - Spacing/radius inconsistency from mixed local values.
5. High - Inline style sprawl reducing consistency and scalability.
6. High - Component visual drift across legacy implementations.
7. Medium-High - Typography not fully enforced through a single token scale.

## Immediate actions for next phase

1. Enforce token-only color usage in new and migrated screens.
2. Add design rules:
- Accent and warm secondary cannot be used as normal text on white.
- CTA hierarchy rules (primary, secondary, destructive).
3. Migrate top 5 screens by density to ui-next primitives first.
4. Reduce inline style usage by extracting style presets and component props.
5. Add visual regression checks for key operational screens.

## Phase 4 completion status

Completed:
- color palette evaluation
- typography consistency evaluation
- spacing consistency evaluation
- alignment consistency evaluation
- component consistency evaluation
- visual hierarchy evaluation
- contrast and accessibility evaluation
- visual design problems identified and prioritized

Post-audit remediation applied:
- Replaced legacy low-contrast secondary hex `#E5B84A` with `#B45309` across app and web source files.
- Verified contrast on white for new legacy-secondary value: 5.02 (AA pass for normal text).
