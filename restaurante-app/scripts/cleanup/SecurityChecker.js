/**
 * SecurityChecker Module
 * 
 * Ensures sensitive files are protected from version control by verifying
 * they are listed in .gitignore and not tracked by Git.
 */

const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');

/**
 * SecurityChecker class for verifying sensitive file protection
 */
class SecurityChecker {
  /**
   * @param {string} gitignorePath - Path to .gitignore file
   * @param {import('./cleanup').Logger} logger - Logger instance
   */
  constructor(gitignorePath, logger) {
    this.gitignorePath = gitignorePath;
    this.logger = logger;
    this.gitignorePatterns = [];
  }

  /**
   * Read and parse .gitignore file
   * @returns {Promise<string[]>} Array of patterns
   */
  async readGitignore() {
    try {
      const content = await fs.readFile(this.gitignorePath, 'utf-8');
      this.gitignorePatterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      this.logger.debug(`Read ${this.gitignorePatterns.length} patterns from .gitignore`);
      return this.gitignorePatterns;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`.gitignore not found at ${this.gitignorePath}`);
        this.gitignorePatterns = [];
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if sensitive files are in .gitignore
   * @param {string[]} sensitiveFiles - Array of sensitive file paths
   * @returns {Promise<import('./cleanup').SecurityCheckResult>}
   */
  async checkGitignore(sensitiveFiles) {
    await this.readGitignore();

    const missingFromGitignore = [];
    const recommendations = [];

    for (const filePath of sensitiveFiles) {
      const filename = path.basename(filePath);
      
      if (!this.hasPattern(filename)) {
        missingFromGitignore.push(filename);
        this.logger.warn(`Sensitive file not in .gitignore: ${filename}`);
      }
    }

    if (missingFromGitignore.length > 0) {
      recommendations.push(
        `Add the following patterns to .gitignore: ${missingFromGitignore.join(', ')}`
      );
    }

    return {
      missingFromGitignore,
      recommendations
    };
  }

  /**
   * Check if pattern exists in .gitignore
   * @param {string} pattern - Pattern to check
   * @returns {boolean}
   */
  hasPattern(pattern) {
    // Check for exact match
    if (this.gitignorePatterns.includes(pattern)) {
      return true;
    }

    // Check for wildcard patterns that would match
    for (const gitignorePattern of this.gitignorePatterns) {
      if (this._patternMatches(gitignorePattern, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a gitignore pattern matches a filename
   * @private
   * @param {string} gitignorePattern - Pattern from .gitignore
   * @param {string} filename - Filename to check
   * @returns {boolean}
   */
  _patternMatches(gitignorePattern, filename) {
    // Remove leading/trailing slashes for comparison
    const pattern = gitignorePattern.replace(/^\/|\/$/g, '');
    
    // Convert gitignore pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*')   // Convert * to .*
      .replace(/\?/g, '.');   // Convert ? to .
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }

  /**
   * Check if files are tracked by Git
   * @param {string[]} files - Array of file paths to check
   * @returns {Promise<import('./cleanup').GitTrackingResult>}
   */
  async checkGitTracking(files) {
    const trackedFiles = [];
    const untrackedFiles = [];
    const warnings = [];

    for (const filePath of files) {
      const isTracked = await this._isFileTrackedByGit(filePath);
      
      if (isTracked === null) {
        // Unable to determine (Git error)
        continue;
      }

      if (isTracked) {
        trackedFiles.push(filePath);
        warnings.push(
          `WARNING: Sensitive file "${filePath}" is tracked by Git! ` +
          `This file should be removed from Git history.`
        );
        this.logger.warn(`Sensitive file tracked by Git: ${filePath}`);
      } else {
        untrackedFiles.push(filePath);
        this.logger.debug(`File not tracked by Git: ${filePath}`);
      }
    }

    return {
      trackedFiles,
      untrackedFiles,
      warnings
    };
  }

  /**
   * Check if a file is tracked by Git
   * @private
   * @param {string} filePath - File path to check
   * @returns {Promise<boolean|null>} True if tracked, false if not, null if unable to determine
   */
  async _isFileTrackedByGit(filePath) {
    try {
      const result = execSync(`git ls-files "${filePath}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result.trim().length > 0;
    } catch (error) {
      this.logger.debug(`Unable to check Git tracking for ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify file is not in Git history
   * @param {string} filePath - File path to check
   * @returns {Promise<boolean>} True if file exists in history
   */
  async checkGitHistory(filePath) {
    try {
      const result = execSync(`git log --all --full-history -- "${filePath}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const existsInHistory = result.trim().length > 0;
      
      if (existsInHistory) {
        this.logger.warn(`File found in Git history: ${filePath}`);
      }
      
      return existsInHistory;
    } catch (error) {
      this.logger.debug(`Unable to check Git history for ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate security recommendations
   * @param {string[]} trackedSensitiveFiles - Files that are tracked by Git
   * @returns {string[]} Array of recommendation strings
   */
  generateRecommendations(trackedSensitiveFiles) {
    const recommendations = [];

    if (trackedSensitiveFiles.length > 0) {
      recommendations.push(
        'CRITICAL: The following sensitive files are tracked by Git:'
      );
      trackedSensitiveFiles.forEach(file => {
        recommendations.push(`  - ${file}`);
      });
      recommendations.push('');
      recommendations.push('To remove these files from Git history, use one of these methods:');
      recommendations.push('');
      recommendations.push('Method 1: Using git-filter-repo (recommended):');
      recommendations.push('  1. Install git-filter-repo: pip install git-filter-repo');
      trackedSensitiveFiles.forEach(file => {
        recommendations.push(`  2. Run: git filter-repo --path ${file} --invert-paths`);
      });
      recommendations.push('');
      recommendations.push('Method 2: Using BFG Repo-Cleaner:');
      recommendations.push('  1. Download BFG from https://rtyley.github.io/bfg-repo-cleaner/');
      trackedSensitiveFiles.forEach(file => {
        recommendations.push(`  2. Run: bfg --delete-files ${path.basename(file)}`);
      });
      recommendations.push('');
      recommendations.push('After removing from history:');
      recommendations.push('  1. Force push: git push origin --force --all');
      recommendations.push('  2. Notify all team members to re-clone the repository');
      recommendations.push('  3. Rotate any exposed credentials immediately');
    }

    return recommendations;
  }
}

module.exports = SecurityChecker;
