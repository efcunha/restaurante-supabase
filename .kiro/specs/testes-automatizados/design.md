# Design: Sistema de Testes Automatizados

**Feature:** testes-automatizados  
**Status:** Em Design  
**Última Atualização:** 2026-01-31

---

## 1. Visão Geral

Este documento descreve a arquitetura e estratégia de implementação de uma suite completa de testes automatizados para o aplicativo React Native + Expo do restaurante. O objetivo é alcançar 70%+ de cobertura de código, com foco em Services (80%+), Utils (90%+), Hooks (70%+) e Components (60%+).

### 1.1 Objetivos do Design

- Estabelecer infraestrutura de testes robusta e escalável
- Definir padrões de teste para diferentes tipos de código
- Garantir testes rápidos (< 30s) e confiáveis
- Integrar testes no fluxo de CI/CD
- Facilitar manutenção e evolução dos testes

### 1.2 Tecnologias Escolhidas

- **Jest**: Test runner e framework de asserções
- **React Native Testing Library**: Testes de componentes e hooks
- **@testing-library/jest-native**: Matchers customizados para React Native
- **Firebase Emulator Suite**: Ambiente isolado para testes de integração com Firestore

---

## 2. Arquitetura de Testes

### 2.1 Estrutura de Diretórios

```
restaurante-app/
├── src/
│   ├── services/
│   ├── utils/
│   ├── hooks/
│   └── components/
├── __tests__/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── OrderService.test.js
│   │   │   ├── ComandasService.test.js
│   │   │   ├── PagamentosService.test.js
│   │   │   └── CaixaService.test.js
│   │   ├── utils/
│   │   │   ├── dateUtils.test.js
│   │   │   ├── validation.test.js
│   │   │   └── orderCalculator.test.js
│   │   └── hooks/
│   │       ├── useNovoPedido.test.js
│   │       └── useComandaManagement.test.js
│   ├── integration/
│   │   ├── pedido-flow.test.js
│   │   ├── pagamento-flow.test.js
│   │   └── caixa-flow.test.js
│   ├── components/
│   │   ├── OrderCard.test.js
│   │   ├── ComandaDetails.test.js
│   │   └── PizzaBuilderModal.test.js
│   ├── setup/
│   │   ├── jest.setup.js
│   │   ├── firebase-mock.js
│   │   └── test-utils.js
│   └── __mocks__/
│       ├── @react-native-async-storage/
│       ├── expo-haptics/
│       └── firebase/
├── jest.config.js
└── package.json
```

### 2.2 Camadas de Teste

#### 2.2.1 Testes Unitários (Unit Tests)
- **Escopo**: Funções e métodos isolados
- **Velocidade**: < 10s para toda suite
- **Mocks**: Dependências externas (Firebase, AsyncStorage)
- **Cobertura**: 80-90%

#### 2.2.2 Testes de Integração (Integration Tests)
- **Escopo**: Fluxos completos entre múltiplos módulos
- **Velocidade**: < 20s para toda suite
- **Ambiente**: Firebase Emulator quando necessário
- **Cobertura**: Fluxos críticos de negócio

#### 2.2.3 Testes de Componentes (Component Tests)
- **Escopo**: Renderização e interação de componentes React Native
- **Velocidade**: < 10s para toda suite
- **Biblioteca**: React Native Testing Library
- **Cobertura**: 60%+ dos componentes críticos

---

## 3. Componentes e Interfaces

### 3.1 Configuração do Jest

**Arquivo**: `jest.config.js`

```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/setup/jest.setup.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|@react-native-community|@react-native-async-storage)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/dataconnect-generated/**',
    '!src/dataconnect-admin-generated/**',
    '!src/assets/**',
    '!src/theme/**'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/__tests__/setup/',
    '/__tests__/__mocks__/'
  ],
  testEnvironment: 'node',
  maxWorkers: '50%' // Paralelização para performance
};
```

### 3.2 Setup Global de Testes

**Arquivo**: `__tests__/setup/jest.setup.js`

```javascript
// Mock de módulos nativos do React Native
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock do AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock do Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  }
}));

// Mock do Firebase (para testes unitários)
jest.mock('../../src/config/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id', email: 'test@example.com' }
  }
}));

// Silenciar warnings específicos do React Native
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated:') || args[0].includes('NativeEventEmitter'))
  ) {
    return;
  }
  originalWarn(...args);
};

// Configurar timeout global
jest.setTimeout(10000);
```

### 3.3 Utilitários de Teste

**Arquivo**: `__tests__/setup/test-utils.js`

```javascript
import { render } from '@testing-library/react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastContext } from '../../src/context/ToastContext';

/**
 * Wrapper customizado para renderizar componentes com contextos
 */
export const renderWithContext = (
  component,
  {
    authValue = {
      user: { uid: 'test-user', email: 'test@example.com' },
      companyId: 'test-company',
      loading: false
    },
    toastValue = {
      showToast: jest.fn()
    },
    ...options
  } = {}
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={toastValue}>
        {component}
      </ToastContext.Provider>
    </AuthContext.Provider>,
    options
  );
};

/**
 * Cria um pedido mock para testes
 */
export const createMockOrder = (overrides = {}) => ({
  id: '#001',
  client: 'Cliente Teste',
  mesa: '5',
  comandaNumber: '10',
  items: ['2x Espetinho de Carne', '1x Refrigerante Lata'],
  itemsWithStatus: [
    {
      id: '#001-comanda-10-item-0',
      name: '2x Espetinho de Carne',
      status: 'churrasqueira',
      checked: false,
      timestamp: '2024-01-31T10:00:00.000Z',
      category: 'espetinho-simples'
    },
    {
      id: '#001-comanda-10-item-1',
      name: '1x Refrigerante Lata',
      status: 'churrasqueira',
      checked: false,
      timestamp: '2024-01-31T10:00:00.000Z',
      category: 'bebida'
    }
  ],
  observations: '',
  status: 'montagem',
  timestamp: '2024-01-31T10:00:00.000Z',
  createdAt: '2024-01-31T10:00:00.000Z',
  horarioCriacao: '10:00',
  dateKey: '2024-01-31',
  totalPrice: 31.00,
  isPago: false,
  createdBy: 'test-user',
  createdByName: 'Usuário Teste',
  ...overrides
});

/**
 * Cria uma comanda mock para testes
 */
export const createMockComanda = (overrides = {}) => ({
  id: 'comanda-2024-01-31-10',
  dateKey: '2024-01-31',
  comandaNumber: '10',
  status: 'aberta',
  mesa: '5',
  cliente: 'Cliente Teste',
  totalConsumido: 100.00,
  totalPago: 50.00,
  saldoAberto: 50.00,
  recebidoPor: [],
  abertaAt: new Date('2024-01-31T10:00:00.000Z'),
  criadaEm: '2024-01-31T10:00:00.000Z',
  horarioCriacao: '10:00',
  abertaPor: 'test-user',
  abertaPorNome: 'Usuário Teste',
  fechadaAt: null,
  fechadaPor: null,
  atualizado: new Date('2024-01-31T10:00:00.000Z'),
  ...overrides
});

/**
 * Aguarda por todas as promises pendentes
 */
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

/**
 * Mock de Firestore transaction
 */
export const createMockTransaction = () => ({
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
});

/**
 * Mock de Firestore query snapshot
 */
export const createMockQuerySnapshot = (docs = []) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map(data => ({
    id: data.id,
    data: () => data,
    exists: () => true
  })),
  forEach: (callback) => {
    docs.forEach(data => callback({
      id: data.id,
      data: () => data,
      exists: () => true
    }));
  }
});
```

---

## 4. Estratégias de Mock

### 4.1 Mock do Firebase

Para testes unitários, o Firebase será completamente mockado. Para testes de integração, usaremos o Firebase Emulator.

**Arquivo**: `__tests__/setup/firebase-mock.js`

```javascript
/**
 * Mock completo do Firebase para testes unitários
 */

// Mock de Firestore
export const mockFirestore = {
  collection: jest.fn(() => mockFirestore),
  doc: jest.fn(() => mockFirestore),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  where: jest.fn(() => mockFirestore),
  orderBy: jest.fn(() => mockFirestore),
  limit: jest.fn(() => mockFirestore),
  onSnapshot: jest.fn()
};

// Mock de Auth
export const mockAuth = {
  currentUser: {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn()
};

// Mock de runTransaction
export const mockRunTransaction = jest.fn((db, callback) => {
  const transaction = {
    get: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({})
    }),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };
  return callback(transaction);
});

// Mock de serverTimestamp
export const mockServerTimestamp = jest.fn(() => new Date());

// Mock de getDocs
export const mockGetDocs = jest.fn().mockResolvedValue({
  empty: false,
  size: 0,
  docs: [],
  forEach: jest.fn()
});

// Resetar todos os mocks
export const resetFirebaseMocks = () => {
  jest.clearAllMocks();
  mockFirestore.get.mockReset();
  mockFirestore.set.mockReset();
  mockFirestore.update.mockReset();
  mockFirestore.delete.mockReset();
  mockRunTransaction.mockReset();
  mockGetDocs.mockReset();
};
```

### 4.2 Mock de AsyncStorage

```javascript
// Já fornecido pelo pacote @react-native-async-storage/async-storage
// Configurado em jest.setup.js
```

### 4.3 Mock de Módulos Nativos

```javascript
// __tests__/__mocks__/expo-haptics/index.js
export const impactAsync = jest.fn();
export const notificationAsync = jest.fn();
export const selectionAsync = jest.fn();

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy'
};
```

---

## 5. Modelos de Dados para Testes

### 5.1 Order (Pedido)

```javascript
{
  id: string,              // '#001'
  client: string,          // 'João Silva'
  mesa: string,            // '5'
  comandaNumber: string,   // '10'
  items: string[],         // ['2x Espetinho de Carne']
  itemsWithStatus: [{
    id: string,
    name: string,
    status: 'churrasqueira' | 'pronto',
    checked: boolean,
    timestamp: string,
    category: string
  }],
  observations: string,
  status: 'montagem' | 'churrasqueira' | 'pronto' | 'delivered',
  timestamp: string,       // ISO 8601
  createdAt: string,       // ISO 8601
  horarioCriacao: string,  // 'HH:MM'
  dateKey: string,         // 'YYYY-MM-DD'
  totalPrice: number,
  isPago: boolean,
  createdBy: string,       // UID do usuário
  createdByName: string
}
```

### 5.2 Comanda

```javascript
{
  id: string,              // 'comanda-2024-01-31-10'
  dateKey: string,         // '2024-01-31'
  comandaNumber: string,   // '10'
  status: 'aberta' | 'fechada',
  mesa: string,            // '5'
  cliente: string,         // 'João Silva'
  totalConsumido: number,
  totalPago: number,
  saldoAberto: number,
  recebidoPor: string[],
  abertaAt: Timestamp,
  criadaEm: string,        // ISO 8601
  horarioCriacao: string,  // 'HH:MM'
  abertaPor: string,
  abertaPorNome: string,
  fechadaAt: Timestamp | null,
  fechadaPor: string | null,
  atualizado: Timestamp
}
```

### 5.3 Pagamento

```javascript
{
  id: string,
  comandaNumber: string,
  valor: number,
  formaPagamento: 'dinheiro' | 'pix' | 'cartao-debito' | 'cartao-credito',
  recebidoPor: string,     // UID
  recebidoPorNome: string,
  timestamp: string,       // ISO 8601
  dateKey: string
}
```

---

## 6. Padrões de Teste por Tipo

### 6.1 Testes de Services

**Padrão**: AAA (Arrange, Act, Assert)

```javascript
describe('OrderService', () => {
  describe('calculateOrderTotal', () => {
    it('deve calcular o total corretamente para múltiplos itens', () => {
      // Arrange
      const items = ['2x Espetinho de Carne', '1x Refrigerante Lata'];
      
      // Act
      const total = OrderService.calculateOrderTotal(items);
      
      // Assert
      expect(total).toBe(31.00); // 2*12 + 1*7
    });
  });
});
```

**Características**:
- Testar métodos públicos isoladamente
- Mockar dependências externas (Firebase, AsyncStorage)
- Focar em lógica de negócio
- Testar casos de sucesso, erro e edge cases

### 6.2 Testes de Utils

**Padrão**: Funções puras - entrada/saída

```javascript
describe('dateUtils', () => {
  describe('getLocalDateKey', () => {
    it('deve retornar data no formato YYYY-MM-DD', () => {
      // Mock da data
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-31T10:00:00.000Z'));
      
      const result = getLocalDateKey();
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toBe('2024-01-31');
      
      jest.useRealTimers();
    });
  });
});
```

**Características**:
- Testar funções puras (sem efeitos colaterais)
- Usar jest.useFakeTimers() para controlar datas
- Testar validações com múltiplos inputs
- Alta cobertura (90%+)

### 6.3 Testes de Hooks

**Padrão**: renderHook do React Native Testing Library

```javascript
import { renderHook, act } from '@testing-library/react-native';

describe('useNovoPedido', () => {
  it('deve adicionar produto ao pedido', () => {
    const { result } = renderHook(() => useNovoPedido());
    
    act(() => {
      result.current.adicionarProduto({
        nome: 'Espetinho de Carne',
        preco: 12.00,
        quantidade: 2
      });
    });
    
    expect(result.current.produtos).toHaveLength(1);
    expect(result.current.total).toBe(24.00);
  });
});
```

**Características**:
- Usar renderHook para testar hooks isoladamente
- Usar act() para mudanças de estado
- Mockar contextos necessários
- Testar fluxos de estado completos

### 6.4 Testes de Componentes

**Padrão**: Renderização e interação

```javascript
import { render, fireEvent, waitFor } from '@testing-library/react-native';

describe('OrderCard', () => {
  it('deve renderizar informações do pedido', () => {
    const order = createMockOrder();
    const { getByText } = render(<OrderCard order={order} />);
    
    expect(getByText('#001')).toBeTruthy();
    expect(getByText('Cliente Teste')).toBeTruthy();
    expect(getByText('Mesa 5')).toBeTruthy();
  });
  
  it('deve chamar onPress quando clicado', () => {
    const order = createMockOrder();
    const onPress = jest.fn();
    const { getByTestId } = render(
      <OrderCard order={order} onPress={onPress} />
    );
    
    fireEvent.press(getByTestId('order-card'));
    
    expect(onPress).toHaveBeenCalledWith(order);
  });
});
```

**Características**:
- Testar renderização de dados
- Testar interações do usuário (press, change, etc)
- Usar testID para elementos importantes
- Usar waitFor para operações assíncronas
- Focar em comportamento, não implementação

### 6.5 Testes de Integração

**Padrão**: Fluxo completo entre módulos

```javascript
describe('Fluxo de Pedido Completo', () => {
  it('deve criar pedido, atualizar status e entregar', async () => {
    // Arrange
    const companyId = 'test-company';
    const userId = 'test-user';
    
    // Act - Criar pedido
    const order = OrderService.createOrder(
      '#001',
      'Cliente Teste',
      ['2x Espetinho de Carne'],
      '',
      '10',
      userId,
      'Usuário Teste'
    );
    
    // Act - Atualizar para pronto
    const updatedOrder = OrderService.updateOrderStatus(
      order,
      'pronto',
      userId,
      'Usuário Teste'
    );
    
    // Act - Entregar
    const deliveredOrder = OrderService.updateOrderStatus(
      updatedOrder,
      'delivered',
      userId,
      'Usuário Teste'
    );
    
    // Assert
    expect(deliveredOrder.status).toBe('delivered');
    expect(deliveredOrder.deliveredAt).toBeTruthy();
    expect(deliveredOrder.entreguePor).toBe(userId);
  });
});
```

**Características**:
- Testar fluxos completos de negócio
- Pode usar Firebase Emulator para testes reais
- Verificar estado final após múltiplas operações
- Testar interação entre Services

---

## 7. Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. Some requirements (RF-010 through RF-013) are better suited as integration/example tests rather than universal properties, as they test specific workflows rather than rules that apply across all inputs. Non-functional requirements (RNF-001 through RNF-012) are configuration and metric requirements that don't require functional property tests.

The properties below focus on the core business logic that should hold universally across all valid inputs.

### 7.1 OrderService Properties

**Property 1: Total Calculation Correctness**
*For any* valid array of order items with quantities and prices, calculating the total should equal the sum of (quantity × price) for each item.
**Validates: Requirements RF-001**

**Property 2: Quantity Extraction Consistency**
*For any* item string with a quantity prefix (e.g., "2x Item"), extracting the quantity should return the correct integer, and items without quantity prefix should default to 1.
**Validates: Requirements RF-001**

**Property 3: Order Status Transition Validity**
*For any* order, updating its status should record the appropriate timestamp field (timeInChurrasqueira, timeInMontagem, timeInProntos, deliveredAt) and preserve all other order data.
**Validates: Requirements RF-001**

**Property 4: Item Status Independence**
*For any* order with multiple items, updating the status of one item should not affect the status of other items in the same order.
**Validates: Requirements RF-001**


### 7.2 ComandasService Properties

**Property 5: Comanda Creation Idempotence**
*For any* comanda number and date, calling ensureComandaAberta multiple times should result in only one comanda being created, with subsequent calls updating it rather than creating duplicates.
**Validates: Requirements RF-002**

**Property 6: Consumption Addition Correctness**
*For any* comanda and positive consumption value, adding consumption should increase totalConsumido by exactly that amount and update saldoAberto to reflect the new balance (totalConsumido - totalPago).
**Validates: Requirements RF-002**

**Property 7: Comanda Closure Validation**
*For any* comanda, attempting to close it should succeed only when saldoAberto is zero (within 0.01 tolerance), and should fail with an error message when there is an outstanding balance.
**Validates: Requirements RF-002**

### 7.3 PagamentosService Properties

**Property 8: Payment Value Validation**
*For any* payment attempt, the system should accept only positive numeric values and reject negative, zero, or non-numeric values.
**Validates: Requirements RF-003**

**Property 9: Payment Form Validation**
*For any* payment attempt, the system should accept only valid payment forms (dinheiro, pix, cartao-debito, cartao-credito) and reject invalid payment forms.
**Validates: Requirements RF-003**


### 7.4 CaixaService Properties

**Property 10: Cash Register Opening Uniqueness**
*For any* date and user, opening a cash register should create a unique register for that date, and attempting to open again on the same date should return the existing register.
**Validates: Requirements RF-004**

**Property 11: Sales Recording Accuracy**
*For any* valid sale amount, recording it in the cash register should increase the total sales by exactly that amount.
**Validates: Requirements RF-004**

**Property 12: Cash Register Closure Completeness**
*For any* cash register, closing it should calculate the final totals (sales, expenses, net) correctly and mark it as closed, preventing further modifications.
**Validates: Requirements RF-004**

### 7.5 DateUtils Properties

**Property 13: Date Key Format Consistency**
*For any* date, getLocalDateKey should return a string in YYYY-MM-DD format matching the regex pattern `^\d{4}-\d{2}-\d{2}$`.
**Validates: Requirements RF-005**

**Property 14: Date Function Determinism**
*For any* specific date input, calling date utility functions multiple times should return identical results (deterministic behavior).
**Validates: Requirements RF-005**


### 7.6 Validation Properties

**Property 15: Input Sanitization Safety**
*For any* string input containing HTML tags or control characters, sanitizeString should remove all dangerous characters and return a safe string.
**Validates: Requirements RF-006**

**Property 16: Valid Input Acceptance**
*For any* input that meets the validation criteria (e.g., valid email format, positive price, non-empty name), the corresponding validation function should return `{ isValid: true, value: sanitizedValue }`.
**Validates: Requirements RF-006**

**Property 17: Invalid Input Rejection**
*For any* input that violates validation criteria (e.g., negative price, invalid email, empty required field), the corresponding validation function should return `{ isValid: false, error: descriptiveMessage }`.
**Validates: Requirements RF-006**

**Property 18: Price Validation Precision**
*For any* valid numeric price, validatePrice should round to exactly 2 decimal places and accept values between 0 and 10,000.
**Validates: Requirements RF-006**


### 7.7 OrderCalculator Properties

**Property 19: Total Calculation Commutativity**
*For any* set of order items, the calculated total should be the same regardless of the order in which items appear in the array (commutative property).
**Validates: Requirements RF-007**

**Property 20: Quantity Parsing Robustness**
*For any* valid quantity format (e.g., "2x", "2 x", "2"), the parser should extract the correct numeric quantity.
**Validates: Requirements RF-007**

### 7.8 Hook Properties

**Property 21: Product Addition Increases Total**
*For any* valid product with price and quantity, adding it to the order via useNovoPedido should increase the total by exactly (price × quantity).
**Validates: Requirements RF-008**

**Property 22: Product Removal Decreases Total**
*For any* product in the order, removing it via useNovoPedido should decrease the total by exactly (price × quantity).
**Validates: Requirements RF-008**

**Property 23: Comanda Filter Correctness**
*For any* filter criteria (status, mesa, cliente), useComandaManagement should return only comandas that match all specified criteria.
**Validates: Requirements RF-009**


---

## 8. Error Handling

### 8.1 Estratégia de Tratamento de Erros

Os testes devem validar tanto casos de sucesso quanto casos de erro:

**Erros Esperados**:
- Validação de entrada inválida (valores negativos, strings vazias)
- Operações não permitidas (fechar comanda com saldo, editar pedido pronto)
- Recursos não encontrados (comanda inexistente, pedido não encontrado)

**Padrão de Teste de Erro**:
```javascript
it('deve lançar erro ao tentar fechar comanda com saldo', async () => {
  const comanda = createMockComanda({ saldoAberto: 50.00 });
  
  await expect(
    ComandasService.fecharComanda('company-id', '10', 'user-id', 'User')
  ).rejects.toThrow('saldo de R$ 50.00 em aberto');
});
```

### 8.2 Tratamento de Erros Assíncronos

Para operações assíncronas (Firebase), usar `rejects.toThrow()`:

```javascript
it('deve rejeitar quando Firebase falha', async () => {
  mockRunTransaction.mockRejectedValue(new Error('Firebase error'));
  
  await expect(
    ComandasService.adicionarConsumo('company-id', '10', 50)
  ).rejects.toThrow('Firebase error');
});
```


### 8.3 Validação de Edge Cases

Cada teste deve incluir edge cases:

**Exemplos de Edge Cases**:
- Arrays vazios
- Valores zero
- Strings muito longas
- Caracteres especiais
- Valores limites (máximo/mínimo)
- Null/undefined

```javascript
describe('Edge Cases', () => {
  it('deve lidar com array vazio de itens', () => {
    const total = OrderService.calculateOrderTotal([]);
    expect(total).toBe(0);
  });
  
  it('deve lidar com quantidade zero', () => {
    const result = validateQuantity(0);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('maior que zero');
  });
  
  it('deve lidar com string muito longa', () => {
    const longString = 'a'.repeat(1000);
    const result = validateClientName(longString);
    expect(result.isValid).toBe(false);
  });
});
```


---

## 9. Testing Strategy

### 9.1 Abordagem Dual de Testes

Este projeto utilizará uma abordagem complementar de testes:

**Unit Tests (Testes Unitários)**:
- Verificam exemplos específicos e casos extremos
- Testam condições de erro
- Validam comportamentos específicos
- Rápidos e focados

**Property-Based Tests (Testes Baseados em Propriedades)**:
- Verificam propriedades universais através de múltiplos inputs gerados
- Cobrem ampla gama de casos automaticamente
- Encontram edge cases não previstos
- Validam invariantes do sistema

**Ambos são necessários**: Unit tests capturam bugs concretos e documentam comportamento esperado, enquanto property tests verificam correção geral através de randomização.

### 9.2 Configuração de Property-Based Testing

**Biblioteca**: `fast-check` (para JavaScript/React Native)

```bash
npm install --save-dev fast-check
```

**Configuração Mínima**:
- Cada property test deve executar no mínimo 100 iterações
- Usar seed fixo para reproduzibilidade quando necessário
- Cada teste deve referenciar a propriedade do design


**Exemplo de Property Test**:

```javascript
import fc from 'fast-check';

describe('OrderService - Property Tests', () => {
  // Feature: testes-automatizados, Property 1: Total Calculation Correctness
  it('Property 1: total calculation should equal sum of (quantity × price)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 100 }),
            price: fc.float({ min: 0.01, max: 1000, noNaN: true })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (items) => {
          // Arrange: Convert to order item format
          const orderItems = items.map(
            item => `${item.quantity}x ${item.name}`
          );
          
          // Mock price lookup
          jest.spyOn(OrderService, 'calculateItemPrice')
            .mockImplementation((itemStr) => {
              const item = items.find(i => itemStr.includes(i.name));
              return item ? item.price : 0;
            });
          
          // Act
          const total = OrderService.calculateOrderTotal(orderItems);
          
          // Assert
          const expectedTotal = items.reduce(
            (sum, item) => sum + (item.quantity * item.price),
            0
          );
          
          expect(total).toBeCloseTo(expectedTotal, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```


### 9.3 Balanceamento de Unit Tests

**Princípio**: Evitar excesso de unit tests - property tests já cobrem muitos inputs.

**Unit tests devem focar em**:
- Exemplos específicos que demonstram comportamento correto
- Pontos de integração entre componentes
- Edge cases e condições de erro
- Casos de negócio específicos

**Evitar**:
- Testar todas as combinações possíveis (deixar para property tests)
- Duplicar cobertura já fornecida por property tests
- Testes muito granulares que testam implementação ao invés de comportamento

**Exemplo de Balanceamento**:

```javascript
describe('validatePrice', () => {
  // Unit test: exemplo específico
  it('deve aceitar preço válido de R$ 12.50', () => {
    const result = validatePrice(12.50);
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(12.50);
  });
  
  // Unit test: edge case específico
  it('deve rejeitar preço negativo', () => {
    const result = validatePrice(-10);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('negativo');
  });
  
  // Property test: valida regra geral
  // Feature: testes-automatizados, Property 18: Price Validation Precision
  it('Property 18: should round to 2 decimals for any valid price', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 10000, noNaN: true }),
        (price) => {
          const result = validatePrice(price);
          if (result.isValid) {
            const decimals = (result.value.toString().split('.')[1] || '').length;
            expect(decimals).toBeLessThanOrEqual(2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```


### 9.4 Estratégia de Cobertura

**Metas de Cobertura**:
- **Global**: 70%+ (branches, functions, lines, statements)
- **Services**: 80%+ (lógica de negócio crítica)
- **Utils**: 90%+ (funções puras, alta testabilidade)
- **Hooks**: 70%+ (lógica de estado)
- **Components**: 60%+ (foco em componentes críticos)

**Priorização**:
1. **Alta Prioridade**: Services e Utils (lógica de negócio)
2. **Média Prioridade**: Hooks (gerenciamento de estado)
3. **Baixa Prioridade**: Components (UI, mais sujeita a mudanças)

**Exclusões de Cobertura**:
- Código gerado automaticamente (`dataconnect-generated/`)
- Assets e temas
- Arquivos de configuração
- Mocks e setup de testes

### 9.5 Execução de Testes

**Scripts NPM**:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration",
    "test:components": "jest __tests__/components",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

**Execução Local**:
- `npm test` - Executa todos os testes
- `npm run test:watch` - Modo watch para desenvolvimento
- `npm run test:coverage` - Gera relatório de cobertura

**Execução no CI/CD**:
- `npm run test:ci` - Otimizado para CI (sem watch, com cobertura)


---

## 10. CI/CD Integration

### 10.1 GitHub Actions Workflow

**Arquivo**: `.github/workflows/tests.yml`

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: restaurante-app/package-lock.json
    
    - name: Install dependencies
      working-directory: ./restaurante-app
      run: npm ci
    
    - name: Run tests
      working-directory: ./restaurante-app
      run: npm run test:ci
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./restaurante-app/coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
    
    - name: Check coverage thresholds
      working-directory: ./restaurante-app
      run: |
        if [ -f coverage/coverage-summary.json ]; then
          echo "Coverage report generated successfully"
        else
          echo "Coverage report not found"
          exit 1
        fi
```


### 10.2 Proteção de Branch

**Configuração no GitHub**:
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Status check: `test` (do workflow acima)

**Regras**:
- PRs não podem ser merged se testes falharem
- Cobertura deve atender aos thresholds configurados
- Todos os testes devem passar

### 10.3 Relatórios de Cobertura

**Codecov Integration**:
- Badge de cobertura no README
- Comentários automáticos em PRs com mudanças de cobertura
- Histórico de cobertura ao longo do tempo

**Formato do Relatório**:
```
=============================== Coverage summary ===============================
Statements   : 75.5% ( 450/596 )
Branches     : 72.3% ( 180/249 )
Functions    : 78.9% ( 120/152 )
Lines        : 76.2% ( 430/564 )
================================================================================
```

---

## 11. Manutenção e Evolução

### 11.1 Adicionando Novos Testes

**Checklist para Novos Testes**:
1. Identificar o tipo de teste (unit, integration, component)
2. Criar arquivo no diretório apropriado
3. Seguir padrões de nomenclatura (`*.test.js`)
4. Usar helpers de `test-utils.js`
5. Adicionar property tests quando aplicável
6. Verificar cobertura após adicionar testes


### 11.2 Refatoração de Código Testado

**Processo**:
1. Executar testes antes da refatoração (baseline)
2. Realizar refatoração
3. Executar testes novamente
4. Verificar que todos os testes ainda passam
5. Atualizar testes se a interface pública mudou

**Red-Green-Refactor**:
- Red: Escrever teste que falha
- Green: Implementar código mínimo para passar
- Refactor: Melhorar código mantendo testes verdes

### 11.3 Testes Flaky

**Prevenção**:
- Evitar timeouts arbitrários (usar `waitFor`)
- Não depender de timing específico
- Mockar datas e timers (`jest.useFakeTimers()`)
- Garantir isolamento entre testes
- Limpar mocks após cada teste (`afterEach`)

**Identificação**:
- Executar testes múltiplas vezes
- Monitorar falhas intermitentes no CI
- Usar `--runInBand` para testes sequenciais se necessário

**Correção**:
```javascript
// ❌ Flaky - depende de timing
it('should update after delay', (done) => {
  setTimeout(() => {
    expect(value).toBe(10);
    done();
  }, 100);
});

// ✅ Estável - usa waitFor
it('should update after delay', async () => {
  await waitFor(() => {
    expect(value).toBe(10);
  });
});
```


---

## 12. Exemplos Completos de Testes

### 12.1 Exemplo: Teste de Service

```javascript
// __tests__/unit/services/OrderService.test.js
import OrderService from '../../../src/services/OrderService';
import { getLocalDateKey } from '../../../src/utils/dateUtils';

jest.mock('../../../src/utils/dateUtils');

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLocalDateKey.mockReturnValue('2024-01-31');
  });

  describe('createOrder', () => {
    it('deve criar pedido com dados corretos', () => {
      const order = OrderService.createOrder(
        '#001',
        'João Silva',
        ['2x Espetinho de Carne', '1x Refrigerante Lata'],
        'Sem cebola',
        '10',
        'user-123',
        'João Garçom',
        31.00,
        false,
        '5'
      );

      expect(order.id).toBe('#001');
      expect(order.client).toBe('João Silva');
      expect(order.mesa).toBe('5');
      expect(order.comandaNumber).toBe('10');
      expect(order.items).toHaveLength(2);
      expect(order.totalPrice).toBe(31.00);
      expect(order.status).toBe('montagem');
      expect(order.dateKey).toBe('2024-01-31');
    });

    it('deve criar itemsWithStatus para cada item', () => {
      const order = OrderService.createOrder(
        '#001',
        'Cliente',
        ['2x Carne', '1x Frango'],
        '',
        '10'
      );

      expect(order.itemsWithStatus).toHaveLength(2);
      expect(order.itemsWithStatus[0]).toMatchObject({
        name: '2x Carne',
        status: 'churrasqueira',
        checked: false
      });
    });
  });

  describe('calculateOrderTotal', () => {
    it('deve calcular total corretamente', () => {
      const items = ['2x Espetinho de Carne', '1x Refrigerante Lata'];
      const total = OrderService.calculateOrderTotal(items);
      expect(total).toBe(31.00); // 2*12 + 1*7
    });

    it('deve retornar 0 para array vazio', () => {
      const total = OrderService.calculateOrderTotal([]);
      expect(total).toBe(0);
    });
  });
});
```


### 12.2 Exemplo: Teste de Utils

```javascript
// __tests__/unit/utils/validation.test.js
import {
  validatePrice,
  validateClientName,
  sanitizeString
} from '../../../src/utils/validation';
import fc from 'fast-check';

describe('validation', () => {
  describe('sanitizeString', () => {
    it('deve remover tags HTML', () => {
      const result = sanitizeString('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('deve remover caracteres de controle', () => {
      const result = sanitizeString('test\x00\x01\x1F');
      expect(result).toBe('test');
    });

    // Feature: testes-automatizados, Property 15: Input Sanitization Safety
    it('Property 15: should remove dangerous chars from any string', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result = sanitizeString(input);
            expect(result).not.toMatch(/<[^>]*>/); // No HTML tags
            expect(result).not.toMatch(/[\x00-\x1F\x7F]/); // No control chars
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validatePrice', () => {
    it('deve aceitar preço válido', () => {
      const result = validatePrice(12.50);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(12.50);
    });

    it('deve rejeitar preço negativo', () => {
      const result = validatePrice(-10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('negativo');
    });

    it('deve rejeitar preço muito alto', () => {
      const result = validatePrice(15000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('muito alto');
    });

    // Feature: testes-automatizados, Property 18: Price Validation Precision
    it('Property 18: should round to 2 decimals for any valid price', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 10000, noNaN: true }),
          (price) => {
            const result = validatePrice(price);
            if (result.isValid) {
              const decimals = (result.value.toString().split('.')[1] || '').length;
              expect(decimals).toBeLessThanOrEqual(2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
```


### 12.3 Exemplo: Teste de Hook

```javascript
// __tests__/unit/hooks/useNovoPedido.test.js
import { renderHook, act } from '@testing-library/react-native';
import useNovoPedido from '../../../src/hooks/useNovoPedido';

describe('useNovoPedido', () => {
  it('deve inicializar com estado vazio', () => {
    const { result } = renderHook(() => useNovoPedido());
    
    expect(result.current.produtos).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.cliente).toBe('');
  });

  it('deve adicionar produto e atualizar total', () => {
    const { result } = renderHook(() => useNovoPedido());
    
    act(() => {
      result.current.adicionarProduto({
        nome: 'Espetinho de Carne',
        preco: 12.00,
        quantidade: 2
      });
    });
    
    expect(result.current.produtos).toHaveLength(1);
    expect(result.current.total).toBe(24.00);
  });

  it('deve remover produto e atualizar total', () => {
    const { result } = renderHook(() => useNovoPedido());
    
    act(() => {
      result.current.adicionarProduto({
        nome: 'Espetinho de Carne',
        preco: 12.00,
        quantidade: 2
      });
    });
    
    const produtoId = result.current.produtos[0].id;
    
    act(() => {
      result.current.removerProduto(produtoId);
    });
    
    expect(result.current.produtos).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('deve limpar pedido', () => {
    const { result } = renderHook(() => useNovoPedido());
    
    act(() => {
      result.current.adicionarProduto({
        nome: 'Espetinho de Carne',
        preco: 12.00,
        quantidade: 2
      });
      result.current.setCliente('João Silva');
    });
    
    act(() => {
      result.current.limparPedido();
    });
    
    expect(result.current.produtos).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.cliente).toBe('');
  });
});
```


### 12.4 Exemplo: Teste de Componente

```javascript
// __tests__/components/OrderCard.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OrderCard from '../../src/components/OrderCard';
import { createMockOrder } from '../setup/test-utils';

describe('OrderCard', () => {
  it('deve renderizar informações do pedido', () => {
    const order = createMockOrder({
      id: '#001',
      client: 'João Silva',
      mesa: '5',
      totalPrice: 50.00
    });
    
    const { getByText } = render(<OrderCard order={order} />);
    
    expect(getByText('#001')).toBeTruthy();
    expect(getByText('João Silva')).toBeTruthy();
    expect(getByText(/Mesa 5/i)).toBeTruthy();
    expect(getByText(/R\$ 50,00/i)).toBeTruthy();
  });

  it('deve chamar onPress quando clicado', () => {
    const order = createMockOrder();
    const onPress = jest.fn();
    
    const { getByTestId } = render(
      <OrderCard order={order} onPress={onPress} testID="order-card" />
    );
    
    fireEvent.press(getByTestId('order-card'));
    
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(order);
  });

  it('deve mostrar badge de urgente para pedidos antigos', () => {
    const oldTimestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const order = createMockOrder({ timestamp: oldTimestamp });
    
    const { getByText } = render(<OrderCard order={order} />);
    
    expect(getByText(/urgente/i)).toBeTruthy();
  });

  it('deve renderizar status correto', () => {
    const order = createMockOrder({ status: 'pronto' });
    
    const { getByText } = render(<OrderCard order={order} />);
    
    expect(getByText(/pronto/i)).toBeTruthy();
  });
});
```


### 12.5 Exemplo: Teste de Integração

```javascript
// __tests__/integration/pedido-flow.test.js
import OrderService from '../../src/services/OrderService';
import ComandasService from '../../src/services/ComandasService';

describe('Fluxo Completo de Pedido', () => {
  const companyId = 'test-company';
  const userId = 'test-user';
  const userName = 'Test User';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar pedido, atualizar status e entregar', () => {
    // Arrange
    const items = ['2x Espetinho de Carne', '1x Refrigerante Lata'];
    
    // Act 1: Criar pedido
    const order = OrderService.createOrder(
      '#001',
      'João Silva',
      items,
      'Sem cebola',
      '10',
      userId,
      userName,
      31.00,
      false,
      '5'
    );
    
    // Assert 1: Pedido criado corretamente
    expect(order.status).toBe('montagem');
    expect(order.totalPrice).toBe(31.00);
    expect(order.timeInMontagem).toBeNull();
    
    // Act 2: Mover para pronto
    const readyOrder = OrderService.updateOrderStatus(
      order,
      'pronto',
      userId,
      userName
    );
    
    // Assert 2: Status atualizado
    expect(readyOrder.status).toBe('pronto');
    expect(readyOrder.timeInProntos).toBeTruthy();
    expect(readyOrder.movidoParaProntoPor).toBe(userId);
    
    // Act 3: Entregar
    const deliveredOrder = OrderService.updateOrderStatus(
      readyOrder,
      'delivered',
      userId,
      userName
    );
    
    // Assert 3: Pedido entregue
    expect(deliveredOrder.status).toBe('delivered');
    expect(deliveredOrder.deliveredAt).toBeTruthy();
    expect(deliveredOrder.entreguePor).toBe(userId);
  });

  it('deve impedir edição de pedido após início da montagem', () => {
    // Arrange
    const order = OrderService.createOrder(
      '#001',
      'Cliente',
      ['2x Carne'],
      '',
      '10'
    );
    
    const orderInProgress = OrderService.updateOrderStatus(
      order,
      'montagem',
      userId,
      userName
    );
    
    // Simular que montagem já começou
    orderInProgress.timeInMontagem = new Date().toISOString();
    
    // Act & Assert
    expect(() => {
      OrderService.updateOrder(orderInProgress, {
        client: 'Novo Cliente',
        items: ['3x Carne']
      });
    }).toThrow('Não é possível editar pedidos após início da montagem');
  });
});
```

---

## 13. Considerações de Performance

### 13.1 Otimização de Testes

**Paralelização**:
- Jest executa testes em paralelo por padrão
- Configurar `maxWorkers` para controlar uso de CPU
- Testes de integração podem precisar rodar sequencialmente

**Cache**:
- Jest cacheia transformações de módulos
- Usar `--clearCache` se houver problemas

**Seletividade**:
- Executar apenas testes afetados durante desenvolvimento
- `jest --onlyChanged` para testes de arquivos modificados
- `jest --findRelatedTests <file>` para testes relacionados


### 13.2 Monitoramento de Performance

**Métricas a Monitorar**:
- Tempo total de execução da suite
- Tempo por arquivo de teste
- Testes lentos (> 1s)
- Uso de memória

**Identificar Testes Lentos**:
```bash
jest --verbose --detectOpenHandles
```

**Otimizar Testes Lentos**:
- Reduzir setup/teardown desnecessário
- Mockar operações pesadas
- Evitar sleeps e timeouts
- Usar `jest.useFakeTimers()` para controlar tempo

---

## 14. Troubleshooting

### 14.1 Problemas Comuns

**Problema**: Testes falham no CI mas passam localmente
- **Causa**: Diferenças de ambiente, timezone, dependências
- **Solução**: Usar `jest.useFakeTimers()`, fixar timezone, verificar versões

**Problema**: "Cannot find module" errors
- **Causa**: Configuração incorreta de `moduleNameMapper`
- **Solução**: Verificar paths em `jest.config.js`

**Problema**: Testes muito lentos
- **Causa**: Muitos testes síncronos, falta de paralelização
- **Solução**: Otimizar mocks, usar `maxWorkers`, identificar gargalos

**Problema**: Memory leaks em testes
- **Causa**: Listeners não removidos, timers não limpos
- **Solução**: Usar `afterEach` para cleanup, `jest.clearAllTimers()`


### 14.2 Debug de Testes

**Executar Teste Específico**:
```bash
jest __tests__/unit/services/OrderService.test.js
```

**Executar com Debug**:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

**Logs Detalhados**:
```javascript
// Adicionar console.log temporariamente
it('should do something', () => {
  console.log('Debug:', someValue);
  expect(someValue).toBe(expected);
});
```

**Usar .only para Focar**:
```javascript
// Executar apenas este teste
it.only('should focus on this test', () => {
  // ...
});
```

---

## 15. Referências e Recursos

### 15.1 Documentação

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [fast-check Documentation](https://fast-check.dev/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

### 15.2 Guias e Best Practices

- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Property-Based Testing Guide](https://fsharpforfunandprofit.com/posts/property-based-testing/)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### 15.3 Ferramentas Adicionais

- **Codecov**: Visualização de cobertura
- **Wallaby.js**: Test runner em tempo real (pago)
- **Majestic**: UI para Jest

---

## 16. Conclusão

Este design estabelece uma fundação sólida para testes automatizados no projeto do restaurante. A combinação de unit tests, property-based tests, integration tests e component tests garante cobertura abrangente e confiável.

**Próximos Passos**:
1. Revisar e aprovar este design
2. Criar tasks.md com plano de implementação detalhado
3. Executar implementação em sprints
4. Monitorar métricas de cobertura e performance

**Benefícios Esperados**:
- ✅ Redução de bugs em produção
- ✅ Maior confiança em refatorações
- ✅ Documentação viva do comportamento do sistema
- ✅ Feedback rápido durante desenvolvimento
- ✅ Facilita onboarding de novos desenvolvedores

---

**Aprovado por:** [Aguardando aprovação]  
**Data de Aprovação:** [Aguardando]
