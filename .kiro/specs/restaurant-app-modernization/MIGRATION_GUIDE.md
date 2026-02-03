# Migration Guide - Tasks 22-24

Este guia fornece instruções detalhadas para completar as tasks de refatoração da Phase 3.

---

## Task 22: Migrar Código para TypeScript

### Objetivo
Converter todos os arquivos .js para .ts/.tsx com strict mode habilitado.

### Status Atual
- ✅ Muitos services já em TypeScript
- ⏳ Screens, components e utils ainda em JavaScript
- ⏳ Strict mode não habilitado

### Estratégia de Migração

#### 1. Habilitar Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

#### 2. Ordem de Conversão Recomendada

**Fase 1: Data Models & Types**
1. `src/types/` - Definir todas as interfaces
2. `src/utils/` - Converter utilities
3. `src/services/` - Completar services restantes

**Fase 2: Business Logic**
4. `src/context/` - Converter contexts
5. `src/hooks/` - Converter custom hooks

**Fase 3: UI Components**
6. `src/components/` - Converter components
7. `src/screens/` - Converter screens

#### 3. Interfaces TypeScript Necessárias

```typescript
// src/types/models.ts

export interface Order {
  id: string;
  companyId: string;
  comandaNumber: string;
  dateKey: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  isPago: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  customerName?: string;
  mesa?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'preparing' 
  | 'ready' 
  | 'delivered' 
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  modifiers?: ItemModifier[];
}

export interface ItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface Comanda {
  id: string;
  companyId: string;
  comandaNumber: string;
  dateKey: string;
  status: ComandaStatus;
  mesa?: string;
  totalAmount: number;
  isPago: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ComandaStatus = 'aberta' | 'fechada' | 'cancelada';

export interface User {
  uid: string;
  email: string;
  nome?: string;
  companyId: string;
  role: UserRole;
  mfaEnabled?: boolean;
}

export type UserRole = 'admin' | 'manager' | 'waiter' | 'kitchen';

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  createdAt: Date;
}

export interface DailyStatistics {
  companyId: string;
  dateKey: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  paidOrders: number;
  unpaidOrders: number;
  topItems: TopItem[];
  topWaiters: TopWaiter[];
  ordersByHour: Record<string, number>;
  lastUpdated: Date;
}

export interface TopItem {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface TopWaiter {
  userId: string;
  name: string;
  ordersCount: number;
  totalRevenue: number;
}
```

#### 4. Conversão de Arquivos

**Exemplo: Context para TypeScript**

```typescript
// ANTES (OrderContext.tsx - JavaScript)
export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  // ...
};

// DEPOIS (OrderContext.tsx - TypeScript)
import { Order } from '../types/models';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  createOrder: (order: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  // ...
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};
```

#### 5. Checklist de Conversão

Para cada arquivo:
- [ ] Renomear .js → .ts ou .jsx → .tsx
- [ ] Adicionar imports de tipos
- [ ] Tipar todas as funções (parâmetros e retorno)
- [ ] Tipar todos os estados (useState, useReducer)
- [ ] Tipar props de componentes
- [ ] Tipar event handlers
- [ ] Remover `any` implícitos
- [ ] Executar `npm run type-check` e corrigir erros

---

## Task 23: Refatorar Lógica de Negócio

### Objetivo
Extrair lógica de negócio dos Context components para Services, limitando Contexts a máximo 200 linhas.

### Estratégia

#### 1. Identificar Lógica de Negócio em Contexts

**OrderContext atual (~500 linhas):**
- ✅ Gerenciamento de estado (OK em Context)
- ❌ Queries Firestore (mover para OrderService)
- ❌ Validações de negócio (mover para ValidationService)
- ❌ Cálculos (mover para CalculationService)
- ❌ Transformações de dados (mover para TransformService)

#### 2. Criar Service Layer

```typescript
// src/services/OrderService.ts

export interface IOrderService {
  // CRUD Operations
  createOrder(order: Partial<Order>): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  updateOrder(id: string, updates: Partial<Order>): Promise<void>;
  deleteOrder(id: string): Promise<void>;
  
  // Queries
  getActiveOrders(companyId: string): Promise<Order[]>;
  getOrdersByComanda(companyId: string, comandaNumber: string): Promise<Order[]>;
  getOrdersByDateRange(companyId: string, startDate: string, endDate: string): Promise<Order[]>;
  
  // Business Logic
  calculateOrderTotal(items: OrderItem[]): number;
  validateOrder(order: Partial<Order>): ValidationResult;
  canCancelOrder(order: Order): boolean;
}

export class OrderService implements IOrderService {
  constructor(
    private db: Firestore,
    private auth: Auth,
    private cache: CacheLayerService,
    private audit: AuditService
  ) {}
  
  async createOrder(order: Partial<Order>): Promise<Order> {
    // Validação
    const validation = this.validateOrder(order);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(', '));
    }
    
    // Cálculos
    const totalAmount = this.calculateOrderTotal(order.items || []);
    
    // Criação
    const newOrder: Order = {
      ...order,
      id: generateId(),
      totalAmount,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Order;
    
    // Persistência
    await setDoc(doc(this.db, `companies/${order.companyId}/orders`, newOrder.id), newOrder);
    
    // Audit
    await this.audit.logOrderCreated(newOrder);
    
    // Invalidate cache
    this.cache.invalidatePattern(`orders:${order.companyId}`);
    
    return newOrder;
  }
  
  // ... outras implementações
}
```

#### 3. Dependency Injection

```typescript
// src/services/ServiceContainer.ts

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  
  private constructor() {
    this.initializeServices();
  }
  
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
  
  private initializeServices() {
    const db = getFirestore();
    const auth = getAuth();
    
    // Core Services
    const cache = new CacheLayerService();
    const audit = new AuditService(db);
    const rateLimiter = new RateLimiterService(db);
    
    // Business Services
    const orderService = new OrderService(db, auth, cache, audit);
    const comandaService = new ComandaService(db, auth, cache, audit);
    const paymentService = new PaymentService(db, auth, audit);
    
    // Register services
    this.services.set('cache', cache);
    this.services.set('audit', audit);
    this.services.set('rateLimiter', rateLimiter);
    this.services.set('orderService', orderService);
    this.services.set('comandaService', comandaService);
    this.services.set('paymentService', paymentService);
  }
  
  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }
}

// Usage
const container = ServiceContainer.getInstance();
const orderService = container.get<IOrderService>('orderService');
```

#### 4. Refatorar Context

```typescript
// OrderContext.tsx - Refatorado (<200 linhas)

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  createOrder: (order: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Inject service
  const orderService = ServiceContainer.getInstance().get<IOrderService>('orderService');
  
  const createOrder = async (order: Partial<Order>) => {
    try {
      setLoading(true);
      setError(null);
      const newOrder = await orderService.createOrder(order);
      setOrders(prev => [...prev, newOrder]);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // ... outras funções delegam para service
  
  return (
    <OrderContext.Provider value={{ orders, loading, error, createOrder, updateOrder, deleteOrder }}>
      {children}
    </OrderContext.Provider>
  );
};
```

#### 5. Custom Hooks

```typescript
// src/hooks/useOrderOperations.ts

export const useOrderOperations = () => {
  const { createOrder, updateOrder, deleteOrder } = useOrders();
  const { showToast } = useToast();
  
  const createOrderWithToast = async (order: Partial<Order>) => {
    try {
      await createOrder(order);
      showToast('Pedido criado com sucesso', 'success');
    } catch (error) {
      showToast('Erro ao criar pedido', 'error');
      throw error;
    }
  };
  
  const updateOrderWithToast = async (id: string, updates: Partial<Order>) => {
    try {
      await updateOrder(id, updates);
      showToast('Pedido atualizado', 'success');
    } catch (error) {
      showToast('Erro ao atualizar pedido', 'error');
      throw error;
    }
  };
  
  return {
    createOrder: createOrderWithToast,
    updateOrder: updateOrderWithToast,
    deleteOrder
  };
};
```

---

## Task 24: Implementar Internacionalização

### Objetivo
Configurar i18n framework mantendo português como padrão.

### Estratégia

#### 1. Instalar Dependências

```bash
npm install react-i18next i18next
npm install --save-dev @types/react-i18next
```

#### 2. Configurar i18next

```typescript
// src/i18n/config.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './locales/pt.json';
import en from './locales/en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en }
    },
    lng: 'pt', // Português como padrão
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

#### 3. Estrutura de Traduções

```json
// src/i18n/locales/pt.json
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "edit": "Editar",
    "loading": "Carregando...",
    "error": "Erro"
  },
  "orders": {
    "title": "Pedidos",
    "create": "Criar Pedido",
    "status": {
      "pending": "Pendente",
      "preparing": "Preparando",
      "ready": "Pronto",
      "delivered": "Entregue",
      "cancelled": "Cancelado"
    }
  },
  "validation": {
    "required": "Campo obrigatório",
    "invalidEmail": "Email inválido",
    "minLength": "Mínimo de {{count}} caracteres"
  }
}
```

#### 4. Uso em Componentes

```typescript
// ANTES
<Text>Criar Pedido</Text>

// DEPOIS
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return <Text>{t('orders.create')}</Text>;
};
```

#### 5. Validação de Traduções

```typescript
// scripts/validate-translations.ts

import pt from '../src/i18n/locales/pt.json';
import en from '../src/i18n/locales/en.json';

function getAllKeys(obj: any, prefix = ''): string[] {
  return Object.keys(obj).reduce((keys: string[], key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      return [...keys, ...getAllKeys(obj[key], fullKey)];
    }
    return [...keys, fullKey];
  }, []);
}

const ptKeys = getAllKeys(pt);
const enKeys = getAllKeys(en);

const missingInEn = ptKeys.filter(key => !enKeys.includes(key));
const missingInPt = enKeys.filter(key => !ptKeys.includes(key));

if (missingInEn.length > 0) {
  console.error('Missing in EN:', missingInEn);
  process.exit(1);
}

if (missingInPt.length > 0) {
  console.error('Missing in PT:', missingInPt);
  process.exit(1);
}

console.log('✅ All translations are complete');
```

---

## Ordem de Execução Recomendada

1. **Task 22 (TypeScript)** - Fase 1: Data Models
   - Criar todas as interfaces em `src/types/models.ts`
   - Converter `src/utils/` para TypeScript
   - Habilitar strict mode gradualmente

2. **Task 23 (Refactoring)** - Service Layer
   - Criar ServiceContainer
   - Implementar OrderService, ComandaService, PaymentService
   - Refatorar OrderContext para usar services

3. **Task 22 (TypeScript)** - Fase 2: Business Logic
   - Converter contexts para TypeScript
   - Converter hooks para TypeScript

4. **Task 24 (i18n)** - Setup
   - Configurar i18next
   - Criar estrutura de traduções
   - Implementar validação

5. **Task 22 (TypeScript)** - Fase 3: UI
   - Converter components para TypeScript
   - Converter screens para TypeScript

6. **Task 24 (i18n)** - Migration
   - Extrair strings para arquivos de tradução
   - Atualizar componentes para usar t()

---

## Scripts Úteis

```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "validate-translations": "ts-node scripts/validate-translations.ts",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix"
  }
}
```

---

## Conclusão

Estas tasks são grandes refatorações que devem ser feitas incrementalmente. Use feature flags e testes para garantir que nada quebre durante a migração.
