/**
 * ReportGenerator Module
 * 
 * Generates detailed cleanup reports documenting all operations performed,
 * including deletions, moves, modifications, warnings, and recommendations.
 */

const fs = require('fs').promises;

/**
 * ReportGenerator class for creating cleanup reports
 */
class ReportGenerator {
  /**
   * @param {string} outputPath - Path for the report file
   * @param {import('./cleanup').Logger} logger - Logger instance
   */
  constructor(outputPath, logger) {
    this.outputPath = outputPath;
    this.logger = logger;
    this.operations = [];
    this.warnings = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Start new report
   */
  startReport() {
    this.startTime = new Date();
    this.operations = [];
    this.warnings = [];
    this.errors = [];
    this.logger.info('Starting cleanup report...');
  }

  /**
   * Log operation (delete, move, modify)
   * @param {import('./cleanup').Operation} operation - Operation to log
   */
  logOperation(operation) {
    const operationWithTimestamp = {
      ...operation,
      timestamp: new Date().toISOString()
    };
    this.operations.push(operationWithTimestamp);
    this.logger.debug(`Logged operation: ${operation.type} ${operation.source}`);
  }

  /**
   * Add warning
   * @param {string} message - Warning message
   */
  logWarning(message) {
    this.warnings.push(message);
    this.logger.warn(message);
  }

  /**
   * Add error
   * @param {string} message - Error message
   */
  logError(message) {
    this.errors.push(message);
    this.logger.error(message);
  }

  /**
   * Generate final report
   * @returns {Promise<string>} Report content
   */
  async generateReport() {
    this.endTime = new Date();
    this.logger.info('Generating cleanup report...');

    const content = this._buildReportContent();

    try {
      await fs.writeFile(this.outputPath, content, 'utf-8');
      this.logger.success(`Cleanup report saved to: ${this.outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to save report: ${error.message}`);
      throw error;
    }

    return content;
  }

  /**
   * Build report content
   * @private
   * @returns {string}
   */
  _buildReportContent() {
    const duration = this.endTime - this.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);

    let content = '# Repository Cleanup Report\n\n';
    
    // Header
    content += `**Date**: ${this.startTime.toISOString()}\n`;
    content += `**Duration**: ${durationSeconds} seconds\n\n`;

    // Summary
    content += this._buildSummarySection();

    // Operations
    content += this._buildOperationsSection();

    // Warnings
    if (this.warnings.length > 0) {
      content += this._buildWarningsSection();
    }

    // Errors
    if (this.errors.length > 0) {
      content += this._buildErrorsSection();
    }

    // Recommendations
    content += this._buildRecommendationsSection();

    return content;
  }

  /**
   * Build summary section
   * @private
   * @returns {string}
   */
  _buildSummarySection() {
    const deletedCount = this.operations.filter(op => op.type === 'delete' && op.success).length;
    const movedCount = this.operations.filter(op => op.type === 'move' && op.success).length;
    const modifiedCount = this.operations.filter(op => op.type === 'modify' && op.success).length;

    let content = '## Summary\n\n';
    content += `- Files Deleted: ${deletedCount}\n`;
    content += `- Files Moved: ${movedCount}\n`;
    content += `- Files Modified: ${modifiedCount}\n`;
    content += `- Warnings: ${this.warnings.length}\n`;
    content += `- Errors: ${this.errors.length}\n\n`;

    return content;
  }

  /**
   * Build operations section
   * @private
   * @returns {string}
   */
  _buildOperationsSection() {
    let content = '## Operations Performed\n\n';

    // Deleted files
    const deletedOps = this.operations.filter(op => op.type === 'delete');
    if (deletedOps.length > 0) {
      content += `### Deleted Files (${deletedOps.length})\n\n`;
      deletedOps.forEach((op, index) => {
        const status = op.success ? '✓' : '✗';
        content += `${index + 1}. ${status} \`${op.source}\`\n`;
        content += `   - Reason: ${op.reason}\n`;
        if (!op.success && op.error) {
          content += `   - Error: ${op.error}\n`;
        }
      });
      content += '\n';
    }

    // Moved files
    const movedOps = this.operations.filter(op => op.type === 'move');
    if (movedOps.length > 0) {
      content += `### Moved Files (${movedOps.length})\n\n`;
      movedOps.forEach((op, index) => {
        const status = op.success ? '✓' : '✗';
        content += `${index + 1}. ${status} \`${op.source}\` → \`${op.destination}\`\n`;
        content += `   - Reason: ${op.reason}\n`;
        if (!op.success && op.error) {
          content += `   - Error: ${op.error}\n`;
        }
      });
      content += '\n';
    }

    // Modified files
    const modifiedOps = this.operations.filter(op => op.type === 'modify');
    if (modifiedOps.length > 0) {
      content += `### Modified Files (${modifiedOps.length})\n\n`;
      modifiedOps.forEach((op, index) => {
        const status = op.success ? '✓' : '✗';
        content += `${index + 1}. ${status} \`${op.source}\`\n`;
        content += `   - Changes: ${op.reason}\n`;
        if (!op.success && op.error) {
          content += `   - Error: ${op.error}\n`;
        }
      });
      content += '\n';
    }

    if (deletedOps.length === 0 && movedOps.length === 0 && modifiedOps.length === 0) {
      content += '_No operations performed._\n\n';
    }

    return content;
  }

  /**
   * Build warnings section
   * @private
   * @returns {string}
   */
  _buildWarningsSection() {
    let content = '## Warnings\n\n';
    
    this.warnings.forEach((warning, index) => {
      content += `${index + 1}. ${warning}\n`;
    });
    content += '\n';

    return content;
  }

  /**
   * Build errors section
   * @private
   * @returns {string}
   */
  _buildErrorsSection() {
    let content = '## Errors\n\n';
    
    this.errors.forEach((error, index) => {
      content += `${index + 1}. ${error}\n`;
    });
    content += '\n';

    return content;
  }

  /**
   * Build recommendations section
   * @private
   * @returns {string}
   */
  _buildRecommendationsSection() {
    let content = '## Recommendations\n\n';

    const hasOperations = this.operations.some(op => op.success);

    if (hasOperations) {
      content += '1. **Run tests** to verify all functionality still works correctly:\n';
      content += '   ```bash\n';
      content += '   npm test\n';
      content += '   ```\n\n';

      content += '2. **Review archived documentation** in `docs/archive/` to ensure nothing important was archived\n\n';

      const hasSensitiveWarnings = this.warnings.some(w => 
        w.includes('tracked by Git') || w.includes('sensitive')
      );

      if (hasSensitiveWarnings) {
        content += '3. **Review security warnings** above and take action to remove sensitive files from Git history\n\n';
        content += '4. **Rotate any exposed credentials** immediately\n\n';
      }

      content += `${hasSensitiveWarnings ? '5' : '3'}. **Commit the cleanup changes**:\n`;
      content += '   ```bash\n';
      content += '   git add .\n';
      content += '   git commit -m "chore: repository cleanup and organization"\n';
      content += '   ```\n\n';
    } else {
      content += '_No operations were performed, so no recommendations at this time._\n\n';
    }

    return content;
  }

  /**
   * Get operation counts
   * @returns {Object} Counts by operation type
   */
  getOperationCounts() {
    return {
      deleted: this.operations.filter(op => op.type === 'delete' && op.success).length,
      moved: this.operations.filter(op => op.type === 'move' && op.success).length,
      modified: this.operations.filter(op => op.type === 'modify' && op.success).length,
      failed: this.operations.filter(op => !op.success).length
    };
  }
}

module.exports = ReportGenerator;
