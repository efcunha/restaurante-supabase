# Performance Monitoring Setup Guide

## Overview

This guide covers the implementation of Firebase Performance Monitoring in the restaurant app. The system tracks latency, Firestore operations, and custom metrics to ensure optimal performance and identify bottlenecks.

## Features

- **Automatic Trace Tracking**: Monitor critical operations with automatic timing
- **Firestore Operations Counting**: Track reads, writes, and deletes
- **P95 Latency Calculation**: Identify performance outliers
- **Automatic Alerts**: Get notified when latency exceeds 500ms threshold
- **Real-time Dashboard**: Visualize metrics in the app
- **Metrics Export**: Export data for analysis

## Architecture

### PerformanceMonitoringService

Core service that provides:
- Trace management (start/stop)
- Operation tracking with automatic timing
- Firestore operation counting
- Metrics aggregation and analysis
- Alert triggering for performance issues

### PerformanceDashboard

React Native component that displays:
- Summary metrics (operations, success rate, latency)
- Firestore operations breakdown
- Critical operations list with detailed metrics
- Recent failures log
- Color-coded indicators for quick assessment

## Installation

### 1. Firebase Performance SDK

The Firebase Performance SDK is already included in the project. Verify it's in your `package.json`:

```json
{
  "dependencies": {
    "firebase": "^10.x.x"
  }
}
```

### 2. Enable Performance Monitoring in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Performance** in the left sidebar
4. Click **Get Started** if not already enabled

### 3. Configure firebase.json

Add Performance Monitoring configuration to your `firebase.json`:

```json
{
  "performance": {
    "enabled": true,
    "dataCollectionEnabled": true
  }
}
```

## Usage

### Basic Operation Tracking

Track any async operation with automatic timing:

```typescript
import PerformanceMonitoringService from '../services/PerformanceMonitoringService';

// Track a critical operation
const result = await PerformanceMonitoringService.trackOperation(
  'fetchOrders',
  async () => {
    return await OrderService.getActiveOrders(companyId);
  },
  { companyId, userId } // Optional metadata
);
```

### Manual Trace Management

For more control, use manual trace start/stop:

```typescript
// Start trace
PerformanceMonitoringService.startTrace('complexOperation');

try {
  // Your operation here
  await doSomething();
  
  // Stop trace with metadata
  PerformanceMonitoringService.stopTrace('complexOperation', {
    itemCount: '100',
    status: 'success'
  });
} catch (error) {
  PerformanceMonitoringService.stopTrace('complexOperation', {
    status: 'error',
    error: error.message
  });
}
```

### Firestore Operations Tracking

Track Firestore operations to monitor database usage:

```typescript
// Track reads
PerformanceMonitoringService.trackFirestoreRead(10); // 10 documents read

// Track writes
PerformanceMonitoringService.trackFirestoreWrite(1);

// Track deletes
PerformanceMonitoringService.trackFirestoreDelete(5);
```

### Get Metrics

Retrieve performance metrics programmatically:

```typescript
// Get summary
const summary = PerformanceMonitoringService.getMetricsSummary();
console.log('Total operations:', summary.totalOperations);
console.log('Success rate:', summary.successRate);
console.log('P95 latency:', summary.p95Latency);

// Get P95 latency for specific operation
const p95 = PerformanceMonitoringService.getP95Latency('fetchOrders');

// Get average latency
const avg = PerformanceMonitoringService.getAverageLatency('fetchOrders');

// Get success rate
const rate = PerformanceMonitoringService.getSuccessRate('fetchOrders');
```

## Integration Examples

### Example 1: OrderService Integration

```typescript
// src/services/OrderService.ts
import PerformanceMonitoringService from './PerformanceMonitoringService';

export class OrderService {
  async getActiveOrders(companyId: string) {
    return await PerformanceMonitoringService.trackOperation(
      'OrderService.getActiveOrders',
      async () => {
        PerformanceMonitoringService.trackFirestoreRead();
        
        const ordersRef = collection(db, `companies/${companyId}/orders`);
        const q = query(ordersRef, where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        
        PerformanceMonitoringService.trackFirestoreRead(snapshot.size);
        
        return snapshot.docs.map(doc => doc.data());
      },
      { companyId }
    );
  }

  async createOrder(companyId: string, orderData: any) {
    return await PerformanceMonitoringService.trackOperation(
      'OrderService.createOrder',
      async () => {
        const ordersRef = collection(db, `companies/${companyId}/orders`);
        const docRef = await addDoc(ordersRef, orderData);
        
        PerformanceMonitoringService.trackFirestoreWrite();
        
        return docRef.id;
      },
      { companyId, orderType: orderData.type }
    );
  }
}
```

### Example 2: CaixaService Integration

```typescript
// src/services/CaixaService.ts
import PerformanceMonitoringService from './PerformanceMonitoringService';

export class CaixaService {
  async getDailySummary(companyId: string, dateKey: string) {
    return await PerformanceMonitoringService.trackOperation(
      'CaixaService.getDailySummary',
      async () => {
        // Track the query
        PerformanceMonitoringService.trackFirestoreRead();
        
        const summaryRef = doc(
          db,
          `companies/${companyId}/dailySummaries/${dateKey}`
        );
        const snapshot = await getDoc(summaryRef);
        
        if (!snapshot.exists()) {
          return null;
        }
        
        return snapshot.data();
      },
      { companyId, dateKey }
    );
  }
}
```

### Example 3: React Component Integration

```typescript
// src/screens/AdminScreen.tsx
import React, { useEffect, useState } from 'react';
import PerformanceMonitoringService from '../services/PerformanceMonitoringService';

export default function AdminScreen() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    await PerformanceMonitoringService.trackOperation(
      'AdminScreen.loadOrders',
      async () => {
        const data = await OrderService.getActiveOrders(companyId);
        setOrders(data);
      }
    );
  };

  return (
    <View>
      {/* Your UI */}
    </View>
  );
}
```

## Dashboard Integration

### Add Dashboard to Navigation

```typescript
// App.js or navigation setup
import PerformanceDashboard from './src/components/PerformanceDashboard';

// Add to your navigation stack
<Stack.Screen 
  name="PerformanceDashboard" 
  component={PerformanceDashboard}
  options={{ title: 'Performance Metrics' }}
/>
```

### Access Dashboard from Admin Screen

```typescript
// src/screens/AdminScreen.tsx
<TouchableOpacity
  onPress={() => navigation.navigate('PerformanceDashboard')}
>
  <Text>📊 Ver Métricas de Performance</Text>
</TouchableOpacity>
```

## Metrics Interpretation

### Latency Colors

- **Green (<200ms)**: Excellent performance
- **Orange (200-500ms)**: Acceptable, monitor for trends
- **Red (>500ms)**: Critical, requires optimization

### Success Rate Colors

- **Green (≥95%)**: Healthy operation
- **Orange (80-95%)**: Some failures, investigate
- **Red (<80%)**: High failure rate, urgent attention needed

### Key Metrics

1. **Total Operations**: Number of tracked operations
2. **Success Rate**: Percentage of successful operations
3. **Average Latency**: Mean response time
4. **P95 Latency**: 95th percentile (outlier detection)
5. **Firestore Reads/Writes/Deletes**: Database operation counts

## Alerts

### Automatic Latency Alerts

The service automatically logs warnings when operations exceed 500ms:

```
[PerformanceMonitoring] ⚠️ LATENCY ALERT: OrderService.getActiveOrders took 650ms (threshold: 500ms)
```

Alerts have a 5-minute cooldown to prevent spam.

### Custom Alert Integration

Extend the alert system to send notifications:

```typescript
// Modify triggerLatencyAlert in PerformanceMonitoringService.ts
private triggerLatencyAlert(operationName: string, duration: number): void {
  console.warn(
    `[PerformanceMonitoring] ⚠️ LATENCY ALERT: ${operationName} took ${duration}ms`
  );

  // Send to monitoring service
  if (!__DEV__) {
    // Example: Send to Sentry, Datadog, etc.
    Sentry.captureMessage('Performance Alert', {
      level: 'warning',
      extra: { operationName, duration }
    });
  }
}
```

## Best Practices

### 1. Track Critical Operations Only

Don't track every operation. Focus on:
- Database queries
- API calls
- Complex calculations
- User-facing operations

### 2. Use Meaningful Operation Names

```typescript
// Good
'OrderService.getActiveOrders'
'CaixaService.calculateDailySummary'
'PaymentService.processPayment'

// Bad
'operation1'
'getData'
'process'
```

### 3. Add Relevant Metadata

```typescript
PerformanceMonitoringService.trackOperation(
  'fetchOrders',
  operation,
  {
    companyId,
    userId,
    orderCount: '50',
    filterType: 'active'
  }
);
```

### 4. Monitor Firestore Operations

Always track Firestore operations to identify expensive queries:

```typescript
const snapshot = await getDocs(query);
PerformanceMonitoringService.trackFirestoreRead(snapshot.size);
```

### 5. Regular Dashboard Review

- Check dashboard daily during development
- Review weekly in production
- Investigate any red metrics immediately
- Track trends over time

## Troubleshooting

### Issue: No metrics showing in dashboard

**Solution**: Ensure operations are being tracked:

```typescript
// Verify service is imported and used
import PerformanceMonitoringService from '../services/PerformanceMonitoringService';

// Check console for initialization message
// Should see: "[PerformanceMonitoring] Initialized successfully"
```

### Issue: High latency alerts

**Solution**: Investigate the operation:

1. Check Firestore query complexity
2. Verify network conditions
3. Look for N+1 query problems
4. Consider caching frequently accessed data

### Issue: High Firestore read count

**Solution**: Optimize queries:

1. Use composite indexes
2. Implement caching layer
3. Reduce listener subscriptions
4. Use pagination for large datasets

### Issue: Low success rate

**Solution**: Check error logs:

1. Review recent failures in dashboard
2. Check error messages
3. Verify network connectivity
4. Validate data integrity

## Performance Targets

Based on requirements, aim for:

- **P95 Latency**: <500ms for all critical operations
- **Success Rate**: >95% for all operations
- **Firestore Reads**: Reduce by 60% compared to baseline
- **Cache Hit Rate**: >70% for cached operations

## Monitoring in Production

### 1. Firebase Console

View aggregated metrics in Firebase Console:
- Go to Performance section
- View traces and metrics
- Set up custom alerts

### 2. In-App Dashboard

Access real-time metrics:
- Navigate to Performance Dashboard
- Review current metrics
- Export data for analysis

### 3. Automated Reports

Set up automated reporting:

```typescript
// Example: Daily metrics export
setInterval(() => {
  const metrics = PerformanceMonitoringService.exportMetrics();
  // Send to analytics service or save to file
}, 24 * 60 * 60 * 1000); // Daily
```

## Migration Checklist

- [ ] Firebase Performance enabled in console
- [ ] firebase.json configured
- [ ] PerformanceMonitoringService integrated in critical services
- [ ] Firestore operations tracked
- [ ] Dashboard added to navigation
- [ ] Team trained on metrics interpretation
- [ ] Baseline metrics recorded
- [ ] Alert thresholds configured
- [ ] Production monitoring active

## Support

For issues or questions:
1. Check Firebase Performance documentation
2. Review console logs for errors
3. Verify Firebase configuration
4. Check network connectivity

## Related Documentation

- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [WORKFLOWS.md](./WORKFLOWS.md) - Development workflows
