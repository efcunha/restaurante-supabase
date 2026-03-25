# restaurante-app Scripts

Scripts específicos do app mobile React Native / Expo.

## Conteúdo

- build / manutenção Android:
  - `build-android.sh`
  - `clean-gradle.sh`
  - `reinstall-sdk.sh`
- assets / ícones / splash:
  - `generate-android-icons.js`
  - `generate-android-icons.sh`
  - `update-splash-screen.js`
  - `fix-icon-padding.js`
  - `verificar-icone.sh`
- dados / debug / seeds:
  - `seed-test-db.js`
  - `seed-test-db.ts`
  - `seed.sql`
  - `debug_orders.js`
  - `debug_orders.ts`
- suporte de rollout / banco:
  - `phase12-profile.js`
  - `fix-permissions.sql`

## Regra de uso

- manter aqui apenas scripts que afetam exclusivamente o app mobile
- scripts de monorepo devem ficar em `scripts/`
