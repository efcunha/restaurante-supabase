# Action Plan - Deployment & Next Steps

**Created:** 2026-02-03  
**Status:** Ready for Execution  
**Priority:** High

---

## Executive Decision Required

Choose one of the following deployment strategies:

### 🚀 Strategy A: Deploy Now (Recommended)

**Timeline:** 2-3 weeks  
**Risk:** Low  
**Value:** Immediate

Deploy completed Phases 1-2 to production for immediate security and performance gains.

### 🔧 Strategy B: Complete Phase 3 First

**Timeline:** 8 weeks  
**Risk:** Medium  
**Value:** Deferred

Complete TypeScript migration and refactoring before any deployment.

### 🎯 Strategy C: Hybrid (Best Value)

**Timeline:** 8 weeks with immediate gains  
**Risk:** Low  
**Value:** Continuous

Deploy Phases 1-2 now, work on Phase 3 in parallel.

---

## Strategy A: Deploy Now (Detailed Plan)

### Week 1: Pre-Deployment Preparation

**Day 1-2: Code Review & Testing**
```bash
# Run all tests
cd restaurante-app
npm test

# Run property tests
npm test -- __tests__/property/

# Type check
npm run type-check
```

**Day 3-4: Firebase Setup**
```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Select project
firebase use restaurante-dabf3

# Test functions locally
cd functions
npm run serve
```

**Day 5: Staging Deployment**
```bash
# Deploy to staging environment
firebase use staging
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Week 2: Production Deployment

**Day 1: Backup & Preparation**
```bash
# Backup Firestore data
gcloud firestore export gs://restaurante-dabf3-backup/$(date +%Y%m%d)

# Verify backup
gcloud firestore operations list
```

**Day 2-3: Gradual Rollout (10%)**
```typescript
// Update featureFlags.ts
export const featureFlags = {
  useCustomClaims: true,
  useRateLimiting: true,
  useCacheLayer: true,
  useServerAggregations: false, // Start disabled
  useOrderArchival: false,
  rolloutPercentage: 10 // 10% of users
};
```

```bash
# Deploy functions
firebase use production
firebase deploy --only functions

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

**Day 4-5: Monitor & Validate**
- Check Firebase Console for errors
- Monitor rate limit violations
- Verify audit logs are being created
- Check custom claims are working

**Day 6-7: Increase Rollout (50%)**
```typescript
// Update rolloutPercentage to 50
export const featureFlags = {
  // ... other flags
  rolloutPercentage: 50
};
```

### Week 3: Full Rollout & Validation

**Day 1-2: Full Rollout (100%)**
```typescript
// Enable all features
export const featureFlags = {
  useCustomClaims: true,
  useRateLimiting: true,
  useCacheLayer: true,
  useServerAggregations: true,
  useOrderArchival: true,
  rolloutPercentage: 100
};
```

**Day 3-5: Data Migrations**
```typescript
// Execute migrations with dry-run first
// 1. Path normalization
const pathResult = await migrateCollectionStructure({
  companyId: 'YOUR_COMPANY_ID',
  dryRun: true
});
// Review, then execute with dryRun: false

// 2. DateKey migration
const dateKeyResult = await migrateDateKeys({
  companyId: 'YOUR_COMPANY_ID',
  dryRun: true
});
// Review, then execute with dryRun: false

// 3. Field normalization
const fieldResult = await normalizeOrderFields({
  companyId: 'YOUR_COMPANY_ID',
  dryRun: true
});
// Review, then execute with dryRun: false
```

**Day 6-7: Validation & Metrics**
- Measure P95 latency
- Calculate Firestore reads reduction
- Check cache hit rate
- Verify all migrations successful

---

## Strategy C: Hybrid (Detailed Plan)

### Weeks 1-3: Same as Strategy A

Deploy Phases 1-2 following Strategy A timeline.

### Weeks 4-8: Phase 3 Implementation

**Week 4: TypeScript Migration - Phase 1**
```bash
# Convert utilities
cd restaurante-app/src/utils
# Rename .js to .ts and add types
# Files: validation.js, orderCalculator.js, etc.
```

**Week 5: TypeScript Migration - Phase 2**
```bash
# Convert contexts and hooks
cd restaurante-app/src/context
# Convert OrderContext.tsx, AuthContext.tsx
cd restaurante-app/src/hooks
# Convert useComandaManagement.js, useNovoPedido.ts
```

**Week 6: Business Logic Refactoring**
```typescript
// Create ServiceContainer
// Implement OrderService, ComandaService
// Refactor OrderContext to use services
```

**Week 7: Internationalization**
```bash
# Extract strings to translation files
# Update components to use useTranslation
# Run validation
npm run validate-translations
```

**Week 8: Testing & Deployment**
```bash
# Run all tests
npm test

# Deploy Phase 3 changes
firebase deploy
```

---

## Critical Commands Reference

### Testing
```bash
# All tests
npm test

# Property tests only
npm test -- __tests__/property/

# Specific test file
npm test -- __tests__/property/datekey-format.test.ts

# With coverage
npm test -- --coverage

# Type check
npm run type-check
```

### Firebase Deployment
```bash
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:refreshUserClaims

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Data Migration
```typescript
// Always start with dry-run
const result = await migrationFunction({
  companyId: 'YOUR_COMPANY_ID',
  dryRun: true,
  batchSize: 500
});

console.log('Migration preview:', result);

// After review, execute
const finalResult = await migrationFunction({
  companyId: 'YOUR_COMPANY_ID',
  dryRun: false,
  batchSize: 500
});
```

### Rollback
```typescript
// Rollback migration
await rollbackMigration({
  companyId: 'YOUR_COMPANY_ID',
  backupId: 'BACKUP_ID_FROM_MIGRATION'
});

// Restore from backup
gcloud firestore import gs://restaurante-dabf3-backup/BACKUP_DATE
```

---

## Monitoring Checklist

### Daily Monitoring (First Week)

- [ ] Check Firebase Console for function errors
- [ ] Review rate limit violations in Firestore
- [ ] Verify audit logs are being created
- [ ] Monitor custom claims refresh
- [ ] Check cache hit rates
- [ ] Review error logs

### Weekly Monitoring (Ongoing)

- [ ] Measure P95 latency for critical operations
- [ ] Calculate Firestore reads reduction
- [ ] Review monthly costs
- [ ] Check test coverage
- [ ] Validate data integrity
- [ ] Review security incidents

### Metrics to Track

**Performance:**
- P95 latency for: createOrder, updateOrder, getActiveOrders
- Firestore reads per user session
- Cache hit rate
- Query execution time

**Security:**
- Rate limit violations per day
- Unauthorized isPago modification attempts
- Failed authentication attempts
- Custom claims refresh failures

**Cost:**
- Firestore reads per day
- Firestore writes per day
- Cloud Functions invocations
- Storage usage

---

## Success Criteria Validation

### After Week 1 (10% Rollout)

- [ ] Zero critical errors
- [ ] Rate limiting working correctly
- [ ] Custom claims being set
- [ ] Audit logs being created
- [ ] No user complaints

### After Week 2 (50% Rollout)

- [ ] Performance metrics stable
- [ ] No increase in error rate
- [ ] Cache hit rate >50%
- [ ] Firestore reads decreasing

### After Week 3 (100% Rollout)

- [ ] P95 latency <500ms ✅
- [ ] Firestore reads reduced >60% ✅
- [ ] Cache hit rate >70% ✅
- [ ] Zero security incidents ✅
- [ ] All migrations successful ✅

---

## Rollback Procedures

### If Critical Issues Occur

**Step 1: Disable Feature Flags**
```typescript
// Immediately disable problematic features
export const featureFlags = {
  useCustomClaims: false,
  useRateLimiting: false,
  useCacheLayer: false,
  useServerAggregations: false,
  useOrderArchival: false
};
```

**Step 2: Rollback Functions**
```bash
# Rollback to previous version
firebase functions:delete FUNCTION_NAME
# Redeploy previous version
git checkout PREVIOUS_COMMIT
firebase deploy --only functions
```

**Step 3: Rollback Data**
```typescript
// Use rollback function
await rollbackMigration({
  companyId: 'YOUR_COMPANY_ID',
  backupId: 'BACKUP_ID'
});
```

**Step 4: Restore from Backup**
```bash
# If needed, restore entire database
gcloud firestore import gs://restaurante-dabf3-backup/BACKUP_DATE
```

---

## Communication Plan

### Stakeholder Updates

**Before Deployment:**
- Share deployment plan
- Confirm maintenance window
- Set expectations for monitoring

**During Deployment:**
- Daily status updates
- Immediate notification of issues
- Metrics dashboard access

**After Deployment:**
- Success metrics report
- Lessons learned
- Next steps recommendation

### User Communication

**Before:**
- Notify of upcoming improvements
- Explain potential brief disruptions
- Provide support contact

**During:**
- Status page updates
- Quick response to issues
- Transparent communication

**After:**
- Announce successful deployment
- Share performance improvements
- Thank users for patience

---

## Emergency Contacts

**Technical Issues:**
- Firebase Support: https://firebase.google.com/support
- Project Admin: [YOUR_EMAIL]

**Business Issues:**
- Product Owner: [OWNER_EMAIL]
- Stakeholders: [STAKEHOLDER_EMAILS]

---

## Final Checklist Before Deployment

### Code Quality
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Code reviewed
- [ ] Documentation updated

### Infrastructure
- [ ] Firebase project configured
- [ ] Environment variables set
- [ ] Backups created
- [ ] Rollback plan ready

### Monitoring
- [ ] Firebase Console access
- [ ] Alerting configured
- [ ] Metrics dashboard ready
- [ ] Logs accessible

### Communication
- [ ] Stakeholders informed
- [ ] Users notified
- [ ] Support team briefed
- [ ] Emergency contacts ready

---

## Post-Deployment Actions

### Immediate (Day 1)
- [ ] Verify all functions deployed
- [ ] Check for errors in console
- [ ] Test critical user flows
- [ ] Monitor metrics

### Short-term (Week 1)
- [ ] Collect performance metrics
- [ ] Review user feedback
- [ ] Adjust feature flags if needed
- [ ] Document issues and resolutions

### Medium-term (Month 1)
- [ ] Calculate cost savings
- [ ] Measure success criteria
- [ ] Plan Phase 3 if not started
- [ ] Optimize based on learnings

---

## Decision Point

**Action Required:** Choose deployment strategy and set timeline.

**Recommended:** Strategy C (Hybrid)
- Deploy Phases 1-2 in Week 1-3
- Work on Phase 3 in Week 4-8
- Continuous value delivery

**Next Step:** Review with team and schedule deployment window.

---

**Document Status:** Ready for Execution  
**Last Updated:** 2026-02-03  
**Approval Required:** Yes
