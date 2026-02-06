# Repository Cleanup Script

Automated script for cleaning up and organizing the repository after development work.

## Purpose

This script performs comprehensive repository cleanup including:

- **Removing temporary files**: Logs, lint outputs, test results, and other temporary files
- **Organizing SQL scripts**: Moves SQL files to `scripts/sql/` directory
- **Organizing debug scripts**: Moves one-time debug scripts to `scripts/debug/` directory
- **Archiving documentation**: Moves temporary documentation to `docs/archive/`
- **Updating .gitignore**: Adds missing patterns to prevent future temporary files
- **Protecting sensitive files**: Verifies sensitive files are not tracked by Git

## Features

### Safety Features

- **Dry-run mode**: Preview all changes before executing them
- **Critical file protection**: Prevents accidental deletion of important files
- **Content verification**: Verifies file content matches after moves
- **Detailed reporting**: Generates comprehensive report of all operations
- **Rollback capability**: Can undo operations if errors occur

### Security Features

- **Sensitive file detection**: Identifies credentials and API keys
- **Git tracking verification**: Checks if sensitive files are tracked
- **Gitignore updates**: Automatically adds protection patterns
- **Security warnings**: Alerts about exposed credentials

## Usage

### Quick Start

```bash
# 1. Preview cleanup (RECOMMENDED FIRST STEP)
npm run cleanup:dry-run

# 2. Review the dry-run output

# 3. Execute cleanup
npm run cleanup
```

### Command-Line Options

```bash
node scripts/cleanup/cleanup.js [options]
```

**Options:**

- `--dry-run` - Preview changes without executing them (recommended first)
- `--auto-confirm` - Skip user confirmation prompts
- `--verbose` - Enable detailed logging for debugging
- `--report-path <path>` - Custom path for cleanup report (default: CLEANUP_REPORT.md)
- `--help`, `-h` - Show help message

### Examples

```bash
# Preview cleanup with detailed logging
npm run cleanup:dry-run -- --verbose

# Run cleanup with custom report path
node scripts/cleanup/cleanup.js --report-path cleanup-2024-01-15.md

# Run cleanup automatically (no confirmation)
node scripts/cleanup/cleanup.js --auto-confirm
```

## What Gets Cleaned

### Temporary Files (Deleted)

- `*.log` - Log files
- `*output*.txt` - Lint and build output files
- `*results*.txt` - Test result files
- `*.temp`, `*.tmp` - Temporary files
- `firestore.rules.temp` - Temporary Firebase rules

**Specific files:**
- `errors_only.txt`
- `full_lint_output.txt`
- `lint_full.txt`
- `lint_output.txt`
- `lint_report.txt`
- `test-output.log`
- `test-results-*.txt`

### SQL Scripts (Moved to `scripts/sql/`)

- `*.sql` files in root or `restaurante-app/` directory
- Examples: `get-full-schema.sql`, `add-order-status-constraint.sql`

### Debug Scripts (Moved to `scripts/debug/`)

- `check-*.js` - Schema checking scripts
- `test-db-*.js` - Database connection test scripts
- `apply-*.js` - One-time application scripts

**Specific files:**
- `check-profiles-schema.js`
- `test-db-connection.js`
- `apply-order-constraint.js`

### Temporary Documentation (Archived to `docs/archive/`)

- `CRITICAL_FIXES_NEEDED.md`
- `TEST_STABILIZATION_FINAL_SUMMARY.md`
- `TEST_STATUS_SUMMARY.md`
- `test-failure-analysis.md`
- `test-results-summary.md`

**Note:** `TEST_DATABASE_SETUP.md` is moved to `docs/` (not archived) as it may still be useful.

### Sensitive Files (Protected)

The script verifies these files are in `.gitignore` and not tracked by Git:

- `serviceAccountKey.json`
- `google-services.json`
- `GoogleService-Info.plist`
- `*-adminsdk-*.json`

**If sensitive files are tracked by Git, the script will warn you and provide instructions for removing them from Git history.**

## Directory Structure Created

```
restaurante-app/
  scripts/
    sql/              # SQL scripts
      README.md
      *.sql
    debug/            # Debug scripts
      README.md
      *.js
    utils/            # Utility scripts
      README.md
    cleanup/          # This cleanup script
      README.md
      cleanup.js
      *.js
  docs/
    archive/          # Archived documentation
      README.md
      *.md
```

## Output

### Cleanup Report

After running, a detailed report is generated (default: `CLEANUP_REPORT.md`) containing:

- **Summary**: Counts of operations performed
- **Deleted Files**: List of files deleted with reasons
- **Moved Files**: List of files moved with source and destination
- **Modified Files**: List of files modified (e.g., .gitignore)
- **Warnings**: Security warnings and issues
- **Recommendations**: Next steps to take

### Example Report

```markdown
# Repository Cleanup Report

**Date**: 2024-01-15 14:30:00
**Duration**: 2.5 seconds

## Summary

- Files Deleted: 15
- Files Moved: 8
- Files Modified: 2
- Warnings: 1
- Errors: 0

## Operations Performed

### Deleted Files (15)

1. ✓ `firebase-debug.log`
   - Reason: Temporary file cleanup
...

### Moved Files (8)

1. ✓ `get-full-schema.sql` → `restaurante-app/scripts/sql/get-full-schema.sql`
   - Reason: SQL script organization
...

## Recommendations

1. Run tests to verify functionality: `npm test`
2. Review archived documentation in `docs/archive/`
3. Commit changes: `git add . && git commit -m "chore: repository cleanup"`
```

## Safety Recommendations

### Before Running

1. **Commit your work**: Ensure all important changes are committed
   ```bash
   git add .
   git commit -m "Work in progress before cleanup"
   ```

2. **Run dry-run first**: Always preview changes before executing
   ```bash
   npm run cleanup:dry-run
   ```

3. **Review the output**: Check that no important files are targeted

### After Running

1. **Review the report**: Check `CLEANUP_REPORT.md` for all operations

2. **Run tests**: Verify nothing broke
   ```bash
   npm test
   ```

3. **Check Git status**: Review what changed
   ```bash
   git status
   git diff
   ```

4. **Commit cleanup**: If everything looks good
   ```bash
   git add .
   git commit -m "chore: repository cleanup and organization"
   ```

## Troubleshooting

### Script Fails with Permission Error

**Problem**: Cannot delete or move files due to permissions

**Solution**: 
- Check file permissions
- Close any programs that might have files open
- Run with appropriate permissions

### Sensitive Files Tracked by Git

**Problem**: Script warns that sensitive files are in Git history

**Solution**: Follow the recommendations in the cleanup report to remove files from Git history using `git-filter-repo` or BFG Repo-Cleaner.

### Tests Fail After Cleanup

**Problem**: Tests fail after running cleanup

**Solution**:
- Review the cleanup report to see what was moved/deleted
- Check if any test files were accidentally moved
- Restore from Git if needed: `git checkout -- <file>`

### Want to Undo Cleanup

**Problem**: Need to undo cleanup operations

**Solution**:
- If you haven't committed: `git checkout -- .`
- If you have committed: `git revert HEAD`
- If you need specific files: `git checkout HEAD~1 -- <file>`

## Configuration

The script uses default configuration but can be customized by modifying `cleanup.js`:

```javascript
const DEFAULT_SCAN_CONFIG = {
  temporaryPatterns: [...],
  sqlPatterns: [...],
  debugScriptPatterns: [...],
  temporaryDocPatterns: [...],
  sensitiveFilePatterns: [...],
  excludePaths: [...]
};
```

## Development

### Running Tests

```bash
npm test -- scripts/cleanup
```

### Adding New Patterns

To add new file patterns for cleanup:

1. Edit `cleanup.js` and update `DEFAULT_SCAN_CONFIG`
2. Add pattern to appropriate array
3. Test with dry-run mode
4. Update this README

## Support

For issues or questions:

1. Check the cleanup report for detailed information
2. Run with `--verbose` flag for detailed logging
3. Review this README for troubleshooting steps
4. Check Git history if you need to restore files

## License

This script is part of the restaurante-supabase project.
