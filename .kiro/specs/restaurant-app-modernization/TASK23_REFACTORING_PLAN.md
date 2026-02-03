# Task 23 Refactoring Plan - Business Logic Extraction

**Date:** 2026-02-03  
**Status:** 🔄 IN PROGRESS  
**Task:** 23. Refatorar Lógica de Negócio

---

## Current State Analysis

### OrderContext.tsx - 455 lines ❌
**Target:** <200 lines  
**Current Issues:**
- Contains business logic (price calculation, statistics)
- Contains Firestore queries
- Contains data transformation logic
- Mixes state management with business operations

**What Should Stay in Context:**
- State management (orders array, loading, error)
- React hooks (useState, useEffect, useContext)
- Event handlers that delegate to services
- UI-specific logic

**What Should Move to Services:**
- Price calculations → OrderService
- Statistics queries → StatisticsService (new)
- Firestore operations → OrderFirestoreService (already exists)
- Data transformations → OrderService

### AuthContext.tsx - ~300 lines ❌
**Target:** <200 lines  
**Current Issues:**
- Contains authentication logic
- Contains user profile management
- Contains role checking logic

**What Should Stay in Context:**
- User state (user, loading, error)
- Authentication state management
- Event handlers that delegate to AuthService

**What Should Move to Services:**
- Login/logout logic → AuthService (already exists)
- User profile operations → AuthService
- Role validation → AuthService

---

## Refactoring Strategy

### Phase 1: Extract Statistics Logic

**Create:** `src/services/StatisticsService.ts`

```typescript
/**
 * StatisticsService
 * Handles all statistics calculations and queries
 */
class StatisticsService {
  /**
   * Get waiter statistics for a period
   */
  async getWaiterStatistics(
    companyId: string,
    waiterId?: string,
    period?: string
  ): Promise<WaiterStatistics> {
    // Extract from OrderContext.getEstatisticasGarcom
  }

  /**
   * Get all waiters statistics
   */
  async getAllWaitersStatistics(
    companyId: string,
    period?: string
  ): Promise<AllWaitersStatistics> {
    // Extract from OrderContext.getEstatisticasTodosGarcons
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(
    companyId: string,
    waiterId?: string,
    period?: string
  ): Promise<PaymentStatistics> {
    // Extract from OrderContext.getEstatisticasPagamentos
  }

  /**
   * Get comanda statistics
   */
  async getComandaStatistics(
    companyId: string,
    waiterId?: string,
    period?: string
  ): Promise<ComandaStatistics> {
    // Extract from OrderContext.getEstatisticasComandas
  }

  /**
   * Get complete statistics
   */
  async getCompleteStatistics(
    companyId: string,
    waiterId?: string,
    monthYear?: string
  ): Promise<CompleteStatistics> {
    // Extract from OrderContext.getEstatisticasCompletas
  }
}
```

### Phase 2: Extract Price Calculation Logic

**Enhance:** `src/services/OrderService.ts`

```typescript
/**
 * OrderService - Enhanced with price calculation
 */
class OrderService {
  /**
   * Calculate total from items using menu prices
   */
  async calculateTotalFromMenu(
    companyId: string,
    items: string[],
    priceMap?: Record<string, number>
  ): Promise<number> {
    // Extract from OrderContext.calculateTotalFromFirestore
  }

  /**
   * Get menu price map (with caching)
   */
  async getMenuPriceMap(companyId: string): Promise<Record<string, number>> {
    // Extract menu loading logic
  }

  /**
   * Parse item string to extract quantity and name
   */
  parseItemString(item: string): { quantity: number; name: string; price: number } {
    // Extract parsing logic
  }
}
```

### Phase 3: Create ServiceContainer

**Create:** `src/services/ServiceContainer.ts`

```typescript
/**
 * ServiceContainer - Dependency Injection
 * Provides centralized access to all services
 */
class ServiceContainer {
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
    // Initialize all services with dependencies
    const orderService = new OrderService();
    const statisticsService = new StatisticsService();
    const authService = AuthService; // Already exists
    const caixaService = CaixaService; // Already exists
    const comandasService = ComandasService; // Already exists

    // Register services
    this.services.set('orderService', orderService);
    this.services.set('statisticsService', statisticsService);
    this.services.set('authService', authService);
    this.services.set('caixaService', caixaService);
    this.services.set('comandasService', comandasService);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }
}

export const serviceContainer = ServiceContainer.getInstance();
```

### Phase 4: Refactor OrderContext

**Refactored OrderContext.tsx** (Target: <200 lines)

```typescript
/**
 * OrderContext - State Management Only
 * Business logic delegated to services
 */
export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Services
  const orderService = serviceContainer.get<OrderService>('orderService');
  const statisticsService = serviceContainer.get<StatisticsService>('statisticsService');

  // Firestore listener (stays in context)
  useEffect(() => {
    if (!user?.companyId) return;

    const unsubscribe = OrderFirestoreService.listenToActiveOrders(
      user.companyId,
      ({ orders: firestoreOrders }) => {
        setOrders(firestoreOrders);
      }
    );

    return () => unsubscribe();
  }, [user?.companyId]);

  // Operations (delegate to services)
  const addOrder = async (
    clientName: string,
    items: string[],
    observations: string,
    // ... other params
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      // Calculate total using service
      const totalPrice = await orderService.calculateTotalFromMenu(
        user!.companyId,
        items
      );

      // Create order using service
      const orderId = await orderService.createOrder({
        clientName,
        items,
        observations,
        totalPrice,
        companyId: user!.companyId,
        // ... other fields
      });

      return orderId;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Statistics (delegate to service)
  const getWaiterStatistics = async (
    waiterId?: string,
    period?: string
  ): Promise<any> => {
    return statisticsService.getWaiterStatistics(
      user!.companyId,
      waiterId,
      period
    );
  };

  // ... other operations

  return (
    <OrderContext.Provider value={{
      orders,
      loading,
      error,
      addOrder,
      getWaiterStatistics,
      // ... other operations
    }}>
      {children}
    </OrderContext.Provider>
  );
};
```

### Phase 5: Create Custom Hooks

**Create:** `src/hooks/useOrderOperations.ts`

```typescript
/**
 * Custom hook for order operations with UI feedback
 */
export const useOrderOperations = () => {
  const { addOrder, editOrder, deleteOrder } = useOrders();
  const { showToast } = useToast();

  const createOrderWithFeedback = async (
    clientName: string,
    items: string[],
    observations: string
  ) => {
    try {
      const orderId = await addOrder(clientName, items, observations);
      showToast('Pedido criado com sucesso', 'success');
      return orderId;
    } catch (error) {
      showToast('Erro ao criar pedido', 'error');
      throw error;
    }
  };

  return {
    createOrder: createOrderWithFeedback,
    // ... other operations with feedback
  };
};
```

**Create:** `src/hooks/useStatistics.ts`

```typescript
/**
 * Custom hook for statistics with caching
 */
export const useStatistics = (waiterId?: string, period?: string) => {
  const { getWaiterStatistics } = useOrders();
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStatistics = async () => {
      setLoading(true);
      try {
        const stats = await getWaiterStatistics(waiterId, period);
        setStatistics(stats);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [waiterId, period]);

  return { statistics, loading };
};
```

---

## Implementation Steps

### Step 1: Create StatisticsService ✅
1. Create `src/services/StatisticsService.ts`
2. Extract all statistics methods from OrderContext
3. Add proper TypeScript interfaces
4. Add caching for statistics queries

### Step 2: Enhance OrderService ✅
1. Add `calculateTotalFromMenu` method
2. Add `getMenuPriceMap` with caching
3. Add `parseItemString` utility
4. Ensure all methods are properly typed

### Step 3: Create ServiceContainer ✅
1. Create `src/services/ServiceContainer.ts`
2. Initialize all services
3. Implement dependency injection
4. Export singleton instance

### Step 4: Refactor OrderContext ✅
1. Remove business logic
2. Keep only state management
3. Delegate operations to services
4. Reduce to <200 lines

### Step 5: Refactor AuthContext ✅
1. Extract authentication logic to AuthService
2. Keep only state management
3. Reduce to <200 lines

### Step 6: Create Custom Hooks ✅
1. Create `useOrderOperations` hook
2. Create `useStatistics` hook
3. Create `useAuth` enhancements
4. Add UI feedback integration

### Step 7: Update Components ✅
1. Update components to use new hooks
2. Remove direct service imports where possible
3. Use custom hooks for common patterns

---

## Benefits

### 1. Separation of Concerns ✅
- Contexts handle state only
- Services handle business logic
- Hooks handle UI integration

### 2. Testability ✅
- Services can be unit tested independently
- Contexts are simpler to test
- Hooks can be tested with React Testing Library

### 3. Reusability ✅
- Services can be used across multiple contexts
- Custom hooks encapsulate common patterns
- Business logic is centralized

### 4. Maintainability ✅
- Smaller, focused files (<200 lines)
- Clear responsibilities
- Easier to understand and modify

### 5. Type Safety ✅
- All services properly typed
- TypeScript interfaces for all data
- Compile-time error checking

---

## File Size Targets

### Before:
- ❌ OrderContext.tsx: 455 lines
- ❌ AuthContext.tsx: ~300 lines

### After:
- ✅ OrderContext.tsx: <200 lines (state management only)
- ✅ AuthContext.tsx: <200 lines (state management only)
- ✅ StatisticsService.ts: ~300 lines (business logic)
- ✅ OrderService.ts: ~400 lines (enhanced with calculations)
- ✅ ServiceContainer.ts: ~100 lines (DI container)
- ✅ Custom hooks: ~50 lines each

---

## Requirements Validation

### ✅ Requirement 23.1: Extract logic from OrderContext to OrderService
**Status:** PLANNED
- Statistics → StatisticsService
- Price calculations → OrderService
- Firestore operations → OrderFirestoreService (already exists)

### ✅ Requirement 23.2: Create service layer with clear interfaces
**Status:** PLANNED
- ServiceContainer for dependency injection
- TypeScript interfaces for all services
- Clear separation of concerns

### ✅ Requirement 23.3: Implement dependency injection for services
**Status:** PLANNED
- ServiceContainer singleton
- Centralized service initialization
- Easy to mock for testing

### ✅ Requirement 23.4: Limit Context components to maximum 200 lines
**Status:** PLANNED
- OrderContext: 455 → <200 lines
- AuthContext: ~300 → <200 lines

### ✅ Requirement 23.5: Create custom hooks for reusable logic
**Status:** PLANNED
- useOrderOperations
- useStatistics
- Enhanced useAuth

---

## Next Steps

1. **Review this plan** with the user
2. **Implement Step 1:** Create StatisticsService
3. **Implement Step 2:** Enhance OrderService
4. **Implement Step 3:** Create ServiceContainer
5. **Implement Step 4:** Refactor OrderContext
6. **Implement Step 5:** Refactor AuthContext
7. **Implement Step 6:** Create custom hooks
8. **Implement Step 7:** Update components
9. **Test thoroughly:** Ensure no regressions
10. **Mark Task 23 complete**

---

## Estimated Effort

- **StatisticsService:** 2-3 hours
- **OrderService enhancement:** 1-2 hours
- **ServiceContainer:** 1 hour
- **OrderContext refactor:** 2-3 hours
- **AuthContext refactor:** 1-2 hours
- **Custom hooks:** 1-2 hours
- **Component updates:** 2-3 hours
- **Testing:** 2-3 hours

**Total:** 12-19 hours of development work

---

## Conclusion

This refactoring will significantly improve code quality, maintainability, and testability. The separation of concerns makes the codebase easier to understand and modify. The use of dependency injection and custom hooks follows React best practices and modern TypeScript patterns.

**Ready to proceed with implementation upon user approval.**
