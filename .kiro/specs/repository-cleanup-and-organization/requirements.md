# Requirements Document

## Introduction

This feature addresses the need to clean up and organize the repository after extensive development work including test stabilization, Firebase to Supabase migration, and database performance tuning. The project has accumulated temporary files, debug scripts, lint outputs, and documentation files that need to be organized or removed to maintain a clean, secure, and maintainable codebase.

## Glossary

- **Repository**: The Git repository containing the restaurante-supabase project
- **Temporary_Files**: Files created during debugging, testing, or development that are not needed for continued development (e.g., log files, lint outputs, test results)
- **Debug_Scripts**: One-time scripts created for debugging specific issues that are no longer needed
- **Sensitive_Files**: Files containing credentials, API keys, or configuration data that should not be committed to version control
- **Archive**: A designated location (docs/archive/) for storing obsolete but potentially useful documentation
- **Scripts_Directory**: A dedicated directory (scripts/) for organizing utility and maintenance scripts
- **Cleanup_Agent**: The automated system performing the repository cleanup operations

## Requirements

### Requirement 1: Temporary File Removal

**User Story:** As a developer, I want temporary files removed from the repository, so that the codebase remains clean and focused on production code.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent identifies log files (*.log, *.txt with "log" or "output" in name), THEN the System SHALL delete them from the repository
2. WHEN the Cleanup_Agent identifies lint output files (errors_only.txt, full_lint_output.txt, lint_full.txt, lint_output.txt, lint_report.txt), THEN the System SHALL delete them from the repository
3. WHEN the Cleanup_Agent identifies test output files (test-output.log, test-results-*.txt), THEN the System SHALL delete them from the repository
4. WHEN the Cleanup_Agent identifies temporary Firebase files (firestore.rules.temp), THEN the System SHALL delete them from the repository
5. WHEN temporary files are deleted, THEN the System SHALL verify they are listed in .gitignore to prevent future commits

### Requirement 2: SQL Script Organization

**User Story:** As a developer, I want SQL scripts organized in a dedicated directory, so that database-related files are easy to find and manage.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent identifies SQL files in the root or restaurante-app directory, THEN the System SHALL move them to restaurante-app/scripts/sql/
2. WHEN moving SQL files (get-full-schema.sql, add-order-status-constraint.sql), THEN the System SHALL preserve file contents exactly
3. WHEN the scripts/sql/ directory does not exist, THEN the System SHALL create it before moving files
4. WHEN SQL files are moved, THEN the System SHALL verify the move operation completed successfully

### Requirement 3: Debug Script Organization

**User Story:** As a developer, I want debug scripts organized or removed, so that only necessary utility scripts remain in the repository.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent identifies one-time debug scripts (check-profiles-schema.js, test-db-connection.js, apply-order-constraint.js), THEN the System SHALL move them to restaurante-app/scripts/debug/ or delete them
2. WHEN the Cleanup_Agent identifies setup scripts (setup_github.sh), THEN the System SHALL evaluate if they are still needed and either move to scripts/ or delete
3. WHEN moving debug scripts, THEN the System SHALL preserve file contents exactly
4. WHEN the scripts/debug/ directory does not exist, THEN the System SHALL create it before moving files

### Requirement 4: Documentation Organization

**User Story:** As a developer, I want temporary documentation organized or archived, so that only current, relevant documentation is easily accessible.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent identifies temporary documentation files (CRITICAL_FIXES_NEEDED.md, TEST_STABILIZATION_FINAL_SUMMARY.md, TEST_STATUS_SUMMARY.md, test-failure-analysis.md, test-results-summary.md), THEN the System SHALL move them to restaurante-app/docs/archive/
2. WHEN the Cleanup_Agent identifies TEST_DATABASE_SETUP.md, THEN the System SHALL evaluate if it should move to docs/ or docs/archive/
3. WHEN the docs/archive/ directory does not exist, THEN the System SHALL create it before moving files
4. WHEN documentation files are moved, THEN the System SHALL preserve file contents exactly
5. WHEN documentation is archived, THEN the System SHALL create an index file (docs/archive/README.md) listing archived documents with dates

### Requirement 5: Sensitive File Protection

**User Story:** As a security-conscious developer, I want sensitive files protected from version control, so that credentials and API keys are never exposed.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent identifies serviceAccountKey.json in the repository, THEN the System SHALL verify it is listed in .gitignore
2. WHEN the Cleanup_Agent identifies google-services.json or GoogleService-Info.plist, THEN the System SHALL verify they are listed in .gitignore
3. WHEN sensitive files are not in .gitignore, THEN the System SHALL add them to .gitignore
4. WHEN sensitive files exist in the working directory, THEN the System SHALL verify they are not tracked by Git
5. IF sensitive files are tracked by Git, THEN the System SHALL warn the user and provide instructions for removing them from Git history

### Requirement 6: Jest Configuration Consolidation

**User Story:** As a developer, I want Jest configurations organized logically, so that test configuration is clear and maintainable.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent identifies multiple Jest config files (jest.config.js, jest.config.performance.js, jest.config.supabase.js), THEN the System SHALL evaluate if they can be consolidated
2. WHEN Jest configs serve different purposes (unit tests, performance tests, integration tests), THEN the System SHALL keep them separate with clear naming
3. WHEN Jest configs are kept separate, THEN the System SHALL add comments explaining the purpose of each config file
4. WHEN Jest configs can be consolidated, THEN the System SHALL merge them into a single config with appropriate presets or projects

### Requirement 7: Gitignore Enhancement

**User Story:** As a developer, I want .gitignore updated to prevent future temporary files, so that the repository stays clean automatically.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent reviews .gitignore, THEN the System SHALL ensure patterns exist for temporary files (*.log, *output*.txt, *results*.txt, *.temp, *.tmp)
2. WHEN the Cleanup_Agent reviews .gitignore, THEN the System SHALL ensure patterns exist for sensitive files (serviceAccountKey.json, google-services.json, GoogleService-Info.plist, *-adminsdk-*.json)
3. WHEN the Cleanup_Agent reviews .gitignore, THEN the System SHALL ensure patterns exist for debug scripts directory (scripts/debug/)
4. WHEN the Cleanup_Agent reviews .gitignore, THEN the System SHALL ensure patterns exist for archived documentation (docs/archive/)
5. WHEN .gitignore patterns are missing, THEN the System SHALL add them with appropriate comments

### Requirement 8: Cleanup Validation

**User Story:** As a developer, I want validation that cleanup didn't break anything, so that I can be confident the repository still works correctly.

#### Acceptance Criteria

1. WHEN cleanup operations are complete, THEN the System SHALL verify that all test files still exist in their expected locations
2. WHEN cleanup operations are complete, THEN the System SHALL verify that all source code files remain unchanged
3. WHEN cleanup operations are complete, THEN the System SHALL verify that package.json and configuration files remain unchanged
4. WHEN cleanup operations are complete, THEN the System SHALL provide a summary report of all operations performed
5. WHEN cleanup operations are complete, THEN the System SHALL recommend running tests to verify functionality

### Requirement 9: Scripts Directory Structure

**User Story:** As a developer, I want a clear scripts directory structure, so that utility scripts are organized by purpose.

#### Acceptance Criteria

1. WHEN the Cleanup_Agent creates the scripts directory, THEN the System SHALL create subdirectories: scripts/sql/, scripts/debug/, scripts/utils/
2. WHEN the scripts directory structure is created, THEN the System SHALL create a README.md in scripts/ explaining the directory structure
3. WHEN utility scripts exist in the root or restaurante-app directory, THEN the System SHALL evaluate moving them to scripts/utils/
4. WHEN the scripts directory structure is complete, THEN the System SHALL ensure each subdirectory has a README.md explaining its purpose

### Requirement 10: Cleanup Report Generation

**User Story:** As a developer, I want a detailed cleanup report, so that I know exactly what was changed, moved, or deleted.

#### Acceptance Criteria

1. WHEN cleanup operations begin, THEN the System SHALL create a cleanup report file (CLEANUP_REPORT.md)
2. WHEN files are deleted, THEN the System SHALL log the file path and reason in the cleanup report
3. WHEN files are moved, THEN the System SHALL log the source path, destination path, and reason in the cleanup report
4. WHEN files are modified (e.g., .gitignore), THEN the System SHALL log what was changed and why in the cleanup report
5. WHEN cleanup operations are complete, THEN the System SHALL include a summary section with counts of files deleted, moved, and modified
