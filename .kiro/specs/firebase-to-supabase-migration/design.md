# Firebase to Supabase Migration - Design Document

## 1. Architecture Overview

### 1.1 Current State (Hybrid)
```
┌─────────────────┐
│   React Native  │
│      App        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│Firebase│ │Supabase │
│  (70%) │ │  (30%)  │
└────────┘ └─────────┘
```

### 1.2 Target State (Supabase Only)
```
┌─────────────────┐
│   React Native  │
│      App        │
└────────┬────────┘
         │
    ┌────▼────────┐
    │  Supabase   │
    │   (100%)    │
    └─────────────┘
```

## 2. Database Schema Design

### 2.1 Missing Tables to Create

#### 2.1.1 cash_registers
```sql
create table public.cash_registers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id),
  opened_by uuid references public.profiles(id),
  opened_by_name text,
  opened_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id),
  closed_by_name text,
  closed_at timestamptz,
  status text check (status in ('aberto', 'fechado')) default 'aberto',
  initial_value numeric(10,2) not null default 0,
  expected_balance numeric(10,2) default 0,
  actual_balance numeric(10,2),
  difference numeric(10,2),
  sales_by_method jsonb default '{}',
  notes text,
  date_key date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### 2.1.2 cash_movements
```sql
create table public.cash_movements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id),
  cash_register_id uuid references public.cash_registers(id),
  type text check (type in ('reforco', 'sangria', 'abertura', 'fechamento')) not null,
  value numeric(10,2) not null,
  reason text,
  user_id uuid references public.profiles(id),
  user_name text,
  created_at timestamptz default now()
);
```

#### 2.1.3 comandas
```sql
create table public.comandas (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id),
  comanda_number int not null,
  date_key date not null default current_date,
  status text check (status in ('aberta', 'fechada', 'cancelada')) default 'aberta',
  table_number int,
  client_name text,
  total_consumed numeric(10,2) default 0,
  total_paid numeric(10,2) default 0,
  open_balance numeric(10,2) default 0,
  received_by jsonb default '[]',
  opened_at timestamptz not null default now(),
  opened_by uuid references public.profiles(id),
  opened_by_name text,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  closed_by_name text,
  canceled_at timestamptz,
  canceled_by uuid references public.profiles(id),
  canceled_by_name text,
  cancel_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, comanda_number, date_key)
);
```

#### 2.1.4 employees (extend profiles)
```sql
-- Add employee-specific fields to profiles
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists active boolean default true;
alter table public.profiles add column if not exists hire_date date;
```

### 2.2 Indexes for Performance
```sql
-- Orders
create index if not exists idx_orders_company_date on public.orders(company_id, date_key);
create index if not exists idx_orders_comanda on public.orders(company_id, comanda_number, date_key);
create index if not exists idx_orders_status on public.orders(company_id, status);

-- Comandas
create index if not exists idx_comandas_company_date on public.comandas(company_id, date_key);
create index if not exists idx_comandas_status on public.comandas(company_id, status);

-- Cash Registers
create index if not exists idx_cash_registers_company_date on public.cash_registers(company_id, date_key);
create index if not exists idx_cash_registers_status on public.cash_registers(company_id, status);
```

### 2.3 RLS Policies

All tables follow the same multi-tenant pattern:
```sql
-- Users can only access data from their company
create policy "Users can view own company data"
  on public.{table_name}
  for select
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

-- Users can insert data for their company
create policy "Users can insert own company data"
  on public.{table_name}
  for insert
  with check (company_id = (select company_id from public.profiles where id = auth.uid()));

-- Users can update data for their company
create policy "Users can update own company data"
  on public.{table_name}
  for update
  using (company_id = (select company_id from public.profiles where id = auth.uid()));
```

## 3. Service Migration Strategy

### 3.1 Migration Phases

#### Phase 1: Database Schema (Priority: Critical)
1. Create missing tables migration
2. Add indexes
3. Configure RLS policies
4. Test schema with sample data

#### Phase 2: Core Services (Priority: High)
1. **FuncionariosService** → Use Supabase profiles
2. **OrderFirestoreService** → Remove, use SupabaseOrderService only
3. **AuditService** → Use Supabase audit_logs table
4. **RateLimiterService** → Use Supabase rate_limits table

#### Phase 3: Supporting Services (Priority: Medium)
1. **InventoryService** → Migrate to Supabase
2. **PaginationService** → Adapt for Supabase queries
3. **QueryOptimizerService** → Adapt for PostgreSQL
4. **SyncService** → Use Supabase Realtime
5. **ComandaNumberService** → Use PostgreSQL sequences
6. **OrderListenerService** → Use Supabase Realtime

#### Phase 4: Advanced Services (Priority: Low)
1. **PerformanceMonitoringService** → Remove or use Supabase Analytics
2. **PerformanceService** → Remove or use Supabase Analytics
3. **PaymentValidationService** → Migrate to Supabase Edge Functions
4. **UnifiedQueryService** → Migrate to Supabase RPC
5. **FirebaseOptimizations** → Remove (not needed)
6. **MigrationEngine** → Archive (migration complete)
7. **SuccessMetricsService** → Use Supabase queries

### 3.2 Service Migration Pattern

Each service follows this pattern:

**Before (Firebase):**
```typescript
import { db } from '../config/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

const getItems = async (companyId: string) => {
  const q = query(
    collection(db, 'items'),
    where('companyId', '==', companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

**After (Supabase):**
```typescript
import { supabase } from '../config/SupabaseConfig';

const getItems = async (companyId: string) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('company_id', companyId);
  
  if (error) throw error;
  return data;
};
```

### 3.3 Real-time Migration

**Before (Firestore):**
```typescript
import { onSnapshot, query, collection, where } from 'firebase/firestore';

const listenToOrders = (companyId: string, callback: Function) => {
  const q = query(
    collection(db, 'orders'),
    where('companyId', '==', companyId)
  );
  return onSnapshot(q, snapshot => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  });
};
```

**After (Supabase):**
```typescript
import { RealtimeChannel } from '@supabase/supabase-js';

const listenToOrders = (companyId: string, callback: Function) => {
  const channel = supabase
    .channel('orders')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: `company_id=eq.${companyId}`
    }, payload => {
      // Fetch updated data
      fetchOrders(companyId).then(callback);
    })
    .subscribe();
  
  return () => channel.unsubscribe();
};
```

## 4. Authentication Migration

### 4.1 Remove Dual Auth

**Files to Delete:**
- `src/context/AuthContext.firebase.tsx` (legacy)
- `src/services/AuthService.ts` (redundant)

**Files to Keep:**
- `src/context/AuthContext.tsx` (Supabase version)

### 4.2 Biometric Auth

Already migrated, uses `BiometricAuthService` with Supabase credentials.

### 4.3 Custom Claims

**Before (Firebase):**
- Stored in Firebase ID token
- Refreshed via Firebase Functions

**After (Supabase):**
- Stored in `profiles.role` field
- Fetched with user profile query
- No refresh needed (always current)

## 5. Data Migration Strategy

### 5.1 Migration Script Architecture

```typescript
// scripts/complete_migration.ts

interface MigrationStep {
  name: string;
  migrate: () => Promise<void>;
  validate: () => Promise<boolean>;
  rollback: () => Promise<void>;
}

const migrationSteps: MigrationStep[] = [
  {
    name: 'Migrate Companies',
    migrate: async () => { /* ... */ },
    validate: async () => { /* ... */ },
    rollback: async () => { /* ... */ }
  },
  {
    name: 'Migrate Users/Profiles',
    migrate: async () => { /* ... */ },
    validate: async () => { /* ... */ },
    rollback: async () => { /* ... */ }
  },
  // ... more steps
];
```

### 5.2 Migration Order

1. **Companies** (tenants)
2. **Users/Profiles** (employees)
3. **Products** (menu items)
4. **Cash Registers** (historical)
5. **Comandas** (historical)
6. **Orders** (historical)
7. **Audit Logs** (historical)
8. **Statistics** (recalculate)

### 5.3 Validation Checks

For each entity:
- Count matches (Firestore vs Supabase)
- Sample data integrity
- Foreign key relationships valid
- No orphaned records

## 6. Edge Functions Migration

### 6.1 Firebase Functions to Migrate

1. **refreshUserClaims** → Not needed (use profiles table)
2. **validatePayment** → Migrate to Supabase Edge Function or RPC
3. **aggregateStatistics** → Use Supabase triggers

### 6.2 Supabase RPC Functions

```sql
-- Example: Validate payment
create or replace function public.validate_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
  v_result jsonb;
begin
  -- Fetch order
  select * into v_order from public.orders where id = p_order_id;
  
  -- Validation logic
  if v_order.total_amount != p_amount then
    return jsonb_build_object('valid', false, 'error', 'Amount mismatch');
  end if;
  
  -- Update order
  update public.orders
  set is_paid = true, payment_method = p_payment_method
  where id = p_order_id;
  
  return jsonb_build_object('valid', true);
end;
$$;
```

## 7. Configuration Changes

### 7.1 Remove Firebase Config

**Delete:**
- `src/config/firebaseConfig.js`

**Update package.json:**
```json
{
  "dependencies": {
    // Remove:
    // "firebase": "^12.6.0",
    // "firebase-admin": "^12.7.0"
  }
}
```

### 7.2 Environment Variables

**Remove:**
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
```

**Keep:**
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## 8. Testing Strategy

### 8.1 Unit Tests
- Test each migrated service independently
- Mock Supabase client
- Verify query construction
- Test error handling

### 8.2 Integration Tests
- Test service interactions
- Verify RLS policies
- Test real-time subscriptions
- Validate offline queue

### 8.3 E2E Tests
- Test complete user flows
- Verify data consistency
- Test authentication flows
- Validate biometric auth

### 8.4 Performance Tests
- Benchmark query performance
- Test with production data volume
- Verify real-time latency
- Test offline sync performance

## 9. Rollback Plan

### 9.1 Dual-Write Period

During migration, write to both Firebase and Supabase:
```typescript
const createOrder = async (order: Order) => {
  // Write to Supabase (primary)
  const supabaseResult = await supabaseOrderService.create(order);
  
  // Write to Firebase (backup)
  try {
    await firebaseOrderService.create(order);
  } catch (error) {
    console.warn('Firebase backup write failed:', error);
  }
  
  return supabaseResult;
};
```

### 9.2 Rollback Triggers

If critical issues detected:
1. Switch reads back to Firebase
2. Stop Supabase writes
3. Investigate and fix issues
4. Resume migration

### 9.3 Data Reconciliation

After rollback:
- Compare Firebase and Supabase data
- Identify discrepancies
- Sync missing records
- Validate integrity

## 10. Deployment Strategy

### 10.1 Phased Rollout

1. **Week 1**: Database schema + Core services (10% users)
2. **Week 2**: Supporting services (25% users)
3. **Week 3**: Advanced services (50% users)
4. **Week 4**: Full migration (100% users)
5. **Week 5**: Remove Firebase dependencies

### 10.2 Feature Flags

```typescript
// config/featureFlags.ts
export const MIGRATION_FLAGS = {
  useSupabaseOrders: true,
  useSupabaseAuth: true,
  useSupabaseEmployees: false, // Gradual rollout
  useSupabaseAudit: false,
};
```

### 10.3 Monitoring

- Track error rates
- Monitor query performance
- Watch real-time connection stability
- Alert on RLS policy violations

## 11. Success Criteria

- ✅ All Supabase tables created and tested
- ✅ All services migrated to Supabase
- ✅ Firebase dependencies removed
- ✅ All tests passing
- ✅ Performance benchmarks met
- ✅ Zero data loss validated
- ✅ Production deployment successful
