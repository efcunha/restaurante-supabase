/**
 * FileScanner Module
 * 
 * Scans the repository and categorizes files based on configurable patterns.
 * Identifies temporary files, SQL scripts, debug scripts, temporary documentation,
 * and sensitive files that need cleanup or organization.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * FileScanner class for identifying files that need cleanup
 */
class FileScanner {
  /**
   * @param {import('./cleanup').ScanConfig} config - Scan configuration
   * @param {import('./cleanup').Logger} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Scan repository and categorize files
   * @param {string} rootPath - Root path to scan
   * @returns {Promise<import('./cleanup').ScanResult>}
   */
  async scan(rootPath) {
    this.logger.info(`Scanning repository at: ${rootPath}`);
    
    const result = {
      temporaryFiles: [],
      sqlScripts: [],
      debugScripts: [],
      temporaryDocs: [],
      sensitiveFiles: [],
      jestConfigs: []
    };

    await this._scanDirectory(rootPath, rootPath, result);

    this.logger.info(`Scan complete:`);
    this.logger.info(`  - Temporary files: ${result.temporaryFiles.length}`);
    this.logger.info(`  - SQL scripts: ${result.sqlScripts.length}`);
    this.logger.info(`  - Debug scripts: ${result.debugScripts.length}`);
    this.logger.info(`  - Temporary docs: ${result.temporaryDocs.length}`);
    this.logger.info(`  - Sensitive files: ${result.sensitiveFiles.length}`);
    this.logger.info(`  - Jest configs: ${result.jestConfigs.length}`);

    return result;
  }

  /**
   * Recursively scan directory
   * @private
   * @param {string} dirPath - Directory to scan
   * @param {string} rootPath - Root path for relative path calculation
   * @param {import('./cleanup').ScanResult} result - Result object to populate
   */
  async _scanDirectory(dirPath, rootPath, result) {
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
      this.logger.warn(`Cannot read directory ${dirPath}: ${error.message}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      // Skip excluded paths
      if (this._shouldExcludePath(relativePath)) {
        this.logger.debug(`Excluding path: ${relativePath}`);
        continue;
      }

      if (entry.isDirectory()) {
        await this._scanDirectory(fullPath, rootPath, result);
      } else if (entry.isFile()) {
        this._categorizeFile(fullPath, relativePath, result);
      }
    }
  }

  /**
   * Check if path should be excluded from scanning
   * @private
   * @param {string} relativePath - Relative path to check
   * @returns {boolean}
   */
  _shouldExcludePath(relativePath) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return this.config.excludePaths.some(excludePath => {
      return normalizedPath.includes(excludePath) || 
             normalizedPath.startsWith(excludePath);
    });
  }

  /**
   * Categorize a file based on patterns
   * @private
   * @param {string} fullPath - Full file path
   * @param {string} relativePath - Relative file path
   * @param {import('./cleanup').ScanResult} result - Result object to populate
   */
  _categorizeFile(fullPath, relativePath, result) {
    const filename = path.basename(fullPath);
    const normalizedPath = relativePath.replace(/\\/g, '/');

    this.logger.debug(`Categorizing file: ${relativePath}`);

    // Check for Jest configs
    if (this._isJestConfig(filename)) {
      result.jestConfigs.push(relativePath);
      this.logger.debug(`  -> Jest config`);
    }

    // Check for sensitive files
    if (this.isSensitiveFile(filename, normalizedPath)) {
      result.sensitiveFiles.push(relativePath);
      this.logger.debug(`  -> Sensitive file`);
    }

    // Check for temporary files
    if (this.isTemporaryFile(filename, normalizedPath)) {
      result.temporaryFiles.push(relativePath);
      this.logger.debug(`  -> Temporary file`);
      return; // Don't categorize further
    }

    // Check for SQL scripts (only in root or restaurante-app, not in scripts/sql/)
    if (this.isSQLScript(filename, normalizedPath)) {
      result.sqlScripts.push(relativePath);
      this.logger.debug(`  -> SQL script`);
      return;
    }

    // Check for debug scripts (only in root or restaurante-app, not in scripts/debug/)
    if (this.isDebugScript(filename, normalizedPath)) {
      result.debugScripts.push(relativePath);
      this.logger.debug(`  -> Debug script`);
      return;
    }

    // Check for temporary documentation
    if (this.isTemporaryDoc(filename, normalizedPath)) {
      result.temporaryDocs.push(relativePath);
      this.logger.debug(`  -> Temporary doc`);
      return;
    }
  }

  /**
   * Check if file matches temporary file patterns
   * @param {string} filename - File name
   * @param {string} relativePath - Relative path
   * @returns {boolean}
   */
  isTemporaryFile(filename, relativePath) {
    const lowerFilename = filename.toLowerCase();
    
    // Check specific temporary file patterns
    const specificPatterns = [
      'errors_only.txt',
      'full_lint_output.txt',
      'lint_full.txt',
      'lint_output.txt',
      'lint_report.txt',
      'test-output.log',
      'firestore.rules.temp'
    ];

    if (specificPatterns.includes(filename)) {
      return true;
    }

    // Check wildcard patterns
    if (lowerFilename.endsWith('.log')) {
      return true;
    }

    if (lowerFilename.endsWith('.temp') || lowerFilename.endsWith('.tmp')) {
      return true;
    }

    if ((lowerFilename.includes('output') || lowerFilename.includes('results')) && 
        lowerFilename.endsWith('.txt')) {
      return true;
    }

    // Check for test-results-*.txt pattern
    if (lowerFilename.startsWith('test-results-') && lowerFilename.endsWith('.txt')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a SQL script that needs organization
   * @param {string} filename - File name
   * @param {string} relativePath - Relative path
   * @returns {boolean}
   */
  isSQLScript(filename, relativePath) {
    // Only SQL files in root or restaurante-app directory (not already in scripts/sql/)
    if (!filename.toLowerCase().endsWith('.sql')) {
      return false;
    }

    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Exclude if already in scripts/sql/ directory
    if (normalizedPath.includes('scripts/sql/')) {
      return false;
    }

    // Include if in root or restaurante-app directory
    const pathParts = normalizedPath.split('/');
    if (pathParts.length === 1) {
      // Root directory
      return true;
    }
    if (pathParts.length === 2 && pathParts[0] === 'restaurante-app') {
      // restaurante-app directory
      return true;
    }

    return false;
  }

  /**
   * Check if file is a debug script that needs organization
   * @param {string} filename - File name
   * @param {string} relativePath - Relative path
   * @returns {boolean}
   */
  isDebugScript(filename, relativePath) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Exclude if already in scripts/debug/ directory
    if (normalizedPath.includes('scripts/debug/')) {
      return false;
    }

    // Check specific debug script patterns
    const specificScripts = [
      'check-profiles-schema.js',
      'test-db-connection.js',
      'apply-order-constraint.js'
    ];

    if (specificScripts.includes(filename)) {
      return true;
    }

    // Check wildcard patterns (only .js files)
    if (!filename.endsWith('.js')) {
      return false;
    }

    if (filename.startsWith('check-') || 
        filename.startsWith('test-db-') || 
        filename.startsWith('apply-')) {
      // Only in root or restaurante-app directory
      const pathParts = normalizedPath.split('/');
      if (pathParts.length === 1) {
        return true; // Root directory
      }
      if (pathParts.length === 2 && pathParts[0] === 'restaurante-app') {
        return true; // restaurante-app directory
      }
    }

    return false;
  }

  /**
   * Check if file is temporary documentation that needs archiving
   * @param {string} filename - File name
   * @param {string} relativePath - Relative path
   * @returns {boolean}
   */
  isTemporaryDoc(filename, relativePath) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Exclude if already in docs/archive/ directory
    if (normalizedPath.includes('docs/archive/')) {
      return false;
    }

    // Check specific temporary doc patterns
    const specificDocs = [
      'CRITICAL_FIXES_NEEDED.md',
      'TEST_STABILIZATION_FINAL_SUMMARY.md',
      'TEST_STATUS_SUMMARY.md',
      'test-failure-analysis.md',
      'test-results-summary.md'
    ];

    if (specificDocs.includes(filename)) {
      return true;
    }

    // Check wildcard patterns
    if (filename.startsWith('TEST_') && filename.endsWith('_SUMMARY.md')) {
      return true;
    }

    if (filename.startsWith('test-') && 
        (filename.includes('-analysis.') || filename.includes('-results-')) && 
        filename.endsWith('.md')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a sensitive file
   * @param {string} filename - File name
   * @param {string} relativePath - Relative path
   * @returns {boolean}
   */
  isSensitiveFile(filename, relativePath) {
    const specificFiles = [
      'serviceAccountKey.json',
      'google-services.json',
      'GoogleService-Info.plist'
    ];

    if (specificFiles.includes(filename)) {
      return true;
    }

    // Check for Firebase admin SDK keys
    if (filename.includes('-adminsdk-') && filename.endsWith('.json')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a Jest config
   * @private
   * @param {string} filename - File name
   * @returns {boolean}
   */
  _isJestConfig(filename) {
    return filename.startsWith('jest.config.') && filename.endsWith('.js');
  }
}

module.exports = FileScanner;
