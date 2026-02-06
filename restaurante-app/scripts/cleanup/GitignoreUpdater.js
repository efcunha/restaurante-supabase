/**
 * GitignoreUpdater Module
 * 
 * Updates .gitignore files with missing patterns to prevent future
 * temporary files and sensitive files from being committed.
 */

const fs = require('fs').promises;

/**
 * GitignoreUpdater class for updating .gitignore files
 */
class GitignoreUpdater {
  /**
   * @param {string} gitignorePath - Path to .gitignore file
   * @param {import('./cleanup').Logger} logger - Logger instance
   * @param {boolean} dryRun - Whether to run in dry-run mode
   */
  constructor(gitignorePath, logger, dryRun = false) {
    this.gitignorePath = gitignorePath;
    this.logger = logger;
    this.dryRun = dryRun;
    this.patterns = [];
  }

  /**
   * Read and parse .gitignore
   * @returns {Promise<string[]>}
   */
  async readGitignore() {
    try {
      const content = await fs.readFile(this.gitignorePath, 'utf-8');
      this.patterns = content.split('\n');
      this.logger.debug(`Read ${this.patterns.length} lines from .gitignore`);
      return this.patterns;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`.gitignore not found at ${this.gitignorePath}, will create new one`);
        this.patterns = [];
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if pattern exists in .gitignore
   * @param {string} pattern - Pattern to check
   * @returns {boolean}
   */
  hasPattern(pattern) {
    // Normalize patterns for comparison (trim whitespace)
    const normalizedPattern = pattern.trim();
    
    return this.patterns.some(line => {
      const normalizedLine = line.trim();
      // Ignore comments and empty lines
      if (!normalizedLine || normalizedLine.startsWith('#')) {
        return false;
      }
      return normalizedLine === normalizedPattern;
    });
  }

  /**
   * Add missing patterns with comments
   * @param {Object} patternGroups - Object with pattern groups and their comments
   * @returns {Promise<import('./cleanup').UpdateResult>}
   */
  async addPatterns(patternGroups) {
    this.logger.info('Updating .gitignore with missing patterns...');

    await this.readGitignore();

    const added = [];
    const alreadyPresent = [];
    const failed = [];

    const newLines = [];

    for (const [groupName, groupData] of Object.entries(patternGroups)) {
      const { comment, patterns } = groupData;
      const groupPatternsToAdd = [];

      for (const pattern of patterns) {
        if (this.hasPattern(pattern)) {
          alreadyPresent.push(pattern);
          this.logger.debug(`Pattern already present: ${pattern}`);
        } else {
          groupPatternsToAdd.push(pattern);
          added.push(pattern);
        }
      }

      // Add group if it has patterns to add
      if (groupPatternsToAdd.length > 0) {
        newLines.push('');
        newLines.push(`# ${comment}`);
        groupPatternsToAdd.forEach(pattern => {
          newLines.push(pattern);
        });
      }
    }

    if (added.length === 0) {
      this.logger.info('All patterns already present in .gitignore');
      return { added, alreadyPresent, failed };
    }

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would add ${added.length} patterns to .gitignore:`);
      added.forEach(pattern => this.logger.info(`  - ${pattern}`));
      return { added, alreadyPresent, failed };
    }

    try {
      // Append new patterns to .gitignore
      const currentContent = this.patterns.join('\n');
      const newContent = currentContent + newLines.join('\n') + '\n';
      
      await fs.writeFile(this.gitignorePath, newContent, 'utf-8');
      
      this.logger.success(`Added ${added.length} patterns to .gitignore`);
      added.forEach(pattern => this.logger.info(`  + ${pattern}`));
    } catch (error) {
      this.logger.error(`Failed to update .gitignore: ${error.message}`);
      failed.push(...added);
      return { added: [], alreadyPresent, failed };
    }

    return { added, alreadyPresent, failed };
  }

  /**
   * Verify patterns are working
   * @param {string[]} patterns - Patterns to verify
   * @returns {Promise<boolean>}
   */
  async verifyPatterns(patterns) {
    this.logger.info('Verifying .gitignore patterns...');

    await this.readGitignore();

    let allPresent = true;

    for (const pattern of patterns) {
      if (!this.hasPattern(pattern)) {
        this.logger.warn(`Pattern not found in .gitignore: ${pattern}`);
        allPresent = false;
      }
    }

    if (allPresent) {
      this.logger.success('All patterns verified in .gitignore');
    } else {
      this.logger.warn('Some patterns are missing from .gitignore');
    }

    return allPresent;
  }

  /**
   * Get recommended patterns for cleanup
   * @returns {Object} Pattern groups with comments
   */
  static getRecommendedPatterns() {
    return {
      temporaryFiles: {
        comment: 'Temporary files (added by cleanup script)',
        patterns: [
          '*.log',
          '*output*.txt',
          '*results*.txt',
          '*.temp',
          '*.tmp'
        ]
      },
      sensitiveFiles: {
        comment: 'Sensitive files (added by cleanup script)',
        patterns: [
          'serviceAccountKey.json',
          'google-services.json',
          'GoogleService-Info.plist',
          '*-adminsdk-*.json'
        ]
      },
      debugScripts: {
        comment: 'Debug scripts (added by cleanup script)',
        patterns: [
          'scripts/debug/'
        ]
      },
      archivedDocs: {
        comment: 'Archived documentation (added by cleanup script)',
        patterns: [
          'docs/archive/'
        ]
      }
    };
  }
}

module.exports = GitignoreUpdater;
