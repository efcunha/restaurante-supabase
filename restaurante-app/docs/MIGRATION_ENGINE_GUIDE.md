# Migration Engine Guide

## Overview

The Migration Engine provides a zero-downtime data migration system for the restaurant app. It supports dual-write mode, batch processing, validation, and rollback capabilities to ensure safe and reliable data migrations.

## Features

- **Dual-Write Mode**: Write to both old and new structures simultaneously
- **Batch Processing**: Migrate data in batches of 500 documents to avoid timeouts
- **Continuous Validation**: Verify data consistency between source and target
- **Rollback Capability**: Revert migrations at any phase
- **Progress Tracking**: Monitor migration status in real-time
- **Error Handling**: Comprehensive error logging and recovery

## Architecture

### Migration Phases

1. **NOT_STARTED**: Migration created but not yet started
2. **DUAL_WRITE**: Writing to both old and new structures
3. **MIGRATING**: Actively migrating data in batches
4. **VALIDATING**: Verifying data consistency
5. **COMPLETE**: Migration successfully completed
6. **ROLLED_BACK**: Migration reverted

### Migration Status

- **PENDING**: Waiting to start
- **IN_PROGRESS**: Currently executing
- **SUCCESS**: Completed successfully
- **FAILED**: Encountered errors
- **ROLLED_BACK**: Successfully reverted

## Usage

### 1. Basic Migration

```typescript
import MigrationEngine from '../services/MigrationEngine';

// Define migration configuration
const config = {
  name: 'orders_restructure',
  sourceCollection: 'orders',
  targetCollection: 'companies/{companyId}/orders',
  batchSize: 500,
};

// Start migration
const migrationId = await MigrationEngine.startMigration(config);

// Execute migration
await MigrationEngine.migrateInBatches(migrationId, config);

// Validate results
const validation = await MigrationEngine.validateConsistency(migrationId, config);

if (!validation.isValid) {
  console.error('Validation failed:', validation.inconsistencies);
  // Optionally rollback
  await MigrationEngine.rollback(migrationId, config);
}
```

### 2. Migration with Data Transformation

```typescript
const config = {
  name: 'normalize_comanda_fields',
  sourceCollection: 'companies/{companyId}/orders',
  targetCollection: 'companies/{companyId}/orders',
  batchSize: 500,
  transformFn: (data) => {
    // Transform numeroComanda -> comandaNumber
    return {
      ...data,
      comandaNumber: data.numeroComanda || data.comandaNumber,
      createdBy: data.criadoPor || data.createdBy,
      // Remove old fields
      numeroComanda: undefined,
      criadoPor: undefined,
    };
  },
};

const migrationId = await MigrationEngine.startMigration(config);
await MigrationEngine.migrateInBatches(migrationId, config);
```

### 3. Migration with Custom Validation

```typescript
const config = {
  name: 'migrate_payments',
  sourceCollection: 'payments',
  targetCollection: 'companies/{companyId}/payments',
  batchSize: 500,
  validateFn: (source, target) => {
    // Custom validation logic
    return (
      source.amount === target.amount &&
      source.isPago === target.isPago &&
      source.paymentMethod === target.paymentMethod
    );
  },
};

const migrationId = await MigrationEngine.startMigration(config);
await MigrationEngine.migrateInBatches(migrationId, config);

const validation = await MigrationEngine.validateConsistency(migrationId, config);
console.log('Validation result:', validation);
```

### 4. Dual-Write Mode

```typescript
// Enable dual-write for a collection
MigrationEngine.enableDualWrite('orders');

// Now all writes go to both old and new structures
await MigrationEngine.dualWrite(
  'orders/order123',
  'companies/company1/orders/order123',
  orderData,
  (data) => ({
    ...data,
    comandaNumber: data.numeroComanda,
  })
);

// Disable dual-write when migration is complete
MigrationEngine.disableDualWrite('orders');
```

### 5. Monitor Progress

```typescript
// Get progress for specific migration
const progress = MigrationEngine.getProgress(migrationId);
console.log(`Progress: ${progress.migratedDocuments}/${progress.totalDocuments}`);

// Get all active migrations
const allMigrations = MigrationEngine.getAllMigrations();
console.log(`Active migrations: ${allMigrations.length}`);

// Generate detailed report
const report = MigrationEngine.generateReport(migrationId);
console.log(report);
```

### 6. Rollback Migration

```typescript
// Rollback if validation fails or issues detected
await MigrationEngine.rollback(migrationId, config);

// Check status
const progress = MigrationEngine.getProgress(migrationId);
console.log('Status:', progress.status); // ROLLED_BACK
```

## Migration Patterns

### Pattern 1: Collection Restructuring

Migrate from flat structure to nested structure:

```typescript
// Before: orders/{orderId}
// After: companies/{companyId}/orders/{orderId}

const config = {
  name: 'restructure_orders',
  sourceCollection: 'orders',
  targetCollection: 'companies/{companyId}/orders',
  batchSize: 500,
  transformFn: (data) => {
    // Extract companyId and restructure
    const companyId = data.companyId;
    return {
      ...data,
      // Add any additional fields
      migratedAt: new Date().toISOString(),
    };
  },
};
```

### Pattern 2: Field Normalization

Rename and normalize fields:

```typescript
const config = {
  name: 'normalize_fields',
  sourceCollection: 'companies/{companyId}/orders',
  targetCollection: 'companies/{companyId}/orders',
  batchSize: 500,
  transformFn: (data) => ({
    ...data,
    // Normalize field names
    comandaNumber: data.numeroComanda || data.comandaNumber,
    createdBy: data.criadoPor || data.createdBy,
    createdAt: data.criadoEm || data.createdAt,
    // Remove deprecated fields
    numeroComanda: undefined,
    criadoPor: undefined,
    criadoEm: undefined,
  }),
};
```

### Pattern 3: Data Type Conversion

Convert data types:

```typescript
const config = {
  name: 'convert_timestamps',
  sourceCollection: 'companies/{companyId}/orders',
  targetCollection: 'companies/{companyId}/orders',
  batchSize: 500,
  transformFn: (data) => ({
    ...data,
    // Convert string dates to Timestamp
    createdAt: data.createdAt
      ? Timestamp.fromDate(new Date(data.createdAt))
      : Timestamp.now(),
    updatedAt: data.updatedAt
      ? Timestamp.fromDate(new Date(data.updatedAt))
      : Timestamp.now(),
  }),
};
```

### Pattern 4: Data Enrichment

Add computed or derived fields:

```typescript
const config = {
  name: 'enrich_orders',
  sourceCollection: 'companies/{companyId}/orders',
  targetCollection: 'companies/{companyId}/orders',
  batchSize: 500,
  transformFn: (data) => {
    // Calculate total from items
    const total = data.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
    
    return {
      ...data,
      total,
      itemCount: data.items?.length || 0,
      // Add dateKey if missing
      dateKey: data.dateKey || new Date(data.createdAt).toISOString().split('T')[0],
    };
  },
};
```

## Complete Migration Workflow

### Step 1: Preparation

```typescript
// 1. Create backup of production data
// 2. Test migration on staging environment
// 3. Prepare rollback plan
// 4. Schedule maintenance window (if needed)
```

### Step 2: Enable Dual-Write

```typescript
// Enable dual-write mode
MigrationEngine.enableDualWrite('orders');

// Update application code to use dual-write
// Deploy to production
// Monitor for 24-48 hours
```

### Step 3: Migrate Historical Data

```typescript
const config = {
  name: 'migrate_historical_orders',
  sourceCollection: 'orders',
  targetCollection: 'companies/{companyId}/orders',
  batchSize: 500,
  transformFn: (data) => ({
    ...data,
    comandaNumber: data.numeroComanda || data.comandaNumber,
    createdBy: data.criadoPor || data.createdBy,
  }),
};

// Start migration
const migrationId = await MigrationEngine.startMigration(config);

// Execute in batches
await MigrationEngine.migrateInBatches(migrationId, config);

// Monitor progress
setInterval(() => {
  const progress = MigrationEngine.getProgress(migrationId);
  console.log(`Progress: ${progress.migratedDocuments}/${progress.totalDocuments}`);
}, 5000);
```

### Step 4: Validate Consistency

```typescript
// Validate migrated data
const validation = await MigrationEngine.validateConsistency(migrationId, config);

if (!validation.isValid) {
  console.error('Validation failed!');
  console.error('Inconsistencies:', validation.inconsistencies);
  
  // Decide: fix inconsistencies or rollback
  if (validation.inconsistencies.length > 100) {
    // Too many issues, rollback
    await MigrationEngine.rollback(migrationId, config);
  } else {
    // Fix inconsistencies manually
    // Re-run validation
  }
}
```

### Step 5: Switch to New Structure

```typescript
// 1. Update application code to read from new structure
// 2. Deploy to production
// 3. Monitor for issues
// 4. Keep dual-write enabled for safety
```

### Step 6: Disable Dual-Write

```typescript
// After confirming new structure works correctly
// Disable dual-write
MigrationEngine.disableDualWrite('orders');

// Update application code to remove dual-write logic
// Deploy to production
```

### Step 7: Cleanup

```typescript
// 1. Archive or delete old collection
// 2. Update security rules
// 3. Update indexes
// 4. Clear completed migrations
MigrationEngine.clearCompletedMigrations();
```

## Error Handling

### Common Errors

#### 1. Batch Timeout

```typescript
// Reduce batch size
const config = {
  ...config,
  batchSize: 250, // Reduced from 500
};
```

#### 2. Validation Failures

```typescript
// Check validation results
const validation = await MigrationEngine.validateConsistency(migrationId, config);

if (!validation.isValid) {
  // Log inconsistencies
  validation.inconsistencies.forEach((inc) => {
    console.log(`Doc ${inc.docId}, Field ${inc.field}:`);
    console.log(`  Source: ${inc.sourceValue}`);
    console.log(`  Target: ${inc.targetValue}`);
  });
  
  // Fix and re-migrate specific documents
}
```

#### 3. Permission Errors

```typescript
// Ensure service account has proper permissions
// Update Firestore security rules
// Check authentication context
```

### Recovery Strategies

#### Strategy 1: Retry Failed Documents

```typescript
const progress = MigrationEngine.getProgress(migrationId);

if (progress.failedDocuments > 0) {
  // Get failed document IDs from errors
  const failedIds = progress.errors.map(e => e.docId);
  
  // Create new migration for failed documents only
  // Implement custom logic to retry
}
```

#### Strategy 2: Partial Rollback

```typescript
// Rollback only specific documents
// Implement custom rollback logic
async function partialRollback(docIds: string[]) {
  const batch = writeBatch(db);
  
  for (const docId of docIds) {
    const ref = doc(db, `companies/{companyId}/orders/${docId}`);
    batch.delete(ref);
  }
  
  await batch.commit();
}
```

## Performance Optimization

### 1. Batch Size Tuning

```typescript
// Start with smaller batches for complex transformations
const config = {
  batchSize: 250, // For complex transforms
};

// Use larger batches for simple migrations
const config = {
  batchSize: 500, // For simple copies
};
```

### 2. Parallel Processing

```typescript
// Split migration into multiple parallel jobs
const companyIds = ['company1', 'company2', 'company3'];

const migrations = await Promise.all(
  companyIds.map(async (companyId) => {
    const config = {
      name: `migrate_${companyId}`,
      sourceCollection: `companies/${companyId}/orders`,
      targetCollection: `companies/${companyId}/orders_new`,
      batchSize: 500,
    };
    
    const migrationId = await MigrationEngine.startMigration(config);
    await MigrationEngine.migrateInBatches(migrationId, config);
    
    return migrationId;
  })
);
```

### 3. Off-Peak Scheduling

```typescript
// Schedule migrations during off-peak hours
const isOffPeak = () => {
  const hour = new Date().getHours();
  return hour >= 2 && hour <= 6; // 2 AM - 6 AM
};

if (isOffPeak()) {
  await MigrationEngine.migrateInBatches(migrationId, config);
} else {
  console.log('Waiting for off-peak hours...');
}
```

## Monitoring and Reporting

### Real-time Progress

```typescript
// Monitor migration progress
const monitorMigration = (migrationId: string) => {
  const intervalId = setInterval(() => {
    const progress = MigrationEngine.getProgress(migrationId);
    
    if (!progress) {
      clearInterval(intervalId);
      return;
    }
    
    const percentage = (progress.migratedDocuments / progress.totalDocuments) * 100;
    console.log(`Progress: ${percentage.toFixed(2)}%`);
    console.log(`Migrated: ${progress.migratedDocuments}/${progress.totalDocuments}`);
    console.log(`Failed: ${progress.failedDocuments}`);
    console.log(`Errors: ${progress.errors.length}`);
    
    if (progress.status === 'SUCCESS' || progress.status === 'FAILED') {
      clearInterval(intervalId);
      console.log('Migration completed!');
      console.log(MigrationEngine.generateReport(migrationId));
    }
  }, 5000);
};

monitorMigration(migrationId);
```

### Generate Reports

```typescript
// Generate detailed report
const report = MigrationEngine.generateReport(migrationId);
console.log(report);

// Export to file or send to monitoring service
// Example output:
// ============================================================
// Migration Report: migration_1234567890_orders_restructure
// ============================================================
//
// Phase: COMPLETE
// Status: SUCCESS
// Duration: 3600s
//
// Progress:
//   Total Documents: 10000
//   Migrated: 9950
//   Failed: 50
//   Success Rate: 99.50%
//
// Validation:
//   Validated: 100
//   Inconsistent: 2
//
// Errors: 50
//
// Recent Errors:
//   - order123: Permission denied
//   - order456: Invalid data format
// ============================================================
```

## Best Practices

### 1. Test on Staging First

Always test migrations on staging environment before production:

```typescript
// Use environment-specific configuration
const config = {
  name: 'test_migration',
  sourceCollection: __DEV__ ? 'test_orders' : 'orders',
  targetCollection: __DEV__ ? 'test_orders_new' : 'orders_new',
  batchSize: 500,
};
```

### 2. Enable Dual-Write Early

Enable dual-write mode before starting migration:

```typescript
// Enable dual-write 24-48 hours before migration
MigrationEngine.enableDualWrite('orders');

// This ensures new data is written to both structures
// Reducing the amount of historical data to migrate
```

### 3. Validate Continuously

Run validation checks throughout the migration:

```typescript
// Validate after each batch
const validateBatch = async (migrationId: string, config: any) => {
  const validation = await MigrationEngine.validateConsistency(migrationId, config);
  
  if (!validation.isValid) {
    console.warn('Validation issues detected:', validation.inconsistencies.length);
    // Decide whether to continue or pause
  }
};
```

### 4. Monitor Performance

Track migration performance metrics:

```typescript
import PerformanceMonitoringService from './PerformanceMonitoringService';

await PerformanceMonitoringService.trackOperation(
  'migration_batch',
  async () => {
    await MigrationEngine.migrateInBatches(migrationId, config);
  }
);
```

### 5. Plan for Rollback

Always have a rollback plan:

```typescript
// Document rollback procedure
const rollbackPlan = {
  step1: 'Stop new writes to target collection',
  step2: 'Run rollback command',
  step3: 'Verify old structure is intact',
  step4: 'Update application to use old structure',
  step5: 'Monitor for issues',
};

// Test rollback on staging
await MigrationEngine.rollback(migrationId, config);
```

## Troubleshooting

### Issue: Migration Stuck

**Solution**: Check progress and errors

```typescript
const progress = MigrationEngine.getProgress(migrationId);
console.log('Last processed:', progress.lastProcessedDocId);
console.log('Errors:', progress.errors);

// Resume from last processed document
// Implement resume logic if needed
```

### Issue: High Failure Rate

**Solution**: Reduce batch size and add retry logic

```typescript
const config = {
  ...config,
  batchSize: 100, // Reduced batch size
};

// Add retry logic for failed documents
```

### Issue: Validation Failures

**Solution**: Investigate inconsistencies

```typescript
const validation = await MigrationEngine.validateConsistency(migrationId, config);

// Log detailed inconsistencies
validation.inconsistencies.forEach((inc) => {
  console.log(`Document: ${inc.docId}`);
  console.log(`Field: ${inc.field}`);
  console.log(`Source: ${JSON.stringify(inc.sourceValue)}`);
  console.log(`Target: ${JSON.stringify(inc.targetValue)}`);
});
```

## Migration Checklist

- [ ] Test migration on staging environment
- [ ] Create backup of production data
- [ ] Enable dual-write mode
- [ ] Deploy dual-write code to production
- [ ] Monitor dual-write for 24-48 hours
- [ ] Start historical data migration
- [ ] Monitor migration progress
- [ ] Validate data consistency
- [ ] Fix any inconsistencies
- [ ] Switch application to new structure
- [ ] Monitor for issues
- [ ] Disable dual-write mode
- [ ] Clean up old data
- [ ] Update security rules and indexes
- [ ] Document migration results

## Support

For issues or questions:
1. Check migration progress and errors
2. Review console logs
3. Verify Firestore permissions
4. Test on staging environment first

## Related Documentation

- [Firestore Data Migration](https://firebase.google.com/docs/firestore/manage-data/move-data)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DATABASE.md](./DATABASE.md) - Database structure
