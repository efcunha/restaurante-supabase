/**
 * ScriptOrganizer Module
 * 
 * Organizes SQL and debug scripts into a structured directory hierarchy.
 * Creates scripts/sql/, scripts/debug/, and scripts/utils/ directories
 * with appropriate README files.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * ScriptOrganizer class for organizing scripts
 */
class ScriptOrganizer {
  /**
   * @param {string} baseDir - Base directory (restaurante-app)
   * @param {import('./cleanup').Logger} logger - Logger instance
   * @param {boolean} dryRun - Whether to run in dry-run mode
   */
  constructor(baseDir, logger, dryRun = false) {
    this.baseDir = baseDir;
    this.logger = logger;
    this.dryRun = dryRun;
    this.scriptsDir = path.join(baseDir, 'scripts');
    this.sqlDir = path.join(this.scriptsDir, 'sql');
    this.debugDir = path.join(this.scriptsDir, 'debug');
    this.utilsDir = path.join(this.scriptsDir, 'utils');
  }

  /**
   * Create scripts directory structure
   * @returns {Promise<void>}
   */
  async createDirectoryStructure() {
    this.logger.info('Creating scripts directory structure...');

    const directories = [
      this.scriptsDir,
      this.sqlDir,
      this.debugDir,
      this.utilsDir
    ];

    for (const dir of directories) {
      await this._ensureDirectory(dir);
    }

    this.logger.success('Scripts directory structure created');
  }

  /**
   * Ensure directory exists
   * @private
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async _ensureDirectory(dirPath) {
    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create directory: ${dirPath}`);
      return;
    }

    try {
      await fs.access(dirPath);
      this.logger.debug(`Directory already exists: ${dirPath}`);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.info(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Move SQL scripts to scripts/sql/
   * @param {string[]} sqlFiles - Array of SQL file paths (relative to root)
   * @param {string} rootPath - Root path of repository
   * @returns {Promise<import('./cleanup').MoveResult[]>}
   */
  async organizeSQLScripts(sqlFiles, rootPath) {
    this.logger.info(`Organizing ${sqlFiles.length} SQL scripts...`);

    const results = [];

    for (const relativePath of sqlFiles) {
      const sourcePath = path.join(rootPath, relativePath);
      const filename = path.basename(relativePath);
      const destPath = path.join(this.sqlDir, filename);

      const result = await this.moveFile(sourcePath, destPath);
      results.push(result);

      if (result.success) {
        this.logger.success(`Moved: ${relativePath} -> scripts/sql/${filename}`);
      } else {
        this.logger.error(`Failed to move ${relativePath}: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * Move or delete debug scripts
   * @param {string[]} debugFiles - Array of debug script paths (relative to root)
   * @param {string} rootPath - Root path of repository
   * @returns {Promise<import('./cleanup').MoveResult[]>}
   */
  async organizeDebugScripts(debugFiles, rootPath) {
    this.logger.info(`Organizing ${debugFiles.length} debug scripts...`);

    const results = [];

    for (const relativePath of debugFiles) {
      const sourcePath = path.join(rootPath, relativePath);
      const filename = path.basename(relativePath);
      const destPath = path.join(this.debugDir, filename);

      const result = await this.moveFile(sourcePath, destPath);
      results.push(result);

      if (result.success) {
        this.logger.success(`Moved: ${relativePath} -> scripts/debug/${filename}`);
      } else {
        this.logger.error(`Failed to move ${relativePath}: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * Move a file from source to destination
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<import('./cleanup').MoveResult>}
   */
  async moveFile(sourcePath, destPath) {
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
      await this._ensureDirectory(destDir);

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

      // Verify source no longer exists
      try {
        await fs.access(sourcePath);
        throw new Error('Source file still exists after deletion');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

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
   * Create README files for script directories
   * @returns {Promise<void>}
   */
  async createScriptReadmes() {
    this.logger.info('Creating README files for script directories...');

    await this._createMainScriptsReadme();
    await this._createSQLReadme();
    await this._createDebugReadme();
    await this._createUtilsReadme();

    this.logger.success('README files created');
  }

  /**
   * Create main scripts README
   * @private
   */
  async _createMainScriptsReadme() {
    const readmePath = path.join(this.scriptsDir, 'README.md');
    const content = `# Scripts Directory

This directory contains utility scripts organized by purpose.

## Directory Structure

- **sql/** - SQL scripts for database migrations, schema changes, and queries
- **debug/** - One-time debug scripts used for troubleshooting specific issues
- **utils/** - General utility scripts for development and maintenance
- **cleanup/** - Repository cleanup and organization scripts

## Usage

Each subdirectory contains its own README with specific usage instructions.

## Adding New Scripts

When adding new scripts:
1. Place them in the appropriate subdirectory based on their purpose
2. Use descriptive names that indicate what the script does
3. Add comments at the top of the script explaining its purpose and usage
4. Update the subdirectory README if necessary
`;

    await this._writeReadme(readmePath, content);
  }

  /**
   * Create SQL scripts README
   * @private
   */
  async _createSQLReadme() {
    const readmePath = path.join(this.sqlDir, 'README.md');
    const content = `# SQL Scripts

This directory contains SQL scripts for database operations.

## Purpose

SQL scripts in this directory are used for:
- Database schema migrations
- Adding or modifying constraints
- Database queries and analysis
- Schema dumps and backups

## Usage

Most SQL scripts can be executed using the Supabase CLI or directly in the Supabase dashboard.

Example:
\`\`\`bash
supabase db execute --file scripts/sql/your-script.sql
\`\`\`

## Safety

- Always review SQL scripts before executing them
- Test on a development database first
- Back up data before running destructive operations
- Use transactions where appropriate
`;

    await this._writeReadme(readmePath, content);
  }

  /**
   * Create debug scripts README
   * @private
   */
  async _createDebugReadme() {
    const readmePath = path.join(this.debugDir, 'README.md');
    const content = `# Debug Scripts

This directory contains one-time debug scripts used for troubleshooting specific issues.

## Purpose

Debug scripts are typically:
- Created to investigate a specific bug or issue
- Run once or a few times during debugging
- Not part of regular development workflow
- Kept for historical reference

## Usage

Debug scripts are usually standalone Node.js scripts that can be run directly:

\`\`\`bash
node scripts/debug/script-name.js
\`\`\`

## Note

These scripts may depend on specific database states or configurations that existed when they were created. They may not work correctly in current environments.
`;

    await this._writeReadme(readmePath, content);
  }

  /**
   * Create utils scripts README
   * @private
   */
  async _createUtilsReadme() {
    const readmePath = path.join(this.utilsDir, 'README.md');
    const content = `# Utility Scripts

This directory contains general utility scripts for development and maintenance.

## Purpose

Utility scripts provide helpful functionality such as:
- Code generation
- Data migration
- Build and deployment helpers
- Development tools
- Validation and verification

## Usage

Each utility script should have usage instructions in its header comments. Generally:

\`\`\`bash
node scripts/utils/script-name.js [options]
\`\`\`

## Adding Utilities

When adding new utility scripts:
1. Add clear usage instructions in comments
2. Handle errors gracefully
3. Provide helpful output messages
4. Consider adding command-line arguments for flexibility
`;

    await this._writeReadme(readmePath, content);
  }

  /**
   * Write README file
   * @private
   * @param {string} filePath - README file path
   * @param {string} content - README content
   */
  async _writeReadme(filePath, content) {
    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create README: ${filePath}`);
      return;
    }

    try {
      // Check if README already exists
      try {
        await fs.access(filePath);
        this.logger.debug(`README already exists: ${filePath}`);
        return;
      } catch {
        // File doesn't exist, create it
      }

      await fs.writeFile(filePath, content, 'utf-8');
      this.logger.info(`Created README: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to create README ${filePath}: ${error.message}`);
    }
  }
}

module.exports = ScriptOrganizer;
