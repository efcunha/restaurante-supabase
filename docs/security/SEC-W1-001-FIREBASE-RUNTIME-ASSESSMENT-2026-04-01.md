# SEC-W1-001 Firebase Runtime Assessment (2026-04-01)

Date: 2026-04-01
Scope: restaurante-app, restaurante-web

## Objective

Verify whether Firebase key rotation is required for active runtime flows or if Firebase is currently a dormant legacy dependency.

## Findings

1. Firebase config remains in repository:
- `restaurante-app/src/config/firebaseConfig.ts`
- `restaurante-web/src/config/firebaseConfig.ts`

2. Legacy services still import Firebase config/modules:
- `PaginationService`
- `PaymentValidationService`
- `UnifiedQueryService`
- `QueryOptimizerService`
- `MigrationEngine`
- `PerformanceService`

3. Runtime reachability check from UI/context layers:
- No active imports found outside `src/services` for these Firebase-dependent services.
- Matches found in screens are comments only (e.g., AdminScreen notes for removed PerformanceService).

4. Operational implication:
- Supabase is the active backend path.
- Firebase key appears tied to dormant legacy code paths at this moment.

## Decision Gate Recommendation

Before forcing Firebase key rotation in production, execute this gate:

- Gate A: confirm no runtime path imports Firebase-dependent legacy services.
- Gate B: remove or feature-flag legacy Firebase service exports/imports.
- Gate C: run smoke (auth, pedidos, pagamentos, admin) with Firebase env unset in controlled test.

If all gates pass:
- Reclassify SEC-W1-001 from immediate deploy task to controlled deprecation task.
- Remove Firebase env requirements from deployment checklists.

If any gate fails:
- Keep SEC-W1-001 as active and rotate key for impacted target only.

## Evidence Commands Used

- Repo-wide search for `EXPO_PUBLIC_FIREBASE_API_KEY`
- Repo-wide search for `firebaseConfig` imports
- Search for usage of Firebase-dependent service symbols outside `src/services`

## Current Recommendation (as of this assessment)

Treat SEC-W1-001 as "decision pending" for runtime applicability.
Do not block SEC-W1-002 (CURSOR_SECRET) completion on Firebase key rotation until decision gate is closed.
