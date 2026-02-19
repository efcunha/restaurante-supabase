# N+1 Query Pattern Refactoring Guide

## Overview

This document provides guidance on identifying and refactoring N+1 query patterns in the codebase.

**Requirement 1.3**: Refactor N+1 patterns to use batch queries or joins

## What is an N+1 Query Pattern?

An N+1 query pattern occurs when:
1. You execute 1 query to fetch N records
2. Then execute N additional queries (one for each record) to fetch related data

This results in N+1 total queries instead of 1-2 optimized queries.

## Common N+1 Patterns

### Pattern 1: Loop with Individual Queries

**BAD** (N+1 Pattern):
```typescript
// Fetch orders
const orders = await supabase.from('orders').select('*');

// For each order, fetch items (N queries)
for (const order of orders) {
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);
  order.items = items;
}
```

**GOOD** (Optimized with Join):
```typescript
// Single query with join
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (*)
  `);
```

### Pattern 2: Map with Promises

**BAD** (N+1 Pattern):
```typescript
const orderIds = ['id1', 'id2', 'id3'];

// N queries executed in parallel
const orders = await Promise.all(
  orderIds.map(id => 
    supabase.from('orders').select('*').eq('id', id).single()
  )
);
```

**GOOD** (Optimized with Batch):
```typescript
const orderIds = ['id1', 'id2', 'id3'];

// Single query with IN clause
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .in('id', orderIds);
```

### Pattern 3: Sequential Updates

**BAD** (N+1 Pattern):
```typescript
const orderIds = ['id1', 'id2', 'id3'];

// N update queries
for (const id of orderIds) {
  await supabase
    .from('orders')
    .update({ is_paid: true })
    .eq('id', id);
}
```

**GOOD** (Optimized with Batch Update):
```typescript
const orderIds = ['id1', 'id2', 'id3'];

// Single update query
await supabase
  .from('orders')
  .update({ is_paid: true })
  .in('id', orderIds);
```

## Refactored Examples from Codebase

### Example 1: PagamentosService.marcarPedidosComoPagos

**Before** (N+1 Pattern):
```typescript
async marcarPedidosComoPagos(companyId: string, pedidosIds: string[]) {
  const updatePromises = [];

  for (const pedidoId of pedidosIds) {
    // SELECT query for each ID
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('company_id', companyId)
      .eq('id', pedidoId);

    if (orders && orders.length > 0) {
      // UPDATE query for each ID
      updatePromises.push(
        supabase
          .from('orders')
          .update({ is_paid: true })
          .eq('id', orders[0].id)
      );
    }
  }

  await Promise.all(updatePromises);
}
```

**After** (Optimized):
```typescript
async marcarPedidosComoPagos(companyId: string, pedidosIds: string[]) {
  // Single UPDATE query for all IDs
  const { error } = await supabase
    .from('orders')
    .update({ is_paid: true })
    .eq('company_id', companyId)
    .in('id', pedidosIds);

  if (error) {
    throw new Error(`Failed to mark orders as paid: ${error.message}`);
  }
}
```

**Performance Impact**:
- Before: 2N queries (N SELECTs + N UPDATEs)
- After: 1 query
- For 10 orders: 20 queries → 1 query (20x improvement)

## Using the N+1 Optimizer Utilities

### Batch Fetch by IDs

```typescript
import { batchFetchByIds } from '../utils/n1QueryOptimizer';

// Instead of loop
const orderIds = ['id1', 'id2', 'id3'];
const ordersMap = await batchFetchByIds(supabase, 'orders', orderIds);

// Access orders by ID
const order1 = ordersMap.get('id1');
```

### Batch Fetch by Foreign Key

```typescript
import { batchFetchByForeignKey } from '../utils/n1QueryOptimizer';

// Fetch all items for multiple orders in one query
const orderIds = ['id1', 'id2', 'id3'];
const itemsByOrderId = await batchFetchByForeignKey(
  supabase,
  'order_items',
  'order_id',
  orderIds
);

// Access items for each order
const order1Items = itemsByOrderId.get('id1') || [];
```

### Batch Update

```typescript
import { batchUpdate } from '../utils/n1QueryOptimizer';

// Update multiple records efficiently
const updates = [
  { id: 'id1', data: { status: 'completed' } },
  { id: 'id2', data: { status: 'completed' } },
  { id: 'id3', data: { status: 'pending' } }
];

await batchUpdate(supabase, 'orders', updates);
```

### Fetch with Joins

```typescript
import { fetchWithJoin } from '../utils/n1QueryOptimizer';

// Fetch orders with items in one query
const orders = await fetchWithJoin(
  supabase,
  'orders',
  'order_items(*)',
  { company_id: 'company123' }
);
```

## Detection Tools

### Runtime N+1 Detection

```typescript
import { n1Detector } from '../utils/n1QueryOptimizer';

// Track queries in your code
async function fetchOrders() {
  n1Detector.trackQuery('orders', 'select', 'fetchOrders');
  const { data } = await supabase.from('orders').select('*');
  
  for (const order of data) {
    // This will trigger a warning if executed > 5 times
    n1Detector.trackQuery('order_items', 'select', 'fetchOrders');
    const items = await supabase.from('order_items').select('*').eq('order_id', order.id);
  }
}

// View statistics
console.log(n1Detector.getStats());
```

## Checklist for Refactoring

- [ ] Identify loops that execute queries
- [ ] Check for `Promise.all` with `map` containing queries
- [ ] Look for sequential updates/inserts
- [ ] Replace with batch operations or joins
- [ ] Test performance before and after
- [ ] Verify data integrity is maintained
- [ ] Update tests to reflect new query patterns

## Performance Benchmarks

| Pattern | Before | After | Improvement |
|---------|--------|-------|-------------|
| Fetch 100 orders with items | 101 queries | 1 query | 101x |
| Update 50 orders | 50 queries | 1 query | 50x |
| Fetch orders by 20 IDs | 20 queries | 1 query | 20x |

## Best Practices

1. **Always use joins** when fetching related data
2. **Use IN clauses** for batch fetches by ID
3. **Batch updates** when updating multiple records with same data
4. **Use RPC functions** for complex batch operations
5. **Monitor query counts** in development with n1Detector
6. **Profile queries** with EXPLAIN ANALYZE to verify optimization

## References

- Supabase Joins: https://supabase.com/docs/guides/database/joins-and-nesting
- PostgreSQL IN clause: https://www.postgresql.org/docs/current/functions-comparisons.html
- Query Optimization: See QueryOptimizerService documentation
