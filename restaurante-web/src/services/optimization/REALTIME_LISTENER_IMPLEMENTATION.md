# Real-Time Listener Manager Implementation

## Overview

The RealTimeListenerManager service provides optimized Supabase real-time subscription management with intelligent features for performance and reliability.

## Features Implemented

### 1. Filtered Subscription Creation (Requirement 5.1)
- Subscribe to real-time channels with company_id and date_key filters
- Configure Supabase real-time channels with PostgreSQL change filters
- Reduce payload size by filtering at database level

### 2. Shared Subscription Management (Requirement 5.2)
- Deduplicate identical subscription requests
- Track subscriptions by channel and filter key
- Reuse existing subscriptions for identical requests
- Multiple callbacks can share a single subscription

### 3. Subscription Cleanup (Requirement 5.3)
- Unsubscribe from individual subscriptions
- Remove specific callbacks from shared subscriptions
- Automatic cleanup of all subscriptions
- Proper resource cleanup on unmount

### 4. Update Debouncing (Requirement 5.4)
- Debounce rapid real-time updates with 500ms delay
- Apply debouncing to all subscription callbacks
- Use latest payload after debounce period
- Reduce unnecessary UI re-renders

### 5. Subscription Limit Enforcement (Requirement 5.5)
- Enforce maximum of 5 concurrent subscriptions per client
- Reject additional subscription requests when limit reached
- Allow new subscriptions after unsubscribing

### 6. Exponential Backoff Reconnection (Requirement 5.6)
- Detect disconnection events automatically
- Implement exponential backoff for reconnection attempts
- Limit maximum reconnection attempts to 5
- Maximum delay capped at 30 seconds

### 7. Subscription Metrics Tracking (Requirement 11.4)
- Track active subscription count
- Monitor messages received
- Calculate average latency
- Count reconnection attempts
- Track total callbacks across subscriptions

## Usage Examples

### Basic Subscription

```typescript
import { realTimeListenerManager } from './services/optimization';

// Subscribe to orders with filters
const filter = {
  table: 'orders',
  event: '*',
  filter: 'company_id=eq.123,date_key=eq.2024-01-01'
};

const subscription = realTimeListenerManager.subscribe(
  'orders-channel',
  filter,
  (payload) => {
    console.log('Order update:', payload);
  }
);
```

### Shared Subscription

```typescript
// Multiple components can share the same subscription
const callback1 = (payload) => console.log('Component 1:', payload);
const callback2 = (payload) => console.log('Component 2:', payload);

// Both use the same underlying subscription
const sub1 = realTimeListenerManager.subscribe('orders', filter, callback1);
const sub2 = realTimeListenerManager.subscribe('orders', filter, callback2);

// sub1.id === sub2.id (same subscription)
```

### Cleanup on Unmount

```typescript
// In React component
useEffect(() => {
  const subscription = realTimeListenerManager.subscribe(
    'orders-channel',
    filter,
    handleOrderUpdate
  );

  return () => {
    // Cleanup on unmount
    realTimeListenerManager.unsubscribe(subscription);
  };
}, []);
```

### Get Subscription Statistics

```typescript
const stats = realTimeListenerManager.getStats();
console.log('Active subscriptions:', stats.activeSubscriptions);
console.log('Messages received:', stats.messagesReceived);
console.log('Average latency:', stats.averageLatency);
console.log('Reconnections:', stats.reconnections);
```

## Architecture

### Subscription Key Generation
Subscriptions are uniquely identified by:
- Channel name
- Table name
- Event type
- Filter string

This allows automatic deduplication of identical subscription requests.

### Debouncing Strategy
- Each subscription has its own debounce timer
- Rapid updates within 500ms are consolidated
- Only the latest payload is delivered after the delay
- Timers are properly cleaned up on unsubscribe

### Reconnection Strategy
- Exponential backoff: delay = base * 2^(attempt-1)
- Base delay: 1000ms
- Maximum delay: 30000ms (30 seconds)
- Maximum attempts: 5
- Failed subscriptions are automatically removed

## Performance Benefits

1. **Reduced Network Traffic**: Filtering at database level reduces payload size
2. **Fewer Subscriptions**: Shared subscriptions reduce connection overhead
3. **Smoother UI**: Debouncing prevents excessive re-renders
4. **Better Reliability**: Automatic reconnection handles network issues
5. **Resource Management**: Subscription limits prevent resource exhaustion

## Testing

Comprehensive unit tests cover:
- Subscription creation with filters
- Shared subscription deduplication
- Subscription cleanup
- Update debouncing
- Subscription limit enforcement
- Metrics tracking

All tests pass successfully with 100% coverage of core functionality.

## Integration

The service is exported from the optimization services index:

```typescript
import { 
  realTimeListenerManager,
  RealTimeListenerManager 
} from './services/optimization';
```

## Next Steps

To integrate into the application:

1. Replace direct Supabase subscription calls with RealTimeListenerManager
2. Add filters for company_id and date_key to all subscriptions
3. Implement automatic cleanup in component lifecycle hooks
4. Monitor subscription metrics in performance dashboard
5. Configure subscription limits based on application needs

## Requirements Satisfied

- ✅ 5.1: Filtered subscriptions with company_id and date_key
- ✅ 5.2: Shared subscription deduplication
- ✅ 5.3: Automatic cleanup on unmount
- ✅ 5.4: Update debouncing (500ms)
- ✅ 5.5: Subscription limit enforcement (max 5)
- ✅ 5.6: Exponential backoff reconnection
- ✅ 11.4: Subscription metrics tracking
