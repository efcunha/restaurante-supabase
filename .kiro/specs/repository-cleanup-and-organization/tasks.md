# Implementation Plan: Repository Cleanup and Organization

## Overview

This implementation plan breaks down the repository cleanup feature into discrete, incremental coding tasks. The approach follows a modular design where each component is built and tested independently before integration. The implementation will be done in JavaScript/Node.js as a standalone script that can be run manually or integrated into CI/CD workflows.

## Tasks

- [x] 1. Set up project structure and core types
  - Create `restaurante-app/scripts/cleanup/` directory for cleanup script
  - Create `cleanup.js` main entry point
  - Define TypeScript-style JSDoc types for Configuration, ScanResult, FileMetadata, Operation
  - Set up logging utility with different log levels (info, warn, error)
  - Install required dependencies: `fast-check` for property testing
  - _Requirements: All requirements (foundation)_

- [x] 2. Implement File Scanner module
  - [x] 2.1 Create FileScanner class with pattern matching logic
    - Implement constructor accepting scan configuration
    - Implement `scan()` method to traverse directory structure
    - Implement pattern matching methods: `isTemporaryFile()`, `isSQLScript()`, `isDebugScript()`, `isTemporaryDoc()`
    - Implement file categorization logic
    - Add path exclusion logic (node_modules, .git, build, coverage)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 4.1_
  
  - [ ]* 2.2 Write property test for temporary file pattern matching
    - **Property 1: Temporary File Pattern Matching**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  
  - [ ]* 2.3 Write property test for SQL script identification
    - **Property 5: SQL Script Organization**
    - **Validates: Requirements 2.1**
  
  - [ ]* 2.4 Write property test for debug script identification
    - **Property 6: Debug Script Organization**
    - **Validates: Requirements 3.1**
  
  - [ ]* 2.5 Write property test for temporary documentation identification
    - **Property 7: Temporary Documentation Archival**
    - **Validates: Requirements 4.1**
  
  - [ ]* 2.6 Write unit tests for FileScanner edge cases
    - Test empty directory handling
    - Test files with special characters
    - Test path exclusion logic
    - Test specific file examples (firebase-debug.log, errors_only.txt)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement Security Checker module
  - [x] 3.1 Create SecurityChecker class
    - Implement constructor accepting .gitignore path
    - Implement `readGitignore()` to parse .gitignore file
    - Implement `checkGitignore()` to verify sensitive file patterns exist
    - Implement `checkGitTracking()` using Git commands to check file tracking status
    - Implement `checkGitHistory()` to detect files in Git history
    - Add warning generation for tracked sensitive files
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 3.2 Write property test for sensitive file gitignore protection
    - **Property 9: Sensitive File Gitignore Protection**
    - **Validates: Requirements 5.1, 5.2, 5.3, 7.2**
  
  - [ ]* 3.3 Write property test for Git tracking verification
    - **Property 10: Git Tracking Verification**
    - **Validates: Requirements 5.4, 5.5**
  
  - [ ]* 3.4 Write unit tests for SecurityChecker
    - Test detection of serviceAccountKey.json not in .gitignore
    - Test warning generation for tracked sensitive files
    - Test Git command error handling
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 4. Implement Script Organizer module
  - [x] 4.1 Create ScriptOrganizer class
    - Implement constructor accepting base directory
    - Implement `createDirectoryStructure()` to create scripts/sql/, scripts/debug/, scripts/utils/
    - Implement `organizeSQLScripts()` to move SQL files
    - Implement `organizeDebugScripts()` to move debug scripts
    - Implement `createScriptReadmes()` to generate README files for each subdirectory
    - Add file move operation with error handling
    - _Requirements: 2.1, 2.3, 3.1, 3.4, 9.1, 9.2, 9.4_
  
  - [ ]* 4.2 Write property test for file move content preservation
    - **Property 2: File Move Preserves Content**
    - **Validates: Requirements 2.2, 3.3, 4.4**
  
  - [ ]* 4.3 Write property test for directory creation precondition
    - **Property 3: Directory Creation Precondition**
    - **Validates: Requirements 2.3, 3.4, 4.3**
  
  - [ ]* 4.4 Write property test for move operation atomicity
    - **Property 4: Move Operation Atomicity**
    - **Validates: Requirements 2.4**
  
  - [ ]* 4.5 Write property test for scripts directory structure
    - **Property 16: Scripts Directory Structure**
    - **Validates: Requirements 9.1, 9.2**
  
  - [ ]* 4.6 Write property test for subdirectory README creation
    - **Property 17: Subdirectory README Creation**
    - **Validates: Requirements 9.4**
  
  - [ ]* 4.7 Write unit tests for ScriptOrganizer
    - Test SQL file move from root to scripts/sql/
    - Test debug script move to scripts/debug/
    - Test README generation with correct content
    - Test error handling for permission denied
    - _Requirements: 2.1, 2.2, 3.1, 9.1, 9.2, 9.4_

- [ ] 5. Checkpoint - Ensure file organization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Documentation Organizer module
  - [x] 6.1 Create DocOrganizer class
    - Implement constructor accepting docs directory path
    - Implement `createArchiveDirectory()` to create docs/archive/
    - Implement `archiveDocs()` to move temporary documentation files
    - Implement `createArchiveIndex()` to generate archive README with file metadata
    - Implement `shouldKeepInMainDocs()` evaluation logic
    - Add timestamp and description generation for archived files
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [ ]* 6.2 Write property test for archive index generation
    - **Property 8: Archive Index Generation**
    - **Validates: Requirements 4.5**
  
  - [ ]* 6.3 Write unit tests for DocOrganizer
    - Test temporary doc archival
    - Test archive index creation with correct metadata
    - Test evaluation of TEST_DATABASE_SETUP.md
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 7. Implement Gitignore Updater module
  - [x] 7.1 Create GitignoreUpdater class
    - Implement constructor accepting .gitignore path
    - Implement `readGitignore()` to parse existing patterns
    - Implement `hasPattern()` to check if pattern exists
    - Implement `addPatterns()` to add missing patterns with comments
    - Implement `verifyPatterns()` to test pattern effectiveness
    - Add duplicate prevention logic
    - _Requirements: 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 7.2 Write property test for gitignore pattern completeness
    - **Property 11: Gitignore Pattern Completeness**
    - **Validates: Requirements 1.5, 7.1, 7.2, 7.3, 7.4, 7.5**
  
  - [ ]* 7.3 Write property test for gitignore pattern addition idempotence
    - **Property 18: Gitignore Pattern Addition Idempotence**
    - **Validates: Requirements 7.5**
  
  - [ ]* 7.4 Write unit tests for GitignoreUpdater
    - Test adding patterns to empty .gitignore
    - Test adding patterns to existing .gitignore
    - Test duplicate prevention
    - Test pattern verification
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Implement Report Generator module
  - [x] 8.1 Create ReportGenerator class
    - Implement constructor accepting output path
    - Implement `startReport()` to initialize report
    - Implement `logOperation()` to record delete/move/modify operations
    - Implement `logWarning()` and `logError()` for issues
    - Implement `generateReport()` to create markdown report with summary
    - Add operation counting and categorization
    - Include test recommendation in report
    - _Requirements: 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 8.2 Write property test for cleanup report generation
    - **Property 14: Cleanup Report Generation**
    - **Validates: Requirements 8.4, 10.1, 10.2, 10.3, 10.4, 10.5**
  
  - [ ]* 8.3 Write property test for test recommendation inclusion
    - **Property 15: Test Recommendation Inclusion**
    - **Validates: Requirements 8.5**
  
  - [ ]* 8.4 Write unit tests for ReportGenerator
    - Test report creation with various operations
    - Test summary section with correct counts
    - Test markdown formatting
    - Test recommendation inclusion
    - _Requirements: 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 9. Checkpoint - Ensure all module tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Cleanup Orchestrator
  - [x] 10.1 Create CleanupOrchestrator class
    - Implement constructor accepting configuration
    - Implement `run()` method coordinating all phases
    - Implement `dryRun()` method for preview mode
    - Implement analysis phase (file scanning)
    - Implement safety check phase (security verification)
    - Implement execution phase (file operations)
    - Implement validation phase (integrity checks)
    - Implement reporting phase (report generation)
    - Add error handling and rollback logic
    - _Requirements: All requirements (orchestration)_
  
  - [ ]* 10.2 Write property test for critical file preservation
    - **Property 13: Critical File Preservation**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [ ]* 10.3 Write unit tests for CleanupOrchestrator
    - Test dry run mode produces correct preview
    - Test rollback after failure
    - Test phase execution order
    - Test error handling for various failure scenarios
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 11. Implement error handling and safety mechanisms
  - [ ] 11.1 Add comprehensive error handling
    - Implement `safeFileOperation()` wrapper with error categorization
    - Add file system error handling (ENOENT, EACCES, ENOSPC)
    - Add Git error handling with graceful degradation
    - Implement validation error checking for critical paths
    - Add circular move detection
    - _Requirements: All requirements (safety)_
  
  - [ ] 11.2 Implement CleanupTransaction for rollback
    - Create transaction class tracking operations
    - Implement `execute()` method with automatic rollback on failure
    - Implement `rollback()` method to undo completed operations
    - Add undo logic for each operation type (delete, move, modify)
    - _Requirements: All requirements (safety)_
  
  - [ ]* 11.3 Write unit tests for error handling
    - Test file not found error handling
    - Test permission denied error handling
    - Test disk space error handling
    - Test rollback functionality
    - Test critical path protection
    - _Requirements: All requirements (safety)_

- [ ] 12. Implement Jest configuration handling
  - [ ] 12.1 Add Jest config evaluation logic
    - Implement logic to identify multiple Jest configs
    - Implement evaluation of whether configs can be consolidated
    - Implement comment addition to Jest config files
    - Add logic to determine config purposes (unit, performance, integration)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 12.2 Write property test for Jest config comment addition
    - **Property 12: Jest Config Comment Addition**
    - **Validates: Requirements 6.3**
  
  - [ ]* 12.3 Write unit tests for Jest config handling
    - Test identification of multiple configs
    - Test comment addition to config files
    - Test consolidation evaluation logic
    - _Requirements: 6.1, 6.3_

- [x] 13. Create main CLI script
  - [x] 13.1 Implement command-line interface
    - Create main `cleanup.js` script with CLI argument parsing
    - Add flags: --dry-run, --auto-confirm, --verbose, --report-path
    - Implement configuration loading from file or CLI args
    - Add user confirmation prompt (unless --auto-confirm)
    - Add progress indicators during execution
    - Display summary and report path on completion
    - _Requirements: All requirements (CLI)_
  
  - [x] 13.2 Add package.json script entry
    - Add "cleanup" script to restaurante-app/package.json
    - Add "cleanup:dry-run" script for safe preview
    - Document script usage in comments
    - _Requirements: All requirements (CLI)_
  
  - [ ]* 13.3 Write integration tests for full cleanup workflow
    - Test complete cleanup on mock repository structure
    - Test dry run mode
    - Test with various configuration options
    - Verify all file operations completed correctly
    - Verify report generation
    - _Requirements: All requirements (integration)_

- [x] 14. Create documentation
  - [x] 14.1 Create cleanup script README
    - Create `restaurante-app/scripts/cleanup/README.md`
    - Document script purpose and features
    - Document usage instructions and CLI flags
    - Document configuration options
    - Add examples of dry run and actual cleanup
    - Add safety recommendations
    - _Requirements: All requirements (documentation)_
  
  - [x] 14.2 Update main project README
    - Add section about repository cleanup script
    - Link to cleanup script README
    - Add maintenance section if not present
    - _Requirements: All requirements (documentation)_

- [x] 15. Final checkpoint and validation
  - Run cleanup script in dry-run mode on actual repository
  - Review dry-run output for any unexpected operations
  - Ensure all tests pass (npm test)
  - Verify no critical files are targeted for deletion
  - Ask user to review dry-run output before proceeding
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows a modular approach where each component is independently testable
- Safety mechanisms (dry-run, rollback, validation) are built in from the start
- The final checkpoint includes running on the actual repository in dry-run mode for safety
