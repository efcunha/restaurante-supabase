# Simuladores de Maquininha e Balança USB

Rota de simuladores no `restaurante-web`, protegida por feature flag.
Nao aparece em producao quando `EXPO_PUBLIC_FEATURE_DEV_SIMULATORS=false`.

## Inventario de artefatos (atualizado em 2026-04-13)

### Artefatos de referencia (esta pasta)

- `docs/TEF-Balança/types.ts`
- `docs/TEF-Balança/SimuladoresScreen.tsx`
- `docs/TEF-Balança/CardTerminalSimulator.tsx`
- `docs/TEF-Balança/ScaleSimulator.tsx`
- `docs/TEF-Balança/INSTRUCOES.md`

### Artefatos implementados no produto (fonte de verdade)

- `restaurante-web/src/features/dev-simulators/types.ts`
- `restaurante-web/src/features/dev-simulators/SimuladoresScreen.tsx`
- `restaurante-web/src/features/dev-simulators/components/CardTerminalSimulator.tsx`
- `restaurante-web/src/features/dev-simulators/components/ScaleSimulator.tsx`
- `restaurante-web/src/features/dev-simulators/INSTRUCOES.md`
- `restaurante-web/src/config/featureFlags.ts` (`devSimulators`)
- `restaurante-web/App.js` (registro da tab `Simuladores` em modo web/dev)

### Artefatos de suporte ao fluxo de balanca/PDV

- `restaurante-web/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-web/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-web/src/features/pdv/components/BalancaDisplay.tsx`
- `restaurante-app/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-app/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-app/src/features/pdv/components/BalancaDisplay.tsx`

### Artefatos de validacao E2E associados

- `restaurante-web/e2e/pdv-scale-novo-pedido-simulator.spec.ts`
- `restaurante-web/e2e/pdv-scale-regression.spec.ts`
- `restaurante-web/e2e/pdv-scale-self-service.spec.ts`

## Arquivos da implementacao

```
restaurante-web/
├── .env.local                              ← habilitar flag local de dev
├── src/
│   ├── config/
│   │   └── featureFlags.ts                ← possui `devSimulators`
│   ├── features/
│   │   └── dev-simulators/
│   │       ├── types.ts
│   │       ├── SimuladoresScreen.tsx      ← tela principal
│   │       └── components/
│   │           ├── CardTerminalSimulator.tsx
│   │           └── ScaleSimulator.tsx
└── App.js                                  ← tab condicional `Simuladores`
```

## Passo a passo

### 1. Adicionar flag no .env.local

```env
EXPO_PUBLIC_FEATURE_DEV_SIMULATORS=true
```

> Nunca adicionar no .env ou .env.production

### 2. Adicionar no featureFlags.ts

```ts
export const featureFlags = {
  // ... flags existentes ...
  devSimulators: process.env.EXPO_PUBLIC_FEATURE_DEV_SIMULATORS === 'true',
};
```

### 3. Sincronizar artefatos desta pasta com o produto

Sincronize os 4 arquivos .tsx/.ts desta pasta para:
- types.ts              → restaurante-web/src/features/dev-simulators/types.ts
- SimuladoresScreen.tsx → restaurante-web/src/features/dev-simulators/SimuladoresScreen.tsx
- CardTerminalSimulator.tsx → restaurante-web/src/features/dev-simulators/components/CardTerminalSimulator.tsx
- ScaleSimulator.tsx    → restaurante-web/src/features/dev-simulators/components/ScaleSimulator.tsx

### 4. Registrar a tab no App.js

```tsx
import { featureFlags } from './src/config/featureFlags';
import SimuladoresScreen from './src/features/dev-simulators/SimuladoresScreen';

// Dentro do navigator, junto às outras rotas:
{showDevSimulators && (
  <Tab.Screen
    name="Simuladores"
    component={SimuladoresScreen}
    options={{ tabBarLabel: 'Simuladores DEV' }}
  />
)}
```

### 5. Acessar

Com o servidor rodando (web):
```
http://localhost:8081/Simuladores
```

Ou navegando programaticamente de qualquer tela de dev:
```ts
navigation.navigate('Simuladores');
```

## Segurança

- Flag `EXPO_PUBLIC_FEATURE_DEV_SIMULATORS` ausente em produção = rota inexistente
- Nenhum dado é gravado no Supabase
- Nenhuma chamada real para adquirente
- Logs ficam apenas em memória (sem Sentry, sem console em prod)
