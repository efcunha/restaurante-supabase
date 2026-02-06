# Repository Cleanup Report

**Date**: 2026-02-06T22:23:06.080Z
**Duration**: 0.09 seconds

## Summary

- Files Deleted: 10
- Files Moved: 10
- Files Modified: 2
- Warnings: 0
- Errors: 0

## Operations Performed

### Deleted Files (10)

1. ✓ `.firebase/logs/vsce-debug.log`
   - Reason: Temporary file cleanup
2. ✓ `firebase-debug.log`
   - Reason: Temporary file cleanup
3. ✓ `restaurante-app/errors_only.txt`
   - Reason: Temporary file cleanup
4. ✓ `restaurante-app/firestore.rules.temp`
   - Reason: Temporary file cleanup
5. ✓ `restaurante-app/full_lint_output.txt`
   - Reason: Temporary file cleanup
6. ✓ `restaurante-app/lint_full.txt`
   - Reason: Temporary file cleanup
7. ✓ `restaurante-app/lint_output.txt`
   - Reason: Temporary file cleanup
8. ✓ `restaurante-app/lint_report.txt`
   - Reason: Temporary file cleanup
9. ✓ `restaurante-app/test-output.log`
   - Reason: Temporary file cleanup
10. ✓ `restaurante-app/test-results-after-firebase-cleanup.txt`
   - Reason: Temporary file cleanup

### Moved Files (10)

1. ✓ `/home/efcunha/Projeto/restaurante-supabase/get-full-schema.sql` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/scripts/sql/get-full-schema.sql`
   - Reason: SQL script organization
2. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/add-order-status-constraint.sql` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/scripts/sql/add-order-status-constraint.sql`
   - Reason: SQL script organization
3. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/apply-order-constraint.js` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/scripts/debug/apply-order-constraint.js`
   - Reason: Debug script organization
4. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/check-profiles-schema.js` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/scripts/debug/check-profiles-schema.js`
   - Reason: Debug script organization
5. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/test-db-connection.js` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/scripts/debug/test-db-connection.js`
   - Reason: Debug script organization
6. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/CRITICAL_FIXES_NEEDED.md` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/docs/archive/CRITICAL_FIXES_NEEDED.md`
   - Reason: Documentation archival
7. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/TEST_STABILIZATION_FINAL_SUMMARY.md` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/docs/archive/TEST_STABILIZATION_FINAL_SUMMARY.md`
   - Reason: Documentation archival
8. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/TEST_STATUS_SUMMARY.md` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/docs/archive/TEST_STATUS_SUMMARY.md`
   - Reason: Documentation archival
9. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/test-failure-analysis.md` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/docs/archive/test-failure-analysis.md`
   - Reason: Documentation archival
10. ✓ `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/test-results-summary.md` → `/home/efcunha/Projeto/restaurante-supabase/restaurante-app/restaurante-app/docs/archive/test-results-summary.md`
   - Reason: Documentation archival

### Modified Files (2)

1. ✓ `.gitignore`
   - Changes: Added 5 patterns to .gitignore
2. ✓ `restaurante-app/.gitignore`
   - Changes: Added 11 patterns to .gitignore

## Recommendations

1. **Run tests** to verify all functionality still works correctly:
   ```bash
   npm test
   ```

2. **Review archived documentation** in `docs/archive/` to ensure nothing important was archived

3. **Commit the cleanup changes**:
   ```bash
   git add .
   git commit -m "chore: repository cleanup and organization"
   ```

