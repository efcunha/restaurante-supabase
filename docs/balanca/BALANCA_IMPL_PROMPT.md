# PROMPT DE IMPLEMENTAÇÃO — Integração de Balança Serial no restaurante-supabase

> **Copie e cole este prompt completo para o agente/LLM que fará a implementação.**
> Ele contém todo o contexto técnico, contratos de interface, regras de negócio e
> critérios de aceite necessários para uma implementação segura e completa.

---

## 1. CONTEXTO DO PROJETO

Você está atuando como **Desenvolvedor Full Stack Senior** no monorepo
`restaurante-supabase`, um sistema POS/PDV multi-tenant para restaurantes
brasileiros. O stack é:

- **Frontend**: React Native 0.84 + Expo 54, TypeScript estrito
- **Backend**: Supabase (PostgreSQL 15 + RLS + Realtime)
- **Clientes**: `restaurante-app/` (app nativo) e `restaurante-web/` (Expo Web)
- **Padrão de arquitetura**:
  - lógica de negócio em `src/services/`
  - UI reutilizável em `src/ui/`
  - features em `src/features/<feature>/components` + `types.ts`
  - novas telas usam `ScreenScaffold`
  - tokens visuais de `src/design-system/tokens.ts` e `src/theme/colors.ts`
- **Regras inegociáveis**:
  1. Toda query respeita `company_id` (multi-tenant) + RLS
  2. Nenhum segredo hardcodado em código-fonte
  3. Mudanças em fluxo crítico exigem E2E antes de promover
  4. UI nova usa tokens do design system, sem hardcode visual
  5. Módulos espelhados app/web recebem alterações simétricas

---

## 2. OBJETIVO DA IMPLEMENTAÇÃO

Integrar **leitura de peso de balança serial/USB** ao fluxo de venda por peso
(restaurante self-service / quilo). A leitura deve fluir da balança física →
`balanca-bridge` (servidor Node.js local) → API REST → `useBalanca` hook →
tela de pedido.

A implementação abrange **5 camadas**:

```
Balança física (Serial/USB)
      ↓
balanca-bridge/index.js  ←→  porta COM / /dev/ttyUSBx
      ↓  HTTP REST (LAN)
useBalanca.ts  (hook)
      ↓
BalancaDisplay.tsx  (componente UI)
      ↓
NovoPedidoScreen.tsx  (integração no fluxo de pedido)
      ↓
Supabase orders  (persistência do peso na linha do pedido)
```

---

## 3. CAMADA 1 — balanca-bridge (Node.js)

### 3.1 Localização no monorepo

```
balanca-bridge/
├── index.js          ← servidor principal
├── package.json
├── .env.example
└── README.md
```

> O bridge **não** faz parte do bundle do app. Roda como processo separado
> na máquina do caixa (Windows ou Linux) conectada fisicamente à balança.

### 3.2 Dependências exatas

```json
{
  "serialport": "^12.0.0",
  "@serialport/parser-readline": "^12.0.0",
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```

### 3.3 Variáveis de ambiente (.env.example)

```env
BALANCA_PORT=/dev/ttyUSB0   # Windows: COM3, COM4…
BALANCA_BAUD=9600            # 4800 para Filizola
BALANCA_PROTO=PRT2           # PRT1 | PRT2 | PRT3
API_PORT=3031
API_KEY=                     # opcional; se preenchido exige header x-api-key
```

### 3.4 Protocolos suportados e configuração serial

| Protocolo | Descrição                        | Byte de requisição | Fabricantes típicos          |
|-----------|----------------------------------|--------------------|------------------------------|
| PRT1      | Por requisição (polling app)     | `0x05` (ENQ)       | Toledo Prix Serial, Filizola |
| PRT2      | Transmissão contínua             | nenhum             | Toledo Prix USB, Elgin DP30  |
| PRT3      | Por requisição                   | `0x05` (ENQ)       | Urano Pop-Z, Urano BA        |

Parâmetros seriais fixos para **todos** os modelos:
- Data bits: `8`
- Stop bits: `1`
- Paridade: `none`

### 3.5 Parser de protocolo

Implementar `parsePeso(linha: string)` que cubra os dois formatos mais comuns:

**Formato decimal (Toledo Prix PRT2):**
```
+001.500 kg\r\n   → peso_kg: 1.500, estavel: true
-000.000 kg\r\n   → peso_kg: 0.000, estavel: true
*001.200 kg\r\n   → peso_kg: 1.200, estavel: false  (* = instável)
```

**Formato inteiro (6 dígitos em gramas):**
```
N001500\r\n  → peso_kg: 1.500
001500\r\n   → peso_kg: 1.500
S000000\r\n  → peso_kg: 0.000
```

Regex de referência:
```js
// Decimal
/([+\-*]?\d+\.\d+)\s*kg?/i

// Inteiro 6 dígitos
/[A-Z]?(\d{6})/
```

O caractere `*` no início indica **instabilidade** em Toledo Prix — mapear
para `estavel: false` no objeto retornado.

### 3.6 Contratos dos endpoints REST

```
GET  /peso
  → 200  { peso_kg, estavel, timestamp, raw, erro: null }
  → 204  (sem leitura ainda)
  → 503  { erro: "mensagem da porta serial" }

GET  /peso/estavel
  → 200  { peso_kg, estavel: true, timestamp, raw, erro: null }
  → 408  { erro: "Timeout aguardando leitura estável" }
  → 503  { erro: "..." }

GET  /status
  → 200  { serial_aberta, porta, baud, protocolo, ultima_leitura, erro }

POST /tara
  → 200  { ok: true, mensagem: "Comando de tara enviado" }
  → 503  { erro: "Porta serial não está aberta" }
  → 500  { erro: "..." }

GET  /portas
  → 200  [ { path, manufacturer, serialNumber, … } ]  (SerialPort.list())
```

Byte de tara Toledo Prix: `0x54`

### 3.7 Reconexão automática

Se a porta fechar ou lançar erro, aguardar **3 segundos** e tentar reabrir.
Usar flag `reconectando` para evitar reconexões paralelas.

### 3.8 Segurança

- CORS habilitado (app e web na LAN precisam consumir)
- Se `API_KEY` definido no env, exigir header `x-api-key` em todas as rotas
- Nunca logar o valor de `API_KEY`

---

## 4. CAMADA 2 — useBalanca.ts (hook React Native / Web)

### 4.1 Localização

```
restaurante-app/src/services/useBalanca.ts
restaurante-web/src/services/useBalanca.ts   ← arquivo idêntico (espelhado)
```

### 4.2 Interface pública do hook

```ts
interface UseBalancaOptions {
  baseUrl?: string;      // default: 'http://localhost:3031'
  intervalo?: number;    // ms de polling; 0 = desliga. default: 500
  apiKey?: string;       // opcional
  autoStart?: boolean;   // default: true
}

interface UseBalancaReturn {
  peso_kg: number | null;
  estavel: boolean;
  carregando: boolean;
  erro: string | null;
  timestamp: string | null;
  lerPesoEstavel: () => Promise<LeituraBalanca | null>;
  atualizar: () => void;
  tara: () => Promise<boolean>;
  setPolling: (ativo: boolean) => void;
}
```

### 4.3 Comportamento esperado

- Polling via `setInterval` no `useEffect`; limpar no cleanup
- `lerPesoEstavel()` faz `GET /peso/estavel` e retorna `null` no timeout
- Status 204 não atualiza o estado (sem leitura disponível ainda)
- Erros de rede populam `erro` sem lançar exceção para o consumidor
- `setPolling(false)` para o intervalo imediatamente

### 4.4 Configuração da URL por ambiente

O `baseUrl` deve vir de variável de ambiente para permitir trocar o IP
do caixa sem rebuild:

```ts
// restaurante-app/src/config/balancaConfig.ts
export const BALANCA_BRIDGE_URL =
  process.env.EXPO_PUBLIC_BALANCA_BRIDGE_URL ?? 'http://localhost:3031';
```

Adicionar ao `.env.example` de app e web:
```env
EXPO_PUBLIC_BALANCA_BRIDGE_URL=http://localhost:3031
```

---

## 5. CAMADA 3 — BalancaDisplay.tsx (componente UI)

### 5.1 Localização

```
restaurante-app/src/features/balanca/components/BalancaDisplay.tsx
restaurante-web/src/features/balanca/components/BalancaDisplay.tsx
```

### 5.2 Props

```ts
interface BalancaDisplayProps {
  peso_kg: number | null;
  estavel: boolean;
  erro: string | null;
  carregando: boolean;
  onTara?: () => void;
  onConfirmar?: (peso_kg: number) => void;
  produtoNome?: string;
  precoPorKg?: number;        // para exibir valor calculado em tempo real
}
```

### 5.3 Layout e comportamento visual

```
┌─────────────────────────────────┐
│  🥩 Frango Grelhado             │
│                                 │
│       1.500 kg                  │  ← peso grande, fonte 48px
│       R$ 22,50                  │  ← precoPorKg × peso_kg
│                                 │
│  ● Estável    [Tara]  [Confirmar]│
└─────────────────────────────────┘
```

- Indicador de estabilidade: verde (estável) / amarelo piscando (instável)
- Botão **Confirmar** desabilitado se `!estavel || peso_kg === null || peso_kg <= 0`
- Botão **Tara** sempre habilitado se sem erro
- Exibir `erro` em texto vermelho abaixo quando presente
- Usar exclusivamente tokens do design system (`colors.ts`, `tokens.ts`)
- Não usar `StyleSheet.create` com valores hardcoded de cor ou espaçamento

### 5.4 Acessibilidade

- `accessibilityLabel` no peso: `"Peso: 1 quilo e 500 gramas"`
- `accessibilityLabel` no valor: `"Valor: 22 reais e 50 centavos"`
- `accessibilityLiveRegion="polite"` no texto do peso para leitores de tela

---

## 6. CAMADA 4 — Integração em NovoPedidoScreen

### 6.1 Feature flag

Toda a UI de balança deve ser guardada por feature flag antes de ativar em produção:

```ts
// restaurante-app/src/config/featureFlags.ts  (e espelho web)
EXPO_PUBLIC_FEATURE_BALANCA=false   // default desligado
```

```ts
// Uso na tela
const { balanca: balancaEnabled } = useFeatureFlags();
```

### 6.2 Fluxo de pesagem em NovoPedidoScreen

```
Usuário seleciona produto pesável
        ↓
Abrir modal/drawer de pesagem  ←  BalancaDisplay
        ↓
useBalanca polling ativo (intervalo=500ms)
        ↓
Usuário coloca item na balança
        ↓
lerPesoEstavel() ao tocar "Confirmar"
        ↓
Peso confirmado → calcular valor (peso_kg × preco_por_kg)
        ↓
Adicionar ao pedido com campos:
  { quantidade: peso_kg, unidade: 'kg', valor_unitario: preco_por_kg,
    valor_total: peso_kg * preco_por_kg, peso_kg }
        ↓
setPolling(false) ao fechar modal
```

### 6.3 Identificação de produto pesável

Um produto é pesável quando `product.vendido_por_peso === true` (campo a
adicionar na tabela `products`).

**Migration necessária:**

```sql
-- Adicionar à tabela products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vendido_por_peso BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preco_por_kg     NUMERIC(10,2);

-- RLS já cobre por company_id; nenhuma policy nova necessária
-- Índice opcional para filtrar produtos pesáveis
CREATE INDEX IF NOT EXISTS idx_products_pesavel
  ON products(company_id, vendido_por_peso)
  WHERE vendido_por_peso = true;
```

### 6.4 Persistência do peso em orders

Adicionar coluna `peso_kg` em `order_items`:

```sql
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(8,3);
```

No insert de item via `adicionar_consumo_atomico` ou service equivalente,
passar `peso_kg` quando o produto for pesável.

---

## 7. CAMADA 5 — Serviço de configuração da balança (admin)

### 7.1 Tabela de configuração por empresa

```sql
CREATE TABLE IF NOT EXISTS balanca_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bridge_url  TEXT NOT NULL DEFAULT 'http://localhost:3031',
  api_key     TEXT,                    -- armazenar criptografado se possível
  protocolo   TEXT NOT NULL DEFAULT 'PRT2',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE balanca_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company isolamento balanca_config"
  ON balanca_config
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

### 7.2 Service TypeScript

```
restaurante-app/src/services/balancaConfigService.ts
restaurante-web/src/services/balancaConfigService.ts
```

Interface mínima:
```ts
getBalancaConfig(company_id: string): Promise<BalancaConfig | null>
upsertBalancaConfig(config: BalancaConfigInput): Promise<void>
```

---

## 8. TESTES E2E

### 8.1 Mock do bridge nos testes

Nos testes Playwright (`restaurante-web/e2e`) e Maestro (`restaurante-app/.maestro`),
mockar o bridge com uma resposta fixa:

```ts
// playwright — fixture ou page.route()
await page.route('http://localhost:3031/peso', route =>
  route.fulfill({
    status: 200,
    body: JSON.stringify({
      peso_kg: 0.350,
      estavel: true,
      timestamp: new Date().toISOString(),
      raw: '+000.350 kg',
      erro: null,
    }),
  })
);
```

### 8.2 Casos de teste obrigatórios

1. Produto pesável → modal de balança abre ao selecionar
2. Peso instável → botão Confirmar desabilitado
3. Peso estável → botão Confirmar habilitado e valor calculado corretamente
4. Tara → peso volta a zero sem fechar modal
5. Erro de conexão → mensagem de erro exibida, polling continua tentando
6. Confirmar peso → item adicionado com `peso_kg` e `valor_total` corretos
7. Fechar modal → polling parado (`setPolling(false)`)

---

## 9. CHECKLIST DE ENTREGA

Antes de considerar a implementação concluída, validar cada item:

- [ ] `balanca-bridge/index.js` cobre PRT1, PRT2 e PRT3
- [ ] Parser cobre formato decimal e formato inteiro de 6 dígitos
- [ ] Reconexão automática em 3s testada desconectando o USB
- [ ] `useBalanca.ts` espelhado em `restaurante-app` e `restaurante-web`
- [ ] `EXPO_PUBLIC_BALANCA_BRIDGE_URL` adicionado aos `.env.example` de app e web
- [ ] `BalancaDisplay.tsx` espelhado em `restaurante-app` e `restaurante-web`
- [ ] Feature flag `EXPO_PUBLIC_FEATURE_BALANCA` criada e documentada
- [ ] Migration `vendido_por_peso` + `preco_por_kg` em `products`
- [ ] Migration `peso_kg` em `order_items`
- [ ] Migration `balanca_config` com RLS por `company_id`
- [ ] Fluxo de pedido em `NovoPedidoScreen` guarda feature flag e passa `peso_kg` no item
- [ ] Nenhum segredo hardcodado (`api_key` via env, nunca em código)
- [ ] Tokens de design system usados em `BalancaDisplay` (sem hardcode de cor)
- [ ] E2E Playwright com mock do bridge cobrindo os 7 casos obrigatórios
- [ ] Smoke test manual com balança real (ou emulador serial) antes de promover

---

## 10. RISCOS E ROLLBACK

| Risco | Mitigação |
|---|---|
| Bridge indisponível na LAN | `useBalanca` exibe erro e permite pesagem manual como fallback |
| Protocolo serial incompatível com novo modelo de balança | `parsePeso` extensível; adicionar novo regex sem quebrar os existentes |
| Timeout de leitura estável em balança lenta | Timeout de `/peso/estavel` configurável via query param `?timeout=5000` |
| Migration de `products` em produção | `ADD COLUMN IF NOT EXISTS` + `DEFAULT false` — não quebra registros existentes |
| Feature flag desligada acidentalmente em prod | `EXPO_PUBLIC_FEATURE_BALANCA=false` no `.env` de produção até validação completa |

**Rollback total**: setar `EXPO_PUBLIC_FEATURE_BALANCA=false` nos ambientes de produção
e fazer redeploy — toda UI de balança desaparece sem nenhuma alteração de banco.

---

*Gerado em 2026-04-06 para o projeto restaurante-supabase.*
*Manter este arquivo em `docs/implementacao/BALANCA_IMPL_PROMPT.md`.*
