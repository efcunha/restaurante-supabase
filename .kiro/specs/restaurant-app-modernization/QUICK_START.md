# Quick Start Guide - Deploy Phases 1-2

**Goal:** Deploy security and performance improvements in 2 weeks  
**Status:** Ready to begin  
**Estimated Savings:** $180/month ($2,160/year)

---

## TL;DR - What You Need to Do

1. **Today:** Review this guide and DEPLOYMENT_READINESS.md
2. **This Week:** Complete pre-deployment checklist
3. **Next Week:** Deploy and monitor
4. **Week 3+:** Start Phase 3 (TypeScript migration)

---

## Day-by-Day Plan

### 📅 Day 1: Review & Prepare (Today)

**Morning (2 hours):**
```bash
# 1. Read these documents
- DEPLOYMENT_READINESS.md (comprehensive checklist)
- DECISION_POINT.md (strategic overview)
- ACTION_PLAN.md (detailed execution plan)

# 2. Verify your environment
cd ~/Projeto/restaurante
firebase --version  # Should be v13+
node --version      # Should be v18+
npm --version       # Should be v9+

# 3. Check Firebase project
firebase projects:list
firebase use restaurante-dabf3
```

**Afternoon (3 hours):**
```bash
# 4. Install dependencies
cd functions
npm install
npm audit fix  # Fix any vulnerabilities

cd ../restaurante-app
npm install
npm audit fix

# 5. Run tests to verify everything works
cd restaurante-app
npm test  # Should see 54 tests passing

# 6. Create backup
firebase firestore:export gs://restaurante-dabf3-backups/pre-deployment-$(date +%Y%m%d)
```

**End of Day:**
- [ ] All dependencies installed
- [ ] All tests passing
- [ ] Backup created
- [ ] Team notified of deployment plan

---

### 📅 Day 2-3: Pre-Deployment Testing

**Test Cloud Functions Locally:**
```bash
cd functions

# Start Firebase emulators
firebase emulators:start

# In another terminal, run tests
npm test

# Test specific functions
curl -X POST http://localhost:5001/restaurante-dabf3/us-central1/refreshUserClaims \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

**Test Client Services:**
```bash
cd restaurante-app

# Run unit tests
npm test -- __tests__/unit/

# Run property tests
npm test -- __tests__/property/

# Run integration tests
npm test -- __tests__/integration/
```

**Checklist:**
- [ ] All Cloud Functions tested locally
- [ ] All client services tested
- [ ] No errors in emulator logs
- [ ] Performance acceptable

---

### 📅 Day 4: Deploy Cloud Functions

**Morning - Deploy Functions:**
```bash
cd functions

# Build (if using TypeScript)
npm run build

# Deploy all functions
firebase deploy --only functions

# Verify deployment
firebase functions:list
```

**Expected Output:**
```
✔ functions: 31 functions deployed successfully
  - refreshUserClaims
  - onUserMembershipChange
  - validatePaymentChange
  - ... (28 more)
```

**Afternoon - Verify Deployment:**
```bash
# Check function logs
firebase functions:log

# Test a function
curl -X POST https://us-central1-restaurante-dabf3.cloudfunctions.net/refreshUserClaims \
  -H "Authorization: Bearer $(firebase auth:token)" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

**Checklist:**
- [ ] All 31 functions deployed
- [ ] No deployment errors
- [ ] Functions appear in Firebase Console
- [ ] Test calls successful

---

### 📅 Day 5: Deploy Firestore Configuration

**Deploy Indexes:**
```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Check index build status
firebase firestore:indexes
```

**Deploy Security Rules (CAREFULLY):**
```bash
# First, backup current rules
firebase firestore:rules:get > firestore.rules.backup

# Deploy new rules
firebase deploy --only firestore:rules

# Verify rules
firebase firestore:rules:get
```

**Checklist:**
- [ ] Indexes deployed and building
- [ ] Security rules deployed
- [ ] No rule validation errors
- [ ] Backup of old rules saved

---

### 📅 Day 6-7: Deploy Client Updates

**Build and Test:**
```bash
cd restaurante-app

# Update feature flags (all false initially)
# Edit src/config/featureFlags.ts

# Build app
npm run build  # or expo build

# Test locally
npm start
```

**Deploy to Users:**
```bash
# Option 1: Internal testing (TestFlight/Internal Testing)
expo publish

# Option 2: Production (when ready)
# Follow your normal app deployment process
```

**Checklist:**
- [ ] Feature flags set to false
- [ ] App builds successfully
- [ ] No runtime errors
- [ ] Deployed to test users

---

### 📅 Week 2: Gradual Rollout

#### Day 1-2: Enable 10% of Users

**Update Feature Flags:**
```typescript
// src/config/featureFlags.ts
export const featureFlags = {
  useCustomClaims: shouldEnableForUser(userId, 0.1),  // 10%
  useRateLimiting: shouldEnableForUser(userId, 0.1),  // 10%
  useAuditLogging: true,  // Enable for all (low risk)
  // ... others false
};

// Helper function
function shouldEnableForUser(userId: string, percentage: number): boolean {
  const hash = hashCode(userId);
  return (hash % 100) < (percentage * 100);
}
```

**Monitor Metrics:**
```bash
# Check Firebase Console
- Cloud Functions > Metrics
- Firestore > Usage
- Authentication > Users

# Check custom metrics
- Error rate should be <1%
- P95 latency should be <500ms
- No security incidents
```

**Checklist:**
- [ ] 10% rollout complete
- [ ] Error rate <1%
- [ ] No critical issues
- [ ] Metrics improving

#### Day 3-4: Enable 50% of Users

**Update Feature Flags:**
```typescript
export const featureFlags = {
  useCustomClaims: shouldEnableForUser(userId, 0.5),  // 50%
  useRateLimiting: shouldEnableForUser(userId, 0.5),  // 50%
  useCacheLayer: shouldEnableForUser(userId, 0.5),    // 50%
  useServerAggregations: true,  // Enable for all
  // ... others
};
```

**Monitor Metrics:**
- [ ] Firestore reads decreasing (target: -30%)
- [ ] Cache hit rate increasing (target: >60%)
- [ ] No performance regressions

#### Day 5-7: Enable 100% of Users

**Update Feature Flags:**
```typescript
export const featureFlags = {
  // Enable all features
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
};
```

**Final Validation:**
- [ ] Error rate <1%
- [ ] P95 latency <500ms
- [ ] Firestore reads reduced >60%
- [ ] Cache hit rate >70%
- [ ] Monthly costs reduced >60%

---

## Success Metrics Dashboard

### Week 1 (Baseline)
```
Error Rate: ____%
P95 Latency: ____ms
Firestore Reads: ____/day
Monthly Cost: $____
Security Incidents: ____
```

### Week 2 (10% Rollout)
```
Error Rate: ____%
P95 Latency: ____ms
Firestore Reads: ____/day (___% reduction)
Cache Hit Rate: ____%
Security Incidents: ____
```

### Week 2 (50% Rollout)
```
Error Rate: ____%
P95 Latency: ____ms
Firestore Reads: ____/day (___% reduction)
Cache Hit Rate: ____%
Security Incidents: ____
```

### Week 2 (100% Rollout)
```
Error Rate: ____%
P95 Latency: ____ms
Firestore Reads: ____/day (___% reduction)
Cache Hit Rate: ____%
Monthly Cost: $____ (___% reduction)
Security Incidents: ____
```

---

## Common Issues & Solutions

### Issue: Cloud Functions Deployment Fails

**Solution:**
```bash
# Check logs
firebase functions:log --limit 50

# Redeploy specific function
firebase deploy --only functions:functionName

# Check quotas
firebase projects:list
```

### Issue: Security Rules Break Existing Functionality

**Solution:**
```bash
# Rollback rules immediately
firebase deploy --only firestore:rules --force

# Restore from backup
cat firestore.rules.backup > firestore.rules
firebase deploy --only firestore:rules
```

### Issue: Performance Regression

**Solution:**
```typescript
// Disable problematic feature flag
export const featureFlags = {
  useCacheLayer: false,  // Disable if causing issues
  // ... others
};
```

### Issue: High Error Rate

**Solution:**
1. Check Firebase Console > Functions > Logs
2. Identify failing function
3. Disable related feature flag
4. Investigate and fix
5. Redeploy when ready

---

## Emergency Rollback

**If critical issues occur:**

```bash
# 1. Disable all feature flags immediately
# Edit src/config/featureFlags.ts - set all to false

# 2. Rollback Cloud Functions
firebase functions:rollback --all

# 3. Rollback Security Rules
cat firestore.rules.backup > firestore.rules
firebase deploy --only firestore:rules

# 4. Restore data if necessary
firebase firestore:import gs://restaurante-dabf3-backups/pre-deployment-YYYYMMDD

# 5. Notify team
echo "Rollback complete. Investigating issues."
```

---

## After Deployment: Start Phase 3

**Week 3+: TypeScript Migration**

```bash
# Follow the migration guide
cat .kiro/specs/restaurant-app-modernization/MIGRATION_GUIDE.md

# Start with utils
cd restaurante-app/src/utils

# Convert one file at a time
# Example: validation.js → validation.ts
mv validation.js validation.ts
# Add types, fix errors
npm run type-check

# Commit and test
git add validation.ts
git commit -m "feat: migrate validation.js to TypeScript"
npm test
```

**Estimated Timeline:**
- Week 3-5: Convert remaining JavaScript files (14 files)
- Week 6-7: Enable strict mode and fix errors
- Week 8: Business logic refactoring
- Week 9: Internationalization

---

## Resources

**Documentation:**
- [DEPLOYMENT_READINESS.md](./DEPLOYMENT_READINESS.md) - Complete checklist
- [ACTION_PLAN.md](./ACTION_PLAN.md) - Detailed execution plan
- [NEXT_STEPS.md](./NEXT_STEPS.md) - Deployment strategies
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Phase 3 guide

**Firebase:**
- [Firebase Console](https://console.firebase.google.com/project/restaurante-dabf3)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Docs](https://firebase.google.com/docs/firestore)

**Support:**
- Technical questions: Review documentation
- Deployment issues: Check Firebase Console logs
- Emergency: Follow rollback procedure

---

## Checklist Summary

**Pre-Deployment:**
- [ ] Day 1: Review and prepare
- [ ] Day 2-3: Test locally
- [ ] Day 4: Deploy Cloud Functions
- [ ] Day 5: Deploy Firestore config
- [ ] Day 6-7: Deploy client updates

**Gradual Rollout:**
- [ ] Day 1-2: 10% rollout
- [ ] Day 3-4: 50% rollout
- [ ] Day 5-7: 100% rollout

**Post-Deployment:**
- [ ] Validate success metrics
- [ ] Document lessons learned
- [ ] Start Phase 3 (TypeScript)

---

## Ready to Start?

**Run this command to begin:**

```bash
# Create a deployment branch
git checkout -b deployment/phases-1-2

# Verify everything is ready
npm test

# Start deployment
echo "Starting deployment of Phases 1-2..."
echo "Follow DEPLOYMENT_READINESS.md for detailed steps"
```

**Questions?**
- Review DEPLOYMENT_READINESS.md for detailed checklist
- Review DECISION_POINT.md for strategic overview
- Review ACTION_PLAN.md for week-by-week plan

**Good luck with your deployment! 🚀**

---

**Document Created:** 2026-02-03  
**Status:** Ready to execute  
**Next Action:** Start Day 1 tasks

