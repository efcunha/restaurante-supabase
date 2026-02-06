/**
 * DocOrganizer Module
 * 
 * Organizes temporary documentation by archiving it to docs/archive/
 * and creating an index of archived documents.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * DocOrganizer class for organizing documentation
 */
class DocOrganizer {
  /**
   * @param {string} docsDir - Docs directory path
   * @param {import('./cleanup').Logger} logger - Logger instance
   * @param {boolean} dryRun - Whether to run in dry-run mode
   */
  constructor(docsDir, logger, dryRun = false) {
    this.docsDir = docsDir;
    this.logger = logger;
    this.dryRun = dryRun;
    this.archiveDir = path.join(docsDir, 'archive');
  }

  /**
   * Create docs/archive/ directory
   * @returns {Promise<void>}
   */
  async createArchiveDirectory() {
    this.logger.info('Creating docs/archive/ directory...');

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create directory: ${this.archiveDir}`);
      return;
    }

    try {
      await fs.access(this.archiveDir);
      this.logger.debug(`Archive directory already exists: ${this.archiveDir}`);
    } catch {
      await fs.mkdir(this.archiveDir, { recursive: true });
      this.logger.success(`Created archive directory: ${this.archiveDir}`);
    }
  }

  /**
   * Move temporary docs to archive
   * @param {string[]} docFiles - Array of doc file paths (relative to root)
   * @param {string} rootPath - Root path of repository
   * @returns {Promise<import('./cleanup').MoveResult[]>}
   */
  async archiveDocs(docFiles, rootPath) {
    this.logger.info(`Archiving ${docFiles.length} documentation files...`);

    const results = [];

    for (const relativePath of docFiles) {
      const sourcePath = path.join(rootPath, relativePath);
      const filename = path.basename(relativePath);
      
      // Determine if this should stay in main docs or go to archive
      if (this.shouldKeepInMainDocs(filename)) {
        // Move to main docs directory instead of archive
        const destPath = path.join(this.docsDir, filename);
        const result = await this._moveFile(sourcePath, destPath);
        results.push(result);

        if (result.success) {
          this.logger.success(`Moved to docs: ${relativePath} -> docs/${filename}`);
        } else {
          this.logger.error(`Failed to move ${relativePath}: ${result.error}`);
        }
      } else {
        // Move to archive
        const destPath = path.join(this.archiveDir, filename);
        const result = await this._moveFile(sourcePath, destPath);
        results.push(result);

        if (result.success) {
          this.logger.success(`Archived: ${relativePath} -> docs/archive/${filename}`);
        } else {
          this.logger.error(`Failed to archive ${relativePath}: ${result.error}`);
        }
      }
    }

    return results;
  }

  /**
   * Move a file from source to destination
   * @private
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<import('./cleanup').MoveResult>}
   */
  async _moveFile(sourcePath, destPath) {
    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would move: ${sourcePath} -> ${destPath}`);
      return {
        source: sourcePath,
        destination: destPath,
        success: true
      };
    }

    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });

      // Check if source file exists
      try {
        await fs.access(sourcePath);
      } catch {
        return {
          source: sourcePath,
          destination: destPath,
          success: false,
          error: 'Source file not found'
        };
      }

      // Read source file content
      const content = await fs.readFile(sourcePath);

      // Write to destination
      await fs.writeFile(destPath, content);

      // Verify content matches
      const destContent = await fs.readFile(destPath);
      if (!content.equals(destContent)) {
        throw new Error('Content verification failed after move');
      }

      // Delete source file
      await fs.unlink(sourcePath);

      return {
        source: sourcePath,
        destination: destPath,
        success: true
      };
    } catch (error) {
      return {
        source: sourcePath,
        destination: destPath,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create archive index with metadata
   * @param {import('./cleanup').MoveResult[]} archivedFiles - Files that were archived
   * @returns {Promise<void>}
   */
  async createArchiveIndex(archivedFiles) {
    this.logger.info('Creating archive index...');

    const archiveEntries = archivedFiles
      .filter(result => result.success && result.destination.includes('archive'))
      .map(result => this._createArchiveEntry(result));

    const indexContent = this._generateIndexContent(archiveEntries);
    const indexPath = path.join(this.archiveDir, 'README.md');

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create archive index: ${indexPath}`);
      this.logger.debug('Index content preview:');
      this.logger.debug(indexContent.substring(0, 500) + '...');
      return;
    }

    try {
      await fs.writeFile(indexPath, indexContent, 'utf-8');
      this.logger.success(`Created archive index: ${indexPath}`);
    } catch (error) {
      this.logger.error(`Failed to create archive index: ${error.message}`);
    }
  }

  /**
   * Create archive entry for a file
   * @private
   * @param {import('./cleanup').MoveResult} moveResult - Move result
   * @returns {import('./cleanup').ArchiveEntry}
   */
  _createArchiveEntry(moveResult) {
    const filename = path.basename(moveResult.destination);
    const originalPath = moveResult.source;
    const archivedDate = new Date().toISOString().split('T')[0];
    
    // Generate description based on filename
    const description = this._generateDescription(filename);
    const relatedTo = this._inferRelatedFeatures(filename);

    return {
      filename,
      originalPath,
      archivedDate,
      description,
      relatedTo
    };
  }

  /**
   * Generate description for a file
   * @private
   * @param {string} filename - Filename
   * @returns {string}
   */
  _generateDescription(filename) {
    const descriptions = {
      'CRITICAL_FIXES_NEEDED.md': 'List of critical fixes needed during development',
      'TEST_STABILIZATION_FINAL_SUMMARY.md': 'Final summary of test stabilization efforts',
      'TEST_STATUS_SUMMARY.md': 'Summary of test status during development',
      'test-failure-analysis.md': 'Analysis of test failures',
      'test-results-summary.md': 'Summary of test results',
      'TEST_DATABASE_SETUP.md': 'Database setup instructions for testing'
    };

    return descriptions[filename] || 'Temporary documentation from development';
  }

  /**
   * Infer related features from filename
   * @private
   * @param {string} filename - Filename
   * @returns {string[]}
   */
  _inferRelatedFeatures(filename) {
    const related = [];

    if (filename.toLowerCase().includes('test')) {
      related.push('Testing');
    }
    if (filename.toLowerCase().includes('database') || filename.toLowerCase().includes('db')) {
      related.push('Database');
    }
    if (filename.toLowerCase().includes('fix')) {
      related.push('Bug Fixes');
    }
    if (filename.toLowerCase().includes('migration')) {
      related.push('Migration');
    }

    return related.length > 0 ? related : ['General'];
  }

  /**
   * Generate index content
   * @private
   * @param {import('./cleanup').ArchiveEntry[]} entries - Archive entries
   * @returns {string}
   */
  _generateIndexContent(entries) {
    let content = `# Archived Documentation

This directory contains documentation files that were created during development but are no longer actively maintained. They are kept for historical reference.

## Archive Date

${new Date().toISOString().split('T')[0]}

## Archived Files

`;

    if (entries.length === 0) {
      content += '_No files archived yet._\n';
    } else {
      entries.forEach(entry => {
        content += `### ${entry.filename}\n\n`;
        content += `- **Original Path**: \`${entry.originalPath}\`\n`;
        content += `- **Archived**: ${entry.archivedDate}\n`;
        content += `- **Description**: ${entry.description}\n`;
        if (entry.relatedTo.length > 0) {
          content += `- **Related To**: ${entry.relatedTo.join(', ')}\n`;
        }
        content += '\n';
      });
    }

    content += `## Note

These files represent snapshots of the project at specific points in time. Information in these files may be outdated and should not be used as current documentation.

For current documentation, see the main docs directory.
`;

    return content;
  }

  /**
   * Evaluate if doc should be kept in main docs/
   * @param {string} filename - Filename to evaluate
   * @returns {boolean}
   */
  shouldKeepInMainDocs(filename) {
    // TEST_DATABASE_SETUP.md might still be useful, keep in main docs
    if (filename === 'TEST_DATABASE_SETUP.md') {
      return true;
    }

    // All other temporary docs go to archive
    return false;
  }
}

module.exports = DocOrganizer;
