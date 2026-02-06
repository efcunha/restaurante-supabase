# Design Document: Repository Cleanup and Organization

## Overview

This design outlines a systematic approach to cleaning up and organizing the repository after extensive development work. The cleanup process will be implemented as a Node.js script that can be run manually or as part of CI/CD workflows. The design prioritizes safety (no accidental deletion of important files), security (protecting sensitive credentials), and maintainability (clear organization structure).

The cleanup will be performed in phases:
1. **Analysis Phase**: Scan and categorize files
2. **Safety Check Phase**: Verify no critical files will be affected
3. **Execution Phase**: Perform file operations (delete, move, modify)
4. **Validation Phase**: Verify repository integrity
5. **Reporting Phase**: Generate detailed cleanup report

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cleanup Orchestrator                      │
│  (Main script that coordinates all cleanup operations)       │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬──────────────┬────────────────┐
             │              │              │              │                │
             ▼              ▼              ▼              ▼                ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   File     │  │  Security  │  │   Script   │  │    Doc     │  │  Gitignore │
    │  Scanner   │  │  Checker   │  │ Organizer  │  │ Organizer  │  │  Updater   │
    └────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘
         │               │               │               │                │
         └───────────────┴───────────────┴───────────────┴────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  Report Generator│
                            └──────────────────┘
```

### Component Responsibilities

1. **Cleanup Orchestrator**: Main entry point, coordinates all operations, handles errors
2. **File Scanner**: Identifies files to clean up based on patterns and rules
3. **Security Checker**: Verifies sensitive files are protected, checks Git tracking status
4. **Script Organizer**: Moves SQL and debug scripts to appropriate directories
5. **Doc Organizer**: Archives temporary documentation, creates index files
6. **Gitignore Updater**: Adds missing patterns to .gitignore files
7. **Report Generator**: Creates detailed cleanup report with all operations

## Components and Interfaces

### 1. File Scanner Module

**Purpose**: Identify files that need cleanup based on configurable rules

**Interface**:
```javascript
class FileScanner {
  constructor(config)
  
  // Scan repository and categorize files
  async scan(rootPath): Promise<ScanResult>
  
  // Check if file matches temporary file patterns
  isTemporaryFile(filePath): boolean
  
  // Check if file is a SQL script
  isSQLScript(filePath): boolean
  
  // Check if file is a debug script
  isDebugScript(filePath): boolean
  
  // Check if file is temporary documentation
  isTemporaryDoc(filePath): boolean
}

interface ScanResult {
  temporaryFiles: string[]      // Files to delete
  sqlScripts: string[]          // SQL files to move
  debugScripts: string[]        // Debug scripts to move/delete
  temporaryDocs: string[]       // Docs to archive
  sensitiveFiles: string[]      // Files to check security
  jestConfigs: string[]         // Jest config files
}
```

**Configuration**:
```javascript
const scanConfig = {
  temporaryPatterns: [
    '*.log',
    '*output*.txt',
    '*results*.txt',
    '*.temp',
    'firestore.rules.temp'
  ],
  sqlPatterns: ['*.sql'],
  debugScriptPatterns: [
    'check-*.js',
    'test-db-*.js',
    'apply-*.js'
  ],
  temporaryDocPatterns: [
    'CRITICAL_FIXES_NEEDED.md',
    'TEST_*_SUMMARY.md',
    'test-*-analysis.md',
    'test-results-*.md'
  ],
  sensitiveFilePatterns: [
    'serviceAccountKey.json',
    'google-services.json',
    'GoogleService-Info.plist',
    '*-adminsdk-*.json'
  ],
  excludePaths: [
    'node_modules/',
    '.git/',
    'build/',
    'coverage/'
  ]
}
```

### 2. Security Checker Module

**Purpose**: Ensure sensitive files are protected from version control

**Interface**:
```javascript
class SecurityChecker {
  constructor(gitignorePath)
  
  // Check if sensitive files are in .gitignore
  async checkGitignore(sensitiveFiles): Promise<SecurityCheckResult>
  
  // Check if files are tracked by Git
  async checkGitTracking(files): Promise<GitTrackingResult>
  
  // Verify file is not in Git history
  async checkGitHistory(filePath): Promise<boolean>
}

interface SecurityCheckResult {
  missingFromGitignore: string[]
  recommendations: string[]
}

interface GitTrackingResult {
  trackedFiles: string[]        // Files currently tracked by Git
  untrackedFiles: string[]      // Files not tracked
  warnings: string[]            // Security warnings
}
```

### 3. Script Organizer Module

**Purpose**: Move SQL and debug scripts to organized directory structure

**Interface**:
```javascript
class ScriptOrganizer {
  constructor(baseDir)
  
  // Create scripts directory structure
  async createDirectoryStructure(): Promise<void>
  
  // Move SQL scripts to scripts/sql/
  async organizeSQLScripts(sqlFiles): Promise<MoveResult[]>
  
  // Move or delete debug scripts
  async organizeDebugScripts(debugFiles): Promise<MoveResult[]>
  
  // Create README files for script directories
  async createScriptReadmes(): Promise<void>
}

interface MoveResult {
  source: string
  destination: string
  success: boolean
  error?: string
}
```

**Directory Structure Created**:
```
restaurante-app/
  scripts/
    README.md              # Overview of scripts directory
    sql/
      README.md            # SQL scripts documentation
      *.sql               # SQL migration and utility scripts
    debug/
      README.md            # Debug scripts documentation
      *.js                # Debug and diagnostic scripts
    utils/
      README.md            # Utility scripts documentation
      *.js                # General utility scripts
```

### 4. Documentation Organizer Module

**Purpose**: Archive temporary documentation and maintain documentation index

**Interface**:
```javascript
class DocOrganizer {
  constructor(docsDir)
  
  // Create docs/archive/ directory
  async createArchiveDirectory(): Promise<void>
  
  // Move temporary docs to archive
  async archiveDocs(docFiles): Promise<MoveResult[]>
  
  // Create archive index with metadata
  async createArchiveIndex(archivedFiles): Promise<void>
  
  // Evaluate if doc should be kept in main docs/
  shouldKeepInMainDocs(docPath): boolean
}

interface ArchiveEntry {
  filename: string
  originalPath: string
  archivedDate: string
  description: string
  relatedTo: string[]      // Related features/specs
}
```

### 5. Gitignore Updater Module

**Purpose**: Update .gitignore files with missing patterns

**Interface**:
```javascript
class GitignoreUpdater {
  constructor(gitignorePath)
  
  // Read and parse .gitignore
  async readGitignore(): Promise<string[]>
  
  // Check if pattern exists in .gitignore
  hasPattern(pattern): boolean
  
  // Add missing patterns with comments
  async addPatterns(patterns): Promise<UpdateResult>
  
  // Verify patterns are working
  async verifyPatterns(patterns): Promise<boolean>
}

interface UpdateResult {
  added: string[]
  alreadyPresent: string[]
  failed: string[]
}
```

**Patterns to Add**:
```gitignore
# Temporary files (added by cleanup script)
*.log
*output*.txt
*results*.txt
*.temp
*.tmp

# Sensitive files (added by cleanup script)
serviceAccountKey.json
google-services.json
GoogleService-Info.plist
*-adminsdk-*.json

# Debug scripts (added by cleanup script)
scripts/debug/

# Archived documentation (added by cleanup script)
docs/archive/
```

### 6. Report Generator Module

**Purpose**: Generate detailed cleanup report

**Interface**:
```javascript
class ReportGenerator {
  constructor(outputPath)
  
  // Start new report
  startReport(): void
  
  // Log operation (delete, move, modify)
  logOperation(operation): void
  
  // Add warning or error
  logWarning(message): void
  logError(message): void
  
  // Generate final report
  async generateReport(): Promise<string>
}

interface Operation {
  type: 'delete' | 'move' | 'modify'
  source: string
  destination?: string
  reason: string
  timestamp: string
  success: boolean
  error?: string
}
```

**Report Format**:
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

1. `firebase-debug.log` - Temporary Firebase debug log
2. `restaurante-app/errors_only.txt` - Temporary lint output
...

### Moved Files (8)

1. `get-full-schema.sql` → `restaurante-app/scripts/sql/get-full-schema.sql`
   Reason: SQL script organization
...

### Modified Files (2)

1. `.gitignore` - Added patterns for temporary files and sensitive files
2. `restaurante-app/.gitignore` - Added patterns for debug scripts

## Warnings

1. `serviceAccountKey.json` is tracked by Git - recommend removing from history

## Recommendations

1. Run `npm test` to verify all tests still pass
2. Review archived documentation in `docs/archive/`
3. Consider removing sensitive files from Git history using git-filter-repo
```

### 7. Cleanup Orchestrator

**Purpose**: Coordinate all cleanup operations with safety checks

**Interface**:
```javascript
class CleanupOrchestrator {
  constructor(config)
  
  // Run full cleanup process
  async run(): Promise<CleanupResult>
  
  // Run in dry-run mode (no actual changes)
  async dryRun(): Promise<CleanupResult>
  
  // Run specific phase only
  async runPhase(phase): Promise<PhaseResult>
}

interface CleanupResult {
  success: boolean
  operations: Operation[]
  warnings: string[]
  errors: string[]
  report: string
}
```

**Execution Flow**:
```javascript
async run() {
  // Phase 1: Analysis
  const scanResult = await fileScanner.scan(rootPath)
  
  // Phase 2: Safety Check
  const securityCheck = await securityChecker.checkGitignore(scanResult.sensitiveFiles)
  const trackingCheck = await securityChecker.checkGitTracking(scanResult.sensitiveFiles)
  
  // Phase 3: User Confirmation (if not in auto mode)
  if (!config.autoConfirm) {
    await promptUserConfirmation(scanResult)
  }
  
  // Phase 4: Execution
  await scriptOrganizer.createDirectoryStructure()
  await scriptOrganizer.organizeSQLScripts(scanResult.sqlScripts)
  await scriptOrganizer.organizeDebugScripts(scanResult.debugScripts)
  await docOrganizer.archiveDocs(scanResult.temporaryDocs)
  await deleteTemporaryFiles(scanResult.temporaryFiles)
  await gitignoreUpdater.addPatterns(missingPatterns)
  
  // Phase 5: Validation
  await validateRepositoryIntegrity()
  
  // Phase 6: Reporting
  const report = await reportGenerator.generateReport()
  
  return { success: true, report, ... }
}
```

## Data Models

### Configuration Model

```javascript
interface CleanupConfig {
  // Paths
  rootPath: string
  restauranteAppPath: string
  
  // Behavior
  dryRun: boolean              // Don't actually perform operations
  autoConfirm: boolean         // Skip user confirmation
  verbose: boolean             // Detailed logging
  
  // Safety
  requireBackup: boolean       // Require Git commit before cleanup
  maxFilesToDelete: number     // Safety limit on deletions
  
  // Patterns
  scanConfig: ScanConfig
  
  // Output
  reportPath: string
}
```

### File Metadata Model

```javascript
interface FileMetadata {
  path: string
  relativePath: string
  size: number
  created: Date
  modified: Date
  category: FileCategory
  action: FileAction
  reason: string
}

enum FileCategory {
  TEMPORARY_FILE = 'temporary_file',
  SQL_SCRIPT = 'sql_script',
  DEBUG_SCRIPT = 'debug_script',
  TEMPORARY_DOC = 'temporary_doc',
  SENSITIVE_FILE = 'sensitive_file',
  JEST_CONFIG = 'jest_config',
  UNKNOWN = 'unknown'
}

enum FileAction {
  DELETE = 'delete',
  MOVE = 'move',
  ARCHIVE = 'archive',
  KEEP = 'keep',
  WARN = 'warn'
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Temporary File Pattern Matching

*For any* file structure containing files matching temporary patterns (*.log, *output*.txt, *results*.txt, *.temp, firestore.rules.temp, lint output files), the file scanner should identify all matching files for deletion.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: File Move Preserves Content

*For any* file that is moved (SQL scripts, debug scripts, documentation), the file contents at the destination should be byte-for-byte identical to the contents at the source.

**Validates: Requirements 2.2, 3.3, 4.4**

### Property 3: Directory Creation Precondition

*For any* file move operation requiring a destination directory, if the directory does not exist, it should be created before the move operation is attempted.

**Validates: Requirements 2.3, 3.4, 4.3**

### Property 4: Move Operation Atomicity

*For any* successful file move operation, the file should exist at the destination and should not exist at the source location.

**Validates: Requirements 2.4**

### Property 5: SQL Script Organization

*For any* SQL file (*.sql) found in the root or restaurante-app directory, it should be identified for moving to restaurante-app/scripts/sql/.

**Validates: Requirements 2.1**

### Property 6: Debug Script Organization

*For any* file matching debug script patterns (check-*.js, test-db-*.js, apply-*.js), it should be identified for moving to restaurante-app/scripts/debug/ or deletion.

**Validates: Requirements 3.1**

### Property 7: Temporary Documentation Archival

*For any* file matching temporary documentation patterns (CRITICAL_FIXES_NEEDED.md, TEST_*_SUMMARY.md, test-*-analysis.md, test-results-*.md), it should be identified for moving to restaurante-app/docs/archive/.

**Validates: Requirements 4.1**

### Property 8: Archive Index Generation

*For any* set of archived documentation files, an index file (docs/archive/README.md) should be created containing entries for all archived files with their filenames, original paths, and archive dates.

**Validates: Requirements 4.5**

### Property 9: Sensitive File Gitignore Protection

*For any* sensitive file pattern (serviceAccountKey.json, google-services.json, GoogleService-Info.plist, *-adminsdk-*.json), the corresponding pattern should exist in .gitignore after cleanup.

**Validates: Requirements 5.1, 5.2, 5.3, 7.2**

### Property 10: Git Tracking Verification

*For any* sensitive file that exists in the working directory, the system should verify it is not tracked by Git and generate a warning if it is tracked.

**Validates: Requirements 5.4, 5.5**

### Property 11: Gitignore Pattern Completeness

*For any* cleanup operation, after completion, .gitignore should contain patterns for all categories: temporary files (*.log, *output*.txt, *results*.txt, *.temp, *.tmp), sensitive files, debug scripts (scripts/debug/), and archived documentation (docs/archive/).

**Validates: Requirements 1.5, 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 12: Jest Config Comment Addition

*For any* Jest configuration file that is kept separate, the file should contain comments explaining its purpose after cleanup.

**Validates: Requirements 6.3**

### Property 13: Critical File Preservation

*For any* cleanup operation, all test files (__tests__/), source code files (src/), package.json, and configuration files (except .gitignore) should remain unchanged in content and location.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 14: Cleanup Report Generation

*For any* cleanup operation, a report file should be created containing all operations performed (deletions, moves, modifications) with file paths, reasons, and a summary section with operation counts.

**Validates: Requirements 8.4, 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 15: Test Recommendation Inclusion

*For any* cleanup report generated, it should contain a recommendation to run tests to verify functionality.

**Validates: Requirements 8.5**

### Property 16: Scripts Directory Structure

*For any* cleanup operation that creates the scripts directory, it should create all required subdirectories (scripts/sql/, scripts/debug/, scripts/utils/) and a README.md in the scripts/ directory.

**Validates: Requirements 9.1, 9.2**

### Property 17: Subdirectory README Creation

*For any* scripts subdirectory created (sql/, debug/, utils/), a README.md file should exist in that subdirectory explaining its purpose.

**Validates: Requirements 9.4**

### Property 18: Gitignore Pattern Addition Idempotence

*For any* .gitignore file, adding patterns that already exist should not duplicate them, and running the gitignore updater multiple times should produce the same result as running it once.

**Validates: Requirements 7.5**

## Error Handling

### Error Categories

1. **File System Errors**
   - File not found during move/delete
   - Permission denied
   - Disk space issues
   - Path too long

2. **Git Errors**
   - Unable to check Git tracking status
   - Git repository not found
   - Git command failures

3. **Validation Errors**
   - Critical files accidentally targeted for deletion
   - Invalid file paths
   - Circular directory moves

4. **Configuration Errors**
   - Invalid configuration file
   - Missing required configuration
   - Invalid patterns

### Error Handling Strategies

**File System Errors**:
```javascript
async function safeFileOperation(operation, filePath) {
  try {
    await operation(filePath)
    return { success: true, path: filePath }
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`File not found: ${filePath}`)
      return { success: false, path: filePath, error: 'File not found' }
    } else if (error.code === 'EACCES') {
      logger.error(`Permission denied: ${filePath}`)
      return { success: false, path: filePath, error: 'Permission denied' }
    } else if (error.code === 'ENOSPC') {
      logger.error(`Disk space issue: ${filePath}`)
      throw new Error('Insufficient disk space - aborting cleanup')
    } else {
      logger.error(`Unexpected error for ${filePath}: ${error.message}`)
      return { success: false, path: filePath, error: error.message }
    }
  }
}
```

**Git Errors**:
```javascript
async function checkGitTracking(filePath) {
  try {
    const result = await execGitCommand(['ls-files', filePath])
    return result.trim().length > 0
  } catch (error) {
    logger.warn(`Unable to check Git tracking for ${filePath}: ${error.message}`)
    return null  // Unknown status
  }
}
```

**Validation Errors**:
```javascript
function validateFileOperation(operation) {
  // Check if targeting critical files
  const criticalPaths = [
    'package.json',
    'src/',
    '__tests__/',
    'node_modules/',
    '.git/'
  ]
  
  for (const criticalPath of criticalPaths) {
    if (operation.path.includes(criticalPath)) {
      throw new ValidationError(
        `Attempted to ${operation.type} critical path: ${operation.path}`
      )
    }
  }
  
  // Check for circular moves
  if (operation.type === 'move') {
    if (operation.destination.startsWith(operation.source)) {
      throw new ValidationError(
        `Circular move detected: ${operation.source} -> ${operation.destination}`
      )
    }
  }
}
```

**Rollback Strategy**:
```javascript
class CleanupTransaction {
  constructor() {
    this.operations = []
    this.completed = []
  }
  
  async execute(operation) {
    try {
      await operation.perform()
      this.completed.push(operation)
    } catch (error) {
      logger.error(`Operation failed: ${error.message}`)
      await this.rollback()
      throw error
    }
  }
  
  async rollback() {
    logger.info('Rolling back operations...')
    for (const operation of this.completed.reverse()) {
      try {
        await operation.undo()
      } catch (error) {
        logger.error(`Rollback failed for operation: ${error.message}`)
      }
    }
  }
}
```

### Safety Mechanisms

1. **Dry Run Mode**: Preview all operations without executing them
2. **Backup Requirement**: Require clean Git state before cleanup
3. **Operation Limits**: Maximum number of files to delete in one run
4. **Critical Path Protection**: Blacklist of paths that should never be modified
5. **User Confirmation**: Prompt for confirmation before destructive operations

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for complete validation

### Property-Based Testing

**Library**: Use `fast-check` for JavaScript/Node.js property-based testing

**Configuration**: Each property test should run a minimum of 100 iterations to ensure thorough coverage through randomization.

**Test Tagging**: Each property-based test must include a comment tag referencing the design document property:
```javascript
// Feature: repository-cleanup-and-organization, Property 1: Temporary File Pattern Matching
```

**Property Test Examples**:

```javascript
// Feature: repository-cleanup-and-organization, Property 2: File Move Preserves Content
test('file moves preserve content exactly', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string(), // file content
      fc.string({ minLength: 1 }), // filename
      async (content, filename) => {
        const source = path.join(tempDir, filename)
        const dest = path.join(tempDir, 'moved', filename)
        
        await fs.writeFile(source, content)
        await scriptOrganizer.moveFile(source, dest)
        
        const movedContent = await fs.readFile(dest, 'utf-8')
        expect(movedContent).toBe(content)
      }
    ),
    { numRuns: 100 }
  )
})

// Feature: repository-cleanup-and-organization, Property 18: Gitignore Pattern Addition Idempotence
test('adding gitignore patterns is idempotent', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.string({ minLength: 1 })), // patterns to add
      async (patterns) => {
        const gitignorePath = path.join(tempDir, '.gitignore')
        await fs.writeFile(gitignorePath, '')
        
        const updater = new GitignoreUpdater(gitignorePath)
        await updater.addPatterns(patterns)
        const contentAfterFirst = await fs.readFile(gitignorePath, 'utf-8')
        
        await updater.addPatterns(patterns)
        const contentAfterSecond = await fs.readFile(gitignorePath, 'utf-8')
        
        expect(contentAfterFirst).toBe(contentAfterSecond)
      }
    ),
    { numRuns: 100 }
  )
})
```

### Unit Testing

**Focus Areas**:
- Specific file patterns (e.g., "firebase-debug.log" is identified as temporary)
- Edge cases (empty directories, files with special characters)
- Error conditions (permission denied, file not found)
- Integration between components

**Example Unit Tests**:

```javascript
describe('FileScanner', () => {
  test('identifies firebase-debug.log as temporary file', async () => {
    const scanner = new FileScanner(scanConfig)
    const result = await scanner.scan(testDir)
    expect(result.temporaryFiles).toContain('firebase-debug.log')
  })
  
  test('handles empty directory gracefully', async () => {
    const scanner = new FileScanner(scanConfig)
    const result = await scanner.scan(emptyDir)
    expect(result.temporaryFiles).toEqual([])
  })
  
  test('throws error when permission denied', async () => {
    const scanner = new FileScanner(scanConfig)
    await expect(scanner.scan(restrictedDir)).rejects.toThrow('Permission denied')
  })
})

describe('SecurityChecker', () => {
  test('detects serviceAccountKey.json not in gitignore', async () => {
    const checker = new SecurityChecker(gitignorePath)
    const result = await checker.checkGitignore(['serviceAccountKey.json'])
    expect(result.missingFromGitignore).toContain('serviceAccountKey.json')
  })
  
  test('warns when sensitive file is tracked by git', async () => {
    const checker = new SecurityChecker(gitignorePath)
    const result = await checker.checkGitTracking(['serviceAccountKey.json'])
    expect(result.warnings).toContain(expect.stringContaining('tracked by Git'))
  })
})
```

### Integration Testing

**Test Scenarios**:
1. Full cleanup run on mock repository structure
2. Dry run mode produces correct preview
3. Rollback after failure restores original state
4. Report generation includes all operations

**Example Integration Test**:

```javascript
describe('Full Cleanup Integration', () => {
  test('complete cleanup workflow', async () => {
    // Setup mock repository
    await setupMockRepository(testDir)
    
    // Run cleanup
    const orchestrator = new CleanupOrchestrator(config)
    const result = await orchestrator.run()
    
    // Verify results
    expect(result.success).toBe(true)
    expect(fs.existsSync(path.join(testDir, 'firebase-debug.log'))).toBe(false)
    expect(fs.existsSync(path.join(testDir, 'restaurante-app/scripts/sql/get-full-schema.sql'))).toBe(true)
    expect(fs.existsSync(path.join(testDir, 'restaurante-app/docs/archive/CRITICAL_FIXES_NEEDED.md'))).toBe(true)
    
    // Verify report
    const report = await fs.readFile(result.reportPath, 'utf-8')
    expect(report).toContain('Files Deleted:')
    expect(report).toContain('Files Moved:')
  })
})
```

### Test Coverage Goals

- **Line Coverage**: Minimum 90%
- **Branch Coverage**: Minimum 85%
- **Property Tests**: All 18 properties must have corresponding tests
- **Unit Tests**: All error conditions must be tested
- **Integration Tests**: All major workflows must be tested

### Manual Testing Checklist

Before deploying to production:
1. Run cleanup on a test repository clone
2. Verify no critical files were deleted
3. Verify all tests still pass after cleanup
4. Verify application still runs correctly
5. Review cleanup report for unexpected operations
6. Check Git status to ensure no sensitive files are tracked
7. Verify .gitignore patterns are working correctly
