/**
 * CleanupOrchestrator Module
 * 
 * Coordinates all cleanup operations in a safe, phased approach:
 * 1. Analysis Phase - Scan and categorize files
 * 2. Safety Check Phase - Verify no critical files affected
 * 3. Execution Phase - Perform file operations
 * 4. Validation Phase - Verify repository integrity
 * 5. Reporting Phase - Generate detailed report
 */

const fs = require('fs').promises;
const path = require('path');
const FileScanner = require('./FileScanner');
const SecurityChecker = require('./SecurityChecker');
const ScriptOrganizer = require('./ScriptOrganizer');
const DocOrganizer = require('./DocOrganizer');
const GitignoreUpdater = require('./GitignoreUpdater');
const ReportGenerator = require('./ReportGenerator');

/**
 * CleanupOrchestrator class for coordinating cleanup operations
 */
class CleanupOrchestrator {
  /**
   * @param {import('./cleanup').CleanupConfig} config - Cleanup configuration
   * @param {import('./cleanup').Logger} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize components
    this.fileScanner = new FileScanner(config.scanConfig, logger);
    this.reportGenerator = new ReportGenerator(config.reportPath, logger);
  }

  /**
   * Run full cleanup process
   * @returns {Promise<import('./cleanup').CleanupResult>}
   */
  async run() {
    this.logger.info('Starting repository cleanup...');
    this.reportGenerator.startReport();

    try {
      // Phase 1: Analysis
      this.logger.info('\n=== Phase 1: Analysis ===');
      const scanResult = await this._analysisPhase();

      // Phase 2: Safety Check
      this.logger.info('\n=== Phase 2: Safety Check ===');
      const securityCheck = await this._safetyCheckPhase(scanResult);

      // Phase 3: User Confirmation (if not auto-confirm)
      if (!this.config.autoConfirm && !this.config.dryRun) {
        this.logger.info('\n=== Confirmation Required ===');
        await this._confirmationPhase(scanResult);
      }

      // Phase 4: Execution
      this.logger.info('\n=== Phase 3: Execution ===');
      await this._executionPhase(scanResult, securityCheck);

      // Phase 5: Validation
      this.logger.info('\n=== Phase 4: Validation ===');
      await this._validationPhase();

      // Phase 6: Reporting
      this.logger.info('\n=== Phase 5: Reporting ===');
      const report = await this.reportGenerator.generateReport();

      this.logger.success('\n✓ Cleanup completed successfully!');
      this.logger.info(`Report saved to: ${this.config.reportPath}`);

      return {
        success: true,
        operations: this.reportGenerator.operations,
        warnings: this.reportGenerator.warnings,
        errors: this.reportGenerator.errors,
        report
      };
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`);
      this.reportGenerator.logError(`Cleanup failed: ${error.message}`);
      
      // Try to generate report even on failure
      try {
        await this.reportGenerator.generateReport();
      } catch (reportError) {
        this.logger.error(`Failed to generate report: ${reportError.message}`);
      }

      return {
        success: false,
        operations: this.reportGenerator.operations,
        warnings: this.reportGenerator.warnings,
        errors: this.reportGenerator.errors,
        report: ''
      };
    }
  }

  /**
   * Run in dry-run mode (preview only)
   * @returns {Promise<import('./cleanup').CleanupResult>}
   */
  async dryRun() {
    this.logger.info('Running in DRY-RUN mode (no changes will be made)');
    this.config.dryRun = true;
    return await this.run();
  }

  /**
   * Analysis Phase - Scan and categorize files
   * @private
   * @returns {Promise<import('./cleanup').ScanResult>}
   */
  async _analysisPhase() {
    const scanResult = await this.fileScanner.scan(this.config.rootPath);
    
    this.logger.info('\nScan Results:');
    this.logger.info(`  Temporary files: ${scanResult.temporaryFiles.length}`);
    this.logger.info(`  SQL scripts: ${scanResult.sqlScripts.length}`);
    this.logger.info(`  Debug scripts: ${scanResult.debugScripts.length}`);
    this.logger.info(`  Temporary docs: ${scanResult.temporaryDocs.length}`);
    this.logger.info(`  Sensitive files: ${scanResult.sensitiveFiles.length}`);
    this.logger.info(`  Jest configs: ${scanResult.jestConfigs.length}`);

    return scanResult;
  }

  /**
   * Safety Check Phase - Verify security and critical files
   * @private
   * @param {import('./cleanup').ScanResult} scanResult - Scan results
   * @returns {Promise<Object>}
   */
  async _safetyCheckPhase(scanResult) {
    // Check sensitive files
    const rootGitignore = path.join(this.config.rootPath, '.gitignore');
    const appGitignore = path.join(this.config.restauranteAppPath, '.gitignore');
    
    const rootSecurityChecker = new SecurityChecker(rootGitignore, this.logger);
    const appSecurityChecker = new SecurityChecker(appGitignore, this.logger);

    // Check gitignore coverage
    const rootGitignoreCheck = await rootSecurityChecker.checkGitignore(scanResult.sensitiveFiles);
    const appGitignoreCheck = await appSecurityChecker.checkGitignore(scanResult.sensitiveFiles);

    // Check Git tracking
    const rootTrackingCheck = await rootSecurityChecker.checkGitTracking(scanResult.sensitiveFiles);
    const appTrackingCheck = await appSecurityChecker.checkGitTracking(scanResult.sensitiveFiles);

    // Log warnings
    rootTrackingCheck.warnings.forEach(warning => {
      this.reportGenerator.logWarning(warning);
    });
    appTrackingCheck.warnings.forEach(warning => {
      this.reportGenerator.logWarning(warning);
    });

    // Check for critical files in deletion list
    this._verifyCriticalFiles(scanResult);

    return {
      rootGitignoreCheck,
      appGitignoreCheck,
      rootTrackingCheck,
      appTrackingCheck
    };
  }

  /**
   * Verify no critical files are targeted for deletion
   * @private
   * @param {import('./cleanup').ScanResult} scanResult - Scan results
   */
  _verifyCriticalFiles(scanResult) {
    const criticalPaths = [
      'package.json',
      'package-lock.json',
      'src/',
      '__tests__/',
      '.git/',
      'node_modules/'
    ];

    const allFiles = [
      ...scanResult.temporaryFiles,
      ...scanResult.sqlScripts,
      ...scanResult.debugScripts,
      ...scanResult.temporaryDocs
    ];

    for (const file of allFiles) {
      for (const criticalPath of criticalPaths) {
        if (file.includes(criticalPath)) {
          const error = `CRITICAL: Attempted to modify critical path: ${file}`;
          this.logger.error(error);
          throw new Error(error);
        }
      }
    }

    this.logger.success('✓ No critical files targeted');
  }

  /**
   * Confirmation Phase - Ask user to confirm operations
   * @private
   * @param {import('./cleanup').ScanResult} scanResult - Scan results
   */
  async _confirmationPhase(scanResult) {
    const totalOperations = 
      scanResult.temporaryFiles.length +
      scanResult.sqlScripts.length +
      scanResult.debugScripts.length +
      scanResult.temporaryDocs.length;

    this.logger.info(`\nAbout to perform ${totalOperations} operations:`);
    this.logger.info(`  - Delete ${scanResult.temporaryFiles.length} temporary files`);
    this.logger.info(`  - Move ${scanResult.sqlScripts.length} SQL scripts`);
    this.logger.info(`  - Move ${scanResult.debugScripts.length} debug scripts`);
    this.logger.info(`  - Archive ${scanResult.temporaryDocs.length} documentation files`);
    this.logger.info(`  - Update .gitignore files`);
    
    // In a real CLI, we would prompt the user here
    // For now, we'll just log that confirmation would be required
    this.logger.info('\n[Note: In interactive mode, user confirmation would be required here]');
  }

  /**
   * Execution Phase - Perform all file operations
   * @private
   * @param {import('./cleanup').ScanResult} scanResult - Scan results
   * @param {Object} securityCheck - Security check results
   */
  async _executionPhase(scanResult, securityCheck) {
    // Create directory structures
    const scriptOrganizer = new ScriptOrganizer(
      this.config.restauranteAppPath,
      this.logger,
      this.config.dryRun
    );
    await scriptOrganizer.createDirectoryStructure();
    await scriptOrganizer.createScriptReadmes();

    const docsDir = path.join(this.config.restauranteAppPath, 'docs');
    const docOrganizer = new DocOrganizer(docsDir, this.logger, this.config.dryRun);
    await docOrganizer.createArchiveDirectory();

    // Move SQL scripts
    if (scanResult.sqlScripts.length > 0) {
      const sqlResults = await scriptOrganizer.organizeSQLScripts(
        scanResult.sqlScripts,
        this.config.rootPath
      );
      sqlResults.forEach(result => {
        this.reportGenerator.logOperation({
          type: 'move',
          source: result.source,
          destination: result.destination,
          reason: 'SQL script organization',
          success: result.success,
          error: result.error
        });
      });
    }

    // Move debug scripts
    if (scanResult.debugScripts.length > 0) {
      const debugResults = await scriptOrganizer.organizeDebugScripts(
        scanResult.debugScripts,
        this.config.rootPath
      );
      debugResults.forEach(result => {
        this.reportGenerator.logOperation({
          type: 'move',
          source: result.source,
          destination: result.destination,
          reason: 'Debug script organization',
          success: result.success,
          error: result.error
        });
      });
    }

    // Archive documentation
    if (scanResult.temporaryDocs.length > 0) {
      const docResults = await docOrganizer.archiveDocs(
        scanResult.temporaryDocs,
        this.config.rootPath
      );
      docResults.forEach(result => {
        this.reportGenerator.logOperation({
          type: 'move',
          source: result.source,
          destination: result.destination,
          reason: 'Documentation archival',
          success: result.success,
          error: result.error
        });
      });

      // Create archive index
      await docOrganizer.createArchiveIndex(docResults);
    }

    // Delete temporary files
    if (scanResult.temporaryFiles.length > 0) {
      await this._deleteTemporaryFiles(scanResult.temporaryFiles);
    }

    // Update .gitignore files
    await this._updateGitignoreFiles();
  }

  /**
   * Delete temporary files
   * @private
   * @param {string[]} files - Files to delete
   */
  async _deleteTemporaryFiles(files) {
    this.logger.info(`Deleting ${files.length} temporary files...`);

    for (const relativePath of files) {
      const filePath = path.join(this.config.rootPath, relativePath);

      if (this.config.dryRun) {
        this.logger.info(`[DRY RUN] Would delete: ${relativePath}`);
        this.reportGenerator.logOperation({
          type: 'delete',
          source: relativePath,
          reason: 'Temporary file cleanup',
          success: true
        });
        continue;
      }

      try {
        await fs.unlink(filePath);
        this.logger.success(`Deleted: ${relativePath}`);
        this.reportGenerator.logOperation({
          type: 'delete',
          source: relativePath,
          reason: 'Temporary file cleanup',
          success: true
        });
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.logger.warn(`File not found (already deleted?): ${relativePath}`);
        } else {
          this.logger.error(`Failed to delete ${relativePath}: ${error.message}`);
          this.reportGenerator.logOperation({
            type: 'delete',
            source: relativePath,
            reason: 'Temporary file cleanup',
            success: false,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Update .gitignore files
   * @private
   */
  async _updateGitignoreFiles() {
    const patterns = GitignoreUpdater.getRecommendedPatterns();

    // Update root .gitignore
    const rootGitignore = path.join(this.config.rootPath, '.gitignore');
    const rootUpdater = new GitignoreUpdater(rootGitignore, this.logger, this.config.dryRun);
    const rootResult = await rootUpdater.addPatterns(patterns);

    if (rootResult.added.length > 0) {
      this.reportGenerator.logOperation({
        type: 'modify',
        source: '.gitignore',
        reason: `Added ${rootResult.added.length} patterns to .gitignore`,
        success: true
      });
    }

    // Update restaurante-app .gitignore
    const appGitignore = path.join(this.config.restauranteAppPath, '.gitignore');
    const appUpdater = new GitignoreUpdater(appGitignore, this.logger, this.config.dryRun);
    const appResult = await appUpdater.addPatterns(patterns);

    if (appResult.added.length > 0) {
      this.reportGenerator.logOperation({
        type: 'modify',
        source: 'restaurante-app/.gitignore',
        reason: `Added ${appResult.added.length} patterns to .gitignore`,
        success: true
      });
    }
  }

  /**
   * Validation Phase - Verify repository integrity
   * @private
   */
  async _validationPhase() {
    this.logger.info('Validating repository integrity...');

    // Verify critical files still exist
    const criticalFiles = [
      'package.json',
      'restaurante-app/package.json',
      'restaurante-app/App.js'
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(this.config.rootPath, file);
      try {
        await fs.access(filePath);
        this.logger.debug(`✓ ${file} exists`);
      } catch {
        const error = `CRITICAL: File missing after cleanup: ${file}`;
        this.logger.error(error);
        this.reportGenerator.logError(error);
        throw new Error(error);
      }
    }

    this.logger.success('✓ Repository integrity verified');
  }
}

module.exports = CleanupOrchestrator;
