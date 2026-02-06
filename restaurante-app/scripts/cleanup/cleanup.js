#!/usr/bin/env node

/**
 * Repository Cleanup and Organization Script
 * 
 * This script performs automated cleanup and organization of the repository,
 * including:
 * - Removing temporary files (logs, lint outputs, test results)
 * - Organizing SQL scripts into scripts/sql/
 * - Organizing debug scripts into scripts/debug/
 * - Archiving temporary documentation
 * - Updating .gitignore with missing patterns
 * - Protecting sensitive files from version control
 * 
 * Usage:
 *   node cleanup.js [options]
 * 
 * Options:
 *   --dry-run         Preview changes without executing them
 *   --auto-confirm    Skip user confirmation prompts
 *   --verbose         Enable detailed logging
 *   --report-path     Custom path for cleanup report (default: CLEANUP_REPORT.md)
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Type Definitions (JSDoc)
// ============================================================================

/**
 * @typedef {Object} CleanupConfig
 * @property {string} rootPath - Root path of the repository
 * @property {string} restauranteAppPath - Path to restaurante-app directory
 * @property {boolean} dryRun - Don't actually perform operations
 * @property {boolean} autoConfirm - Skip user confirmation
 * @property {boolean} verbose - Detailed logging
 * @property {boolean} requireBackup - Require Git commit before cleanup
 * @property {number} maxFilesToDelete - Safety limit on deletions
 * @property {ScanConfig} scanConfig - File scanning configuration
 * @property {string} reportPath - Path for cleanup report
 */

/**
 * @typedef {Object} ScanConfig
 * @property {string[]} temporaryPatterns - Patterns for temporary files
 * @property {string[]} sqlPatterns - Patterns for SQL files
 * @property {string[]} debugScriptPatterns - Patterns for debug scripts
 * @property {string[]} temporaryDocPatterns - Patterns for temporary docs
 * @property {string[]} sensitiveFilePatterns - Patterns for sensitive files
 * @property {string[]} excludePaths - Paths to exclude from scanning
 */

/**
 * @typedef {Object} ScanResult
 * @property {string[]} temporaryFiles - Files to delete
 * @property {string[]} sqlScripts - SQL files to move
 * @property {string[]} debugScripts - Debug scripts to move/delete
 * @property {string[]} temporaryDocs - Docs to archive
 * @property {string[]} sensitiveFiles - Files to check security
 * @property {string[]} jestConfigs - Jest config files
 */

/**
 * @typedef {Object} FileMetadata
 * @property {string} path - Full file path
 * @property {string} relativePath - Path relative to root
 * @property {number} size - File size in bytes
 * @property {Date} created - Creation date
 * @property {Date} modified - Modification date
 * @property {FileCategory} category - File category
 * @property {FileAction} action - Action to perform
 * @property {string} reason - Reason for action
 */

/**
 * @typedef {'temporary_file'|'sql_script'|'debug_script'|'temporary_doc'|'sensitive_file'|'jest_config'|'unknown'} FileCategory
 */

/**
 * @typedef {'delete'|'move'|'archive'|'keep'|'warn'} FileAction
 */

/**
 * @typedef {Object} Operation
 * @property {'delete'|'move'|'modify'} type - Operation type
 * @property {string} source - Source path
 * @property {string} [destination] - Destination path (for move operations)
 * @property {string} reason - Reason for operation
 * @property {string} timestamp - ISO timestamp
 * @property {boolean} success - Whether operation succeeded
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} MoveResult
 * @property {string} source - Source path
 * @property {string} destination - Destination path
 * @property {boolean} success - Whether move succeeded
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} SecurityCheckResult
 * @property {string[]} missingFromGitignore - Files not in .gitignore
 * @property {string[]} recommendations - Security recommendations
 */

/**
 * @typedef {Object} GitTrackingResult
 * @property {string[]} trackedFiles - Files currently tracked by Git
 * @property {string[]} untrackedFiles - Files not tracked
 * @property {string[]} warnings - Security warnings
 */

/**
 * @typedef {Object} UpdateResult
 * @property {string[]} added - Patterns added
 * @property {string[]} alreadyPresent - Patterns already present
 * @property {string[]} failed - Patterns that failed to add
 */

/**
 * @typedef {Object} CleanupResult
 * @property {boolean} success - Overall success status
 * @property {Operation[]} operations - All operations performed
 * @property {string[]} warnings - Warning messages
 * @property {string[]} errors - Error messages
 * @property {string} report - Generated report content
 */

/**
 * @typedef {Object} ArchiveEntry
 * @property {string} filename - Filename
 * @property {string} originalPath - Original path
 * @property {string} archivedDate - Archive date
 * @property {string} description - File description
 * @property {string[]} relatedTo - Related features/specs
 */

// ============================================================================
// Logging Utility
// ============================================================================

class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message) {
    console.log(`[INFO] ${message}`);
  }

  warn(message) {
    console.warn(`[WARN] ${message}`);
  }

  error(message) {
    console.error(`[ERROR] ${message}`);
  }

  debug(message) {
    if (this.verbose) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  success(message) {
    console.log(`[SUCCESS] ${message}`);
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default scan configuration
 * @type {ScanConfig}
 */
const DEFAULT_SCAN_CONFIG = {
  temporaryPatterns: [
    '*.log',
    '*output*.txt',
    '*results*.txt',
    '*.temp',
    'firestore.rules.temp',
    'errors_only.txt',
    'full_lint_output.txt',
    'lint_full.txt',
    'lint_output.txt',
    'lint_report.txt',
    'test-output.log',
    'test-results-*.txt'
  ],
  sqlPatterns: ['*.sql'],
  debugScriptPatterns: [
    'check-*.js',
    'test-db-*.js',
    'apply-*.js',
    'check-profiles-schema.js',
    'test-db-connection.js',
    'apply-order-constraint.js'
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
    'coverage/',
    '.expo/',
    'android/',
    'ios/'
  ]
};

/**
 * Create default cleanup configuration
 * @param {Partial<CleanupConfig>} overrides - Configuration overrides
 * @returns {CleanupConfig}
 */
function createDefaultConfig(overrides = {}) {
  return {
    rootPath: process.cwd(),
    restauranteAppPath: path.join(process.cwd(), 'restaurante-app'),
    dryRun: false,
    autoConfirm: false,
    verbose: false,
    requireBackup: true,
    maxFilesToDelete: 100,
    scanConfig: DEFAULT_SCAN_CONFIG,
    reportPath: 'CLEANUP_REPORT.md',
    ...overrides
  };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  Logger,
  createDefaultConfig,
  DEFAULT_SCAN_CONFIG
};

// Run as CLI if executed directly
if (require.main === module) {
  const CleanupOrchestrator = require('./CleanupOrchestrator');
  
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run'),
    autoConfirm: args.includes('--auto-confirm'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h')
  };

  // Custom report path
  let reportPath = 'CLEANUP_REPORT.md';
  const reportPathIndex = args.indexOf('--report-path');
  if (reportPathIndex !== -1 && args[reportPathIndex + 1]) {
    reportPath = args[reportPathIndex + 1];
  }

  // Show help
  if (flags.help) {
    console.log(`
Repository Cleanup and Organization Script
==========================================

This script performs automated cleanup and organization of the repository.

Usage:
  node cleanup.js [options]

Options:
  --dry-run         Preview changes without executing them
  --auto-confirm    Skip user confirmation prompts
  --verbose         Enable detailed logging
  --report-path     Custom path for cleanup report (default: CLEANUP_REPORT.md)
  --help, -h        Show this help message

Examples:
  # Preview cleanup (recommended first step)
  node cleanup.js --dry-run

  # Run cleanup with confirmation
  node cleanup.js

  # Run cleanup automatically (no confirmation)
  node cleanup.js --auto-confirm

  # Run with verbose logging
  node cleanup.js --verbose --dry-run

Operations performed:
  - Remove temporary files (logs, lint outputs, test results)
  - Organize SQL scripts into scripts/sql/
  - Organize debug scripts into scripts/debug/
  - Archive temporary documentation to docs/archive/
  - Update .gitignore with missing patterns
  - Verify sensitive files are protected

Safety features:
  - Dry-run mode for preview
  - Critical file protection
  - Content verification for moves
  - Detailed operation report
`);
    process.exit(0);
  }

  // Run cleanup
  (async () => {
    console.log('Repository Cleanup Script');
    console.log('========================\n');

    if (flags.dryRun) {
      console.log('🔍 DRY-RUN MODE: No changes will be made\n');
    }

    try {
      // Create configuration
      const config = createDefaultConfig({
        dryRun: flags.dryRun,
        autoConfirm: flags.autoConfirm,
        verbose: flags.verbose,
        reportPath: reportPath,
        rootPath: path.resolve(__dirname, '../../..')
      });

      // Create logger
      const logger = new Logger(flags.verbose);

      // Create and run orchestrator
      const orchestrator = new CleanupOrchestrator(config, logger);
      const result = await orchestrator.run();

      if (result.success) {
        console.log('\n✅ Cleanup completed successfully!');
        console.log(`📄 Report saved to: ${reportPath}`);
        
        if (flags.dryRun) {
          console.log('\n💡 This was a dry-run. To execute the cleanup, run without --dry-run flag.');
        } else {
          console.log('\n📋 Next steps:');
          console.log('  1. Review the cleanup report');
          console.log('  2. Run tests: npm test');
          console.log('  3. Commit changes: git add . && git commit -m "chore: repository cleanup"');
        }
        
        process.exit(0);
      } else {
        console.error('\n❌ Cleanup failed. Check the report for details.');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      if (flags.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  })();
}
