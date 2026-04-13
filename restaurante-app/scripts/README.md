# restaurante-app Scripts

Scripts específicos do app mobile React Native / Expo.

## Conteúdo

- build / manutenção Android:
  - `build-android.sh`
  - `setup-android-release-keystore.sh` (gera keystore de release e configura `.env.local`)
  - `clean-gradle.sh`
  - `reinstall-sdk.sh`
  - `deploy-eas.sh` (dispara build EAS Android/iOS)
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

## Deploy EAS (app)

Script principal:
- `scripts/deploy-eas.sh`

Comportamento padrão:
- Executar sem argumentos dispara build para `android` e `ios` (profile `preview`, `wait=false`).

Comandos npm:
- `npm run deploy:eas` (android + ios)
- `npm run deploy:eas:android`
- `npm run deploy:eas:ios`

Exemplos diretos:
- `bash scripts/deploy-eas.sh`
- `bash scripts/deploy-eas.sh production true --platform ios`
