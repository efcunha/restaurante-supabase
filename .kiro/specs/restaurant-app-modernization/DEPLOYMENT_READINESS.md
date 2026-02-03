# Deployment Readiness Checklist - Phases 1-2

**Date:** 2026-02-03  
**Target:** Deploy security and performance improvements  
**Timeline:** 2 weeks  
**Strategy:** Option 1 (Deploy Now)

---

## Pre-Deployment Checklist

### Environment Preparation

- [ ] **Firebase Project Verified**
  - Project ID: `restaurante-dabf3`
  - Environment: Production
  - Billing enabled and verified
  - Quotas checked (Cloud Functions, Firestore)

- [ ] **Backup Strategy**
  - [ ] Full Firestore export completed
  - [ ] Backup stored in secure location
  - [ ] Backup restoration tested
  - [ ] Rollback plan documented

- [ ] **Development Environment**
  - [ ] Node.js version verified (v18+)
  - [ ] Firebase CLI installed (`npm install -g firebase-tools`)
  - [ ] Authenticated to Firebase (`firebase login`)
  - [ ] Project selected (`firebase use restaurante-dabf3`)

- [ ] **Dependencies Verified**
  - [ ] `functions/package.json` dependencies installed
  - [ ] `restaurante-app/package.json` dependencies installed
  - [ ] No security vulnerabilities (`npm audit`)

---

## Code Review Checklist

### Cloud Functions (31 functions)

**Phase 1: Security Functions**
- [ ] `refreshUserClaims` - Custom claims management
- [ ] `onUserMembershipChange` - Auto-update claims trigger
- [ ] `validatePaymentChange` - Server-side payment validation
- [ ] `onPaymentStatusChange` - Payment audit logging
- [ ] `checkRateLimit` - Rate limiting enforcement
- [ ] `getRateLimitStats` - Rate limit statistics
- [ ] `resetRateLimitViolations` - Admin reset capability
- [ ] `cleanupExpiredRateLimits` - Daily cleanup (scheduled)
- [ ] `auditOrderOperations` - Order audit logging
- [ ] `auditUserOperations` - User audit logging

**Phase 2: Performance Functions**
- [ ] `updateDailyStatistics` - Incremental aggregations
- [ ] `recalculateDailyStatistics` - Daily recalculation (scheduled)
- [ ] `getDailyStatistics` - Query aggregations
- [ ] `getStatisticsRange` - Range queries
- [ ] `archiveOldOrders` - Daily archival (scheduled)
- [ ] `getOrderById` - Unified query (active + archived)
- [ ] `queryOrders` - Unified query with filters
- [ ] `getArchivalStats` - Archival statistics

**Phase 3: Migration Functions**
- [ ] `migrateCollectionStructure` - Path migration
- [ ] `rollbackMigration` - Migration rollback
- [ ] `validateDataIntegrity` - Data validation
- [ ] `cleanupExpiredBackups` - Backup cleanup (scheduled)
- [ ] `calculateDateKey` - Server-side dateKey calculation
- [ ] `onOrderCreate` - Auto-add dateKey trigger
- [ ] `onOrderUpdate` - Validate dateKey trigger
- [ ] `migrateDateKeys` - Migrate existing dateKeys
- [ ] `validateDateKeys` - Validate dateKey consistency
- [ ] `normalizeOrderFields` - Field normalization
- [ ] `removeDeprecatedFields` - Remove deprecated fields
- [ ] `validateFieldNormalization` - Field validation
- [ ] `cleanupDeprecatedFieldsDaily` - Daily cleanup (scheduled)

### Client Services (13 services)

- [ ] `DateKeyService.ts` - UTC dateKey standardization
- [ ] `FieldNormalizationService.ts` - Field consolidation
- [ ] `PathNormalizationService.ts` - Path consistency
- [ ] `RetryService.ts` - Retry logic with exponential backoff
- [ ] `OfflineQueueService.ts` - Offline operation queueing
- [ ] `UnifiedQueryService.ts` - Unified active + archived queries
- [ ] `RateLimiterService.ts` - Client-side rate limiting
- [ ] `AuditService.ts` - Audit logging
- [ ] `CacheLayerService.ts` - Intelligent caching
- [ ] `PaginationService.ts` - Cursor-based pagination
- [ ] `QueryOptimizerService.ts` - Query optimization
- [ ] `OrderListenerService.ts` - Optimized real-time listeners
- [ ] `PaymentValidationService.ts` - Payment protection

---

## Testing Checklist

### Unit Tests
- [ ] Run all unit tests: `npm test -- __tests__/unit/`
- [ ] All tests passing
- [ ] No flaky tests
- [ ] Coverage >80% for critical modules

### Property-Based Tests
- [ ] Run all property tests: `npm test -- __tests__/property/`
- [ ] All 48 property tests passing
- [ ] No counterexamples found
- [ ] Test execution time acceptable (<5 minutes)

### Integration Tests
- [ ] Run integration tests: `npm test -- __tests__/integration/`
- [ ] Order flow tests passing
- [ ] Payment flow tests passing
- [ ] Caixa flow tests passing

### Manual Testing
- [ ] Create test order
- [ ] Update order status
- [ ] Process payment
- [ ] Verify audit logs
- [ ] Test rate limiting
- [ ] Test cache invalidation
- [ ] Test pagination
- [ ] Test offline queue

---

## Configuration Checklist

### Environment Variables

**Firebase Functions (.env in functions/):**
```bash
# Required
FIREBASE_PROJECT_ID=restaurante-dabf3
FIRESTORE_EMULATOR_HOST=  # Empty for production

# Optional
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

**React Native App (.env in restaurante-app/):**
```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=restaurante-dabf3.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=restaurante-dabf3
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=restaurante-dabf3.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Environment
EXPO_PUBLIC_ENVIRONMENT=production
```

- [ ] All environment variables set
- [ ] No hardcoded credentials in code
- [ ] Secrets stored securely
- [ ] Different configs for dev/staging/prod

### Feature Flags

**Update `src/config/featureFlags.ts`:**
```typescript
export const featureFlags = {
  // Phase 1: Security
  useCustomClaims: false,           // Enable after deployment
  useRateLimiting: false,           // Enable after deployment
  useAuditLogging: false,           // Enable after deployment
  
  // Phase 2: Performance
  useCacheLayer: false,             // Enable after deployment
  useServerAggregations: false,     // Enable after deployment
  useOrderArchival: false,          // Enable after deployment
  useOptimizedListeners: false,     // Enable after deployment
  usePagination: false,             // Enable after deployment
  
  // Phase 3: Data Normalization
  useDateKeyStandardization: false, // Enable after deployment
  useFieldNormalization: false,     // Enable after deployment
  usePathNormalization: false,      // Enable after deployment
};
```

- [ ] All feature flags initially set to `false`
- [ ] Gradual rollout plan documented
- [ ] Rollback plan for each flag

### Firestore Indexes

**Verify `firestore.indexes.json`:**
```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "dateKey", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "comandaNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isPago", "order": "ASCENDING" },
        { "fieldPath": "dateKey", "order": "ASCENDING" }
      ]
    }
  ]
}
```

- [ ] All required indexes defined
- [ ] Indexes deployed: `firebase deploy --only firestore:indexes`
- [ ] Index build status verified in Firebase Console
- [ ] No missing index warnings in logs

### Security Rules

**Review `firestore.rules`:**
- [ ] Custom claims validation implemented
- [ ] isPago field protection implemented
- [ ] Rate limiting checks added
- [ ] Audit logging triggers added
- [ ] Backward compatibility maintained

---

## Deployment Steps

### Week 1: Preparation & Initial Deployment

#### Day 1-2: Pre-Deployment
- [ ] Complete all checklist items above
- [ ] Schedule deployment window (low-traffic hours)
- [ ] Notify team and stakeholders
- [ ] Prepare rollback plan
- [ ] Set up monitoring dashboards

#### Day 3: Deploy Cloud Functions
```bash
cd functions
npm install
npm run build  # If using TypeScript
firebase deploy --only functions
```

- [ ] All 31 functions deployed successfully
- [ ] No deployment errors
- [ ] Functions appear in Firebase Console
- [ ] Test callable functions with curl/Postman

#### Day 4: Deploy Firestore Configuration
```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy security rules (with caution)
firebase deploy --only firestore:rules
```

- [ ] Indexes deployed and building
- [ ] Security rules deployed
- [ ] No rule validation errors
- [ ] Test rules with Firebase Emulator

#### Day 5: Deploy Client Updates
```bash
cd restaurante-app
npm install
npm run build  # If applicable
# Deploy to app stores or internal distribution
```

- [ ] Client services integrated
- [ ] Feature flags configured
- [ ] App builds successfully
- [ ] No runtime errors

---

### Week 2: Gradual Rollout & Monitoring

#### Day 1-2: 10% Rollout
- [ ] Enable feature flags for 10% of users
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check audit logs
- [ ] Verify rate limiting works
- [ ] Check cache hit rates

**Feature Flags to Enable (10%):**
```typescript
useCustomClaims: true,      // For 10% of users
useRateLimiting: true,      // For 10% of users
useAuditLogging: true,      // For all (low risk)
```

**Monitoring Checklist:**
- [ ] Error rate <1%
- [ ] P95 latency <500ms
- [ ] No security incidents
- [ ] Firestore reads decreasing
- [ ] Cache hit rate >50%

#### Day 3-4: 50% Rollout
- [ ] Increase feature flags to 50%
- [ ] Continue monitoring
- [ ] Address any issues
- [ ] Validate cost reduction

**Feature Flags to Enable (50%):**
```typescript
useCustomClaims: true,           // For 50% of users
useRateLimiting: true,           // For 50% of users
useCacheLayer: true,             // For 50% of users
useServerAggregations: true,     // For 50% of users
```

**Monitoring Checklist:**
- [ ] Error rate <1%
- [ ] P95 latency <500ms
- [ ] Firestore reads reduced by >30%
- [ ] Cache hit rate >60%
- [ ] No performance regressions

#### Day 5: 100% Rollout
- [ ] Enable all feature flags for 100%
- [ ] Monitor for 24 hours
- [ ] Validate all success criteria
- [ ] Document lessons learned

**Feature Flags to Enable (100%):**
```typescript
// All flags enabled
useCustomClaims: true,
useRateLimiting: true,
useAuditLogging: true,
useCacheLayer: true,
useServerAggregations: true,
useOrderArchival: true,
useOptimizedListeners: true,
usePagination: true,
useDateKeyStandardization: true,
useFieldNormalization: true,
usePathNormalization: true,
```

**Final Validation:**
- [ ] Error rate <1%
- [ ] P95 latency <500ms
- [ ] Firestore reads reduced by >60%
- [ ] Cache hit rate >70%
- [ ] Monthly costs reduced by >60%
- [ ] Zero security incidents
- [ ] All audit logs working

---

## Monitoring & Metrics

### Real-Time Monitoring

**Firebase Console:**
- [ ] Cloud Functions execution count
- [ ] Cloud Functions error rate
- [ ] Cloud Functions execution time
- [ ] Firestore read/write counts
- [ ] Firestore storage usage

**Custom Metrics:**
- [ ] Rate limit violations
- [ ] Cache hit rates
- [ ] Query latency (P50, P95, P99)
- [ ] Audit log counts
- [ ] Payment validation success rate

**Alerts Configured:**
- [ ] Error rate >1%
- [ ] P95 latency >500ms
- [ ] Rate limit violations >100/day
- [ ] Cache hit rate <70%
- [ ] Security rule violations

### Success Criteria

**Security:**
- [ ] Zero unauthorized isPago modifications
- [ ] Rate limiting blocks excessive requests
- [ ] All operations logged in audit trail
- [ ] No security rule violations

**Performance:**
- [ ] P95 latency <500ms
- [ ] Firestore reads reduced by >60%
- [ ] Cache hit rate >70%
- [ ] No performance regressions

**Stability:**
- [ ] Error rate <1%
- [ ] No data loss
- [ ] No downtime
- [ ] Successful rollback capability tested

**Cost:**
- [ ] Monthly Firestore costs reduced by >60%
- [ ] From ~$300/month to ~$120/month
- [ ] Savings: $180/month = $2,160/year

---

## Rollback Plan

### Immediate Rollback (If Critical Issues)

**Step 1: Disable Feature Flags**
```typescript
// Revert all flags to false
export const featureFlags = {
  useCustomClaims: false,
  useRateLimiting: false,
  // ... all false
};
```

**Step 2: Rollback Cloud Functions**
```bash
# List previous versions
firebase functions:list

# Rollback to previous version
firebase functions:rollback functionName --version previousVersion
```

**Step 3: Rollback Security Rules**
```bash
# Restore previous rules from backup
firebase deploy --only firestore:rules
```

**Step 4: Restore Data (If Necessary)**
```bash
# Restore from backup
gcloud firestore import gs://your-backup-bucket/backup-folder
```

### Partial Rollback (If Specific Feature Issues)

- [ ] Identify problematic feature
- [ ] Disable specific feature flag
- [ ] Monitor for improvement
- [ ] Investigate and fix issue
- [ ] Re-enable when ready

---

## Communication Plan

### Pre-Deployment
- [ ] Notify team 1 week in advance
- [ ] Notify stakeholders 1 week in advance
- [ ] Schedule deployment window
- [ ] Prepare status update template

### During Deployment
- [ ] Send deployment start notification
- [ ] Provide hourly status updates
- [ ] Report any issues immediately
- [ ] Send deployment complete notification

### Post-Deployment
- [ ] Send success metrics report
- [ ] Document lessons learned
- [ ] Schedule retrospective meeting
- [ ] Update documentation

---

## Post-Deployment Tasks

### Immediate (Day 1-7)
- [ ] Monitor metrics daily
- [ ] Address any issues
- [ ] Collect user feedback
- [ ] Document any problems

### Short-term (Week 2-4)
- [ ] Validate cost reduction
- [ ] Validate performance improvements
- [ ] Validate security improvements
- [ ] Generate success report

### Long-term (Month 2+)
- [ ] Monthly cost reports
- [ ] Monthly performance reports
- [ ] Quarterly security audits
- [ ] Continuous optimization

---

## Risk Mitigation

### High-Risk Areas

**1. Security Rules Update**
- **Risk:** May break existing functionality
- **Mitigation:** 
  - Test thoroughly in staging
  - Gradual rollout (10% → 50% → 100%)
  - Maintain backward compatibility
  - Quick rollback capability

**2. Data Migrations**
- **Risk:** Data corruption or loss
- **Mitigation:**
  - Dry-run mode for all migrations
  - Complete backups before migration
  - 30-day rollback window
  - Automated validation

**3. Performance Regressions**
- **Risk:** New code may be slower
- **Mitigation:**
  - Performance testing before deployment
  - Real-time monitoring
  - Automatic rollback on latency spike
  - Load testing

---

## Emergency Contacts

**Technical Lead:** [Name] - [Phone] - [Email]  
**DevOps Lead:** [Name] - [Phone] - [Email]  
**Product Manager:** [Name] - [Phone] - [Email]  
**On-Call Engineer:** [Name] - [Phone] - [Email]

**Escalation Path:**
1. On-Call Engineer (immediate)
2. Technical Lead (within 15 minutes)
3. DevOps Lead (within 30 minutes)
4. Product Manager (within 1 hour)

---

## Checklist Summary

**Pre-Deployment:** ☐ 0/50 items complete  
**Code Review:** ☐ 0/44 items complete  
**Testing:** ☐ 0/12 items complete  
**Configuration:** ☐ 0/15 items complete  
**Deployment:** ☐ 0/20 items complete  
**Monitoring:** ☐ 0/25 items complete  

**Overall Readiness:** 0% (0/166 items)

---

## Sign-Off

**Technical Lead:** _________________ Date: _______  
**DevOps Lead:** _________________ Date: _______  
**Product Manager:** _________________ Date: _______  

**Deployment Approved:** ☐ Yes ☐ No

---

**Document Created:** 2026-02-03  
**Last Updated:** 2026-02-03  
**Status:** Ready for review  
**Next Action:** Complete checklist items

