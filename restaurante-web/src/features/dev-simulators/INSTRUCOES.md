# Simuladores de Maquininha e Balança USB

Rota `/dev-simulators` no `restaurante-web`, protegida por feature flag.
Nunca aparece em produção.

## Arquivos a criar/editar

```
restaurante-web/
├── .env.local                              ← adicionar flag (já existente)
├── src/
│   ├── config/
│   │   └── featureFlags.ts                ← adicionar DEV_SIMULATORS
│   ├── features/
│   │   └── dev-simulators/
│   │       ├── types.ts                   ← tipos dos simuladores
│   │       ├── SimuladoresScreen.tsx      ← tela principal (rota /dev/simuladores)
│   │       └── components/
│   │           ├── CardTerminalSimulator.tsx
│   │           └── ScaleSimulator.tsx
│   └── navigation/
│       └── AppNavigator.tsx               ← adicionar rota condicional
```

## Passo a passo

### 1. Adicionar flag no .env.local

```env
EXPO_PUBLIC_FEATURE_DEV_SIMULATORS=true
```

> Adicionar no .env, .env.local ou .env.production somente para teste após osteste mude para false ou comente a linha acima.

### 2. Adicionar no featureFlags.ts

```ts
export const featureFlags = {
  // ... flags existentes ...
  devSimulators: process.env.EXPO_PUBLIC_FEATURE_DEV_SIMULATORS === 'true',
};
```

### 3. Copiar os arquivos gerados

Copie os 4 arquivos .tsx/.ts desta pasta para:
- types.ts              → restaurante-web/src/features/dev-simulators/types.ts
- SimuladoresScreen.tsx → restaurante-web/src/features/dev-simulators/SimuladoresScreen.tsx
- CardTerminalSimulator.tsx → restaurante-web/src/features/dev-simulators/components/CardTerminalSimulator.tsx
- ScaleSimulator.tsx    → restaurante-web/src/features/dev-simulators/components/ScaleSimulator.tsx

### 4. Registrar a rota no AppNavigator

```tsx
import { featureFlags } from '../config/featureFlags';
import SimuladoresScreen from '../features/dev-simulators/SimuladoresScreen';

// Dentro do navigator, junto às outras rotas:
{featureFlags.devSimulators && (
  <Stack.Screen
    name="DevSimuladores"
    component={SimuladoresScreen}
    options={{ title: 'Simuladores DEV', headerShown: true }}
  />
)}
```

### 5. Acessar

Com o servidor rodando:
```
http://localhost:8081/dev/simuladores
```

Ou navegando programaticamente de qualquer tela de dev:
```ts
navigation.navigate('DevSimuladores');
```

## Segurança

- Flag `EXPO_PUBLIC_FEATURE_DEV_SIMULATORS` ausente em produção = rota inexistente
- Nenhum dado é gravado no Supabase
- Nenhuma chamada real para adquirente
- Logs ficam apenas em memória (sem Sentry, sem console em prod)
