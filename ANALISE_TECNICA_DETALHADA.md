# 🔬 Análise Técnica Detalhada - Restaurante App

## 📋 Índice
1. [Padrões de Código](#padrões-de-código)
2. [Gestão de Estado](#gestão-de-estado)
3. [Integração Firebase](#integração-firebase)
4. [Performance](#performance)
5. [Segurança](#segurança)

---

## 1. Padrões de Código

### Service Layer Pattern
Toda lógica de negócio está isolada em serviços, mantendo componentes limpos:

```javascript
// ✅ BOM: Lógica no Service
class ComandasService {
  async ensureComandaAberta(companyId, comandaNumber, ...) {
    // Lógica complexa aqui
  }
}

// ✅ BOM: Componente apenas chama o service
const handleSubmit = async () => {
  await ComandasService.ensureComandaAberta(...);
};
```

### Custom Hooks Pattern
Lógica reutilizável encapsulada em hooks:

```javascript
// useNovoPedido.js
export const useNovoPedido = () => {
  const [produtos, setProdutos] = useState({});
  const [total, setTotal] = useState(0);
  
  const updateProduto = (nome, delta) => {
    // Lógica de atualização
  };
  
  return { produtos, total, updateProduto };
};
```

### Memoization para Performance
```javascript
// Componentes pesados com memo
const ProdutoItem = memo(({ item }) => {
  return <View>...</View>;
});

// Callbacks estáveis
const handleRemove = useCallback((id) => {
  removeItem(id);
}, [removeItem]);

// Cálculos caros com useMemo
const sections = useMemo(() => {
  return processCardapio(cardapio);
}, [cardapio]);
```

---

## 2. Gestão de Estado

### Context API - Arquitetura


#### AuthContext - Gerenciamento de Autenticação
```javascript
// Estratégia: Login manual obrigatório
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isManualLoginRef = useRef(false);
  
  // Desabilita persistência automática
  useEffect(() => {
    signOut(auth);
    AsyncStorage.clear();
  }, []);
  
  // Login manual com validação
  const login = async (email, senha) => {
    isManualLoginRef.current = true;
    const userCredential = await signInWithEmailAndPassword(...);
    const funcionario = await buscarFuncionarioPorUid(uid);
    setUser(funcionario);
  };
};
```

#### OrderContext - Sincronização em Tempo Real
```javascript
// Listener com merge inteligente
useEffect(() => {
  const unsubscribe = OrderFirestoreService.listenToActiveOrders(
    companyId,
    ({ orders, docMap }) => {
      setOrders(prevOrders => {
        // Merge baseado em timestamps
        return orders.map(firestoreOrder => {
          const localOrder = prevOrders.find(o => o.id === firestoreOrder.id);
          if (!localOrder) return firestoreOrder;
          
          // Comparar timestamps
          const firestoreTime = new Date(firestoreOrder.atualizado);
          const localTime = new Date(localOrder.atualizado);
          
          return firestoreTime > localTime ? firestoreOrder : localOrder;
        });
      });
    }
  );
  
  return () => unsubscribe();
}, [companyId]);
```

---

## 3. Integração Firebase

### Firestore Queries Otimizadas

#### Query com Índice Composto
```javascript
// Busca pedidos do dia com status
const q = query(
  getCompanyCollection(companyId, 'pedidos'),
  where('dateKey', '==', todayKey),
  where('status', '==', 'montagem')
);
// Requer índice: [dateKey ASC, status ASC]
```

#### Cache Strategy
```javascript
// Cache com TTL de 30 segundos
const cachedQuery = async (cacheKey, queryFn, ttl = 30000) => {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await queryFn();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};
```

### Transações Atômicas
```javascript
// Pagamento com transação
await runTransaction(db, async (tx) => {
  const snap = await tx.get(comandaRef);
  const data = snap.data();
  
  const totalPago = data.totalPago + valor;
  const saldoAberto = data.totalConsumido - totalPago;
  
  tx.update(comandaRef, { totalPago, saldoAberto });
});
```

### Normalização de Dados
```javascript
// Converter Firestore → App
const firestoreToOrder = (docId, data) => ({
  id: data.idFormatado || `#${docId.slice(-3)}`,
  client: data.cliente || '',
  comandaNumber: normalizeComandaNumber(data.numeroComanda),
  timestamp: data.horaPedido?.toDate?.()?.toISOString(),
  // ... mais campos
});

// Converter App → Firestore
const orderToFirestore = (order) => ({
  idFormatado: order.id,
  cliente: order.client,
  numeroComanda: normalizeComandaNumber(order.comandaNumber),
  horaPedido: serverTimestamp(),
  // ... mais campos
});
```

---

## 4. Performance

### Otimizações de Renderização

#### SectionList com Virtualização
```javascript
<SectionList
  sections={sections}
  renderItem={renderItem}
  initialNumToRender={12}
  windowSize={5}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  removeClippedSubviews={Platform.OS === 'android'}
/>
```

#### Debounce em Listeners
```javascript
const debouncedCallback = (key, callback, delay) => {
  if (timers[key]) clearTimeout(timers[key]);
  
  timers[key] = setTimeout(() => {
    callback();
    delete timers[key];
  }, delay);
};

// Uso: evitar múltiplos re-renders
debouncedCallback('activeOrders', () => {
  setOrders(newOrders);
}, 100);
```

### Estratégias de Cache

#### Cache de Cardápio
```javascript
// Carregar uma vez e reutilizar
const [cardapio, setCardapio] = useState(null);

useEffect(() => {
  const loadCardapio = async () => {
    const cached = await AsyncStorage.getItem('cardapio');
    if (cached) {
      setCardapio(JSON.parse(cached));
    }
    
    const fresh = await fetchCardapio();
    setCardapio(fresh);
    AsyncStorage.setItem('cardapio', JSON.stringify(fresh));
  };
  
  loadCardapio();
}, []);
```

#### Cache de Estatísticas
```javascript
// Cache com TTL
const getEstatisticas = async (garcomId, periodo) => {
  const cacheKey = `stats_${garcomId}_${periodo}`;
  
  return await cachedQuery(cacheKey, async () => {
    // Query pesada
    const pedidos = await getDocs(...);
    return calcularEstatisticas(pedidos);
  }, 30000); // 30 segundos
};
```

---

## 5. Segurança

### Validações Server-Side

#### Cálculo de Total no Servidor
```javascript
// ❌ INSEGURO: Confiar no cliente
const addOrder = async (items, totalPrice) => {
  await saveOrder({ items, totalPrice }); // Cliente pode mentir
};

// ✅ SEGURO: Calcular no servidor
const addOrder = async (items) => {
  const totalPrice = await calculateTotalFromFirestore(items);
  await saveOrder({ items, totalPrice });
};
```

#### Proteção de Campos Críticos
```javascript
// Campo isPago só pode ser alterado por PagamentosService
const updateOrder = async (orderId, updatedData) => {
  // Remover isPago se vier nos dados
  const { isPago, ...safeData } = updatedData;
  
  await updateDoc(orderRef, safeData);
};

// Única função autorizada
class PagamentosService {
  async marcarPedidosComoPagos(pedidosIds, forma) {
    // Lógica de pagamento
    await updateDoc(orderRef, { isPago: true, formaPagamento: forma });
  }
}
```

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Função auxiliar: usuário autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Função auxiliar: mesmo company
    function isSameCompany(companyId) {
      return isAuthenticated() 
        && request.auth.token.companyId == companyId;
    }
    
    // Regra para pedidos
    match /companies/{companyId}/pedidos/{pedidoId} {
      allow read: if isSameCompany(companyId);
      allow create: if isSameCompany(companyId)
        && request.resource.data.totalPrice is number
        && request.resource.data.totalPrice >= 0;
      allow update: if isSameCompany(companyId)
        && !('isPago' in request.resource.data.diff(resource.data).affectedKeys());
    }
  }
}
```

### Validação de Entrada
```javascript
// Validar forma de pagamento
const registrarPagamento = async ({ forma, valor, ... }) => {
  const formasValidas = ['dinheiro', 'pix', 'debito', 'credito'];
  if (!formasValidas.includes(forma)) {
    throw new Error('Forma de pagamento inválida');
  }
  
  const valorNum = parseFloat(valor);
  if (isNaN(valorNum) || valorNum <= 0) {
    throw new Error('Valor inválido');
  }
  
  // Processar pagamento
};
```

---

## 6. Tratamento de Erros

### Error Boundaries (Parcial)
```javascript
// Wrapper para queries com retry
const robustFirestoreQuery = async (queryFn, options = {}) => {
  const { maxRetries = 3, userFriendlyMessage } = options;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      if (i === maxRetries - 1) {
        Alert.alert('Erro', userFriendlyMessage || error.message);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Fallback Strategies
```javascript
// Buscar pedidos com múltiplas estratégias
const findOrdersByComanda = async (comandaNumber) => {
  const strategies = [
    // Estratégia 1: Query otimizada
    () => getDocs(query(pedidosRef, where('numeroComanda', '==', comandaNumber))),
    
    // Estratégia 2: Campo legado
    () => getDocs(query(pedidosRef, where('comandaNumber', '==', comandaNumber))),
    
    // Estratégia 3: Filtro client-side
    () => {
      const all = await getDocs(pedidosRef);
      return all.docs.filter(d => d.data().numeroComanda === comandaNumber);
    }
  ];
  
  for (const strategy of strategies) {
    try {
      const results = await strategy();
      if (results.length > 0) return results;
    } catch (error) {
      continue;
    }
  }
  
  return [];
};
```

---

## 7. Testes (Recomendações)

### Estrutura Sugerida
```
__tests__/
├── unit/
│   ├── services/
│   │   ├── OrderService.test.js
│   │   ├── ComandasService.test.js
│   │   └── PagamentosService.test.js
│   └── utils/
│       ├── dateUtils.test.js
│       └── validation.test.js
├── integration/
│   ├── OrderFlow.test.js
│   └── PaymentFlow.test.js
└── e2e/
    ├── CreateOrder.e2e.js
    └── CloseComanda.e2e.js
```

### Exemplo de Teste Unitário
```javascript
// OrderService.test.js
describe('OrderService', () => {
  describe('calculateOrderTotal', () => {
    it('should calculate total correctly', () => {
      const items = ['2x Picanha', '1x Coca-Cola'];
      const priceMap = { 'picanha': 50, 'coca-cola': 5 };
      
      const total = OrderService.calculateOrderTotal(items, priceMap);
      
      expect(total).toBe(105); // 2*50 + 1*5
    });
  });
});
```

---

## 8. Monitoramento e Logs

### Logging Strategy
```javascript
// Logger centralizado
class Logger {
  static info(context, message, data = {}) {
    console.log(`[${context}] ${message}`, data);
    // Enviar para serviço de monitoramento
  }
  
  static error(context, message, error) {
    console.error(`[${context}] ${message}`, error);
    // Enviar para Sentry/Crashlytics
  }
}

// Uso
Logger.info('OrderContext', 'Pedido criado', { orderId, total });
Logger.error('PaymentService', 'Falha ao processar pagamento', error);
```

### Métricas Importantes
- Tempo de resposta de queries
- Taxa de erro por operação
- Uso de cache (hit/miss ratio)
- Tempo de sincronização offline
- Crashes por tela

---

## 9. Boas Práticas Aplicadas

### ✅ Implementadas
- Separação de responsabilidades (Service Layer)
- Componentes reutilizáveis
- Custom Hooks para lógica compartilhada
- Memoization para performance
- Transações atômicas
- Validações server-side
- Cache inteligente
- Offline-first approach

### ⚠️ A Melhorar
- Cobertura de testes
- Error boundaries React
- Logging estruturado
- Monitoramento de performance
- Documentação inline (JSDoc)
- Tipagem TypeScript completa

---

**Documento técnico elaborado por:** Kiro AI  
**Data:** 31/01/2026
