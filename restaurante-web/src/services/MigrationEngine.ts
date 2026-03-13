/**
 * MigrationEngine - Zero-downtime data migration system
 * Supports dual-write, validation, rollback, and batch processing
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  query,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  Firestore,
} from 'firebase/firestore';
// @ts-ignore - firebaseConfig.js is not typed
import { db as dbImport } from '../config/firebaseConfig';

// Type the db import
// @ts-ignore
const db = dbImport as Firestore;

export enum MigrationPhase {
  NOT_STARTED = 'not_started',
  DUAL_WRITE = 'dual_write',
  MIGRATING = 'migrating',
  VALIDATING = 'validating',
  COMPLETE = 'complete',
  ROLLED_BACK = 'rolled_back',
}

export enum MigrationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

interface MigrationConfig {
  name: string;
  sourceCollection: string;
  targetCollection: string;
  batchSize: number;
  transformFn?: (data: any) => any;
  validateFn?: (source: any, target: any) => boolean;
  rollbackFn?: (data: any) => any;
}

interface MigrationProgress {
  migrationId: string;
  phase: MigrationPhase;
  status: MigrationStatus;
  totalDocuments: number;
  migratedDocuments: number;
  failedDocuments: number;
  validatedDocuments: number;
  inconsistentDocuments: number;
  startTime: number;
  endTime?: number;
  lastProcessedDocId?: string;
  errors: Array<{
    docId: string;
    error: string;
    timestamp: number;
  }>;
}

interface ValidationResult {
  isValid: boolean;
  inconsistencies: Array<{
    docId: string;
    field: string;
    sourceValue: any;
    targetValue: any;
  }>;
}

class MigrationEngine {
  private readonly BATCH_SIZE = 500;
  private readonly MAX_RETRIES = 3;
  private readonly VALIDATION_SAMPLE_SIZE = 100;
  private activeMigrations: Map<string, MigrationProgress> = new Map();
  private dualWriteEnabled: Map<string, boolean> = new Map();

  /**
   * Start a new migration
   */
  async startMigration(config: MigrationConfig): Promise<string> {
    const migrationId = `migration_${Date.now()}_${config.name}`;

    console.log(`[MigrationEngine] Starting migration: ${migrationId}`);

    // Count total documents
    const totalDocs = await this.countDocuments(config.sourceCollection);

    // Initialize progress tracking
    const progress: MigrationProgress = {
      migrationId,
      phase: MigrationPhase.NOT_STARTED,
      status: MigrationStatus.PENDING,
      totalDocuments: totalDocs,
      migratedDocuments: 0,
      failedDocuments: 0,
      validatedDocuments: 0,
      inconsistentDocuments: 0,
      startTime: Date.now(),
      errors: [],
    };

    this.activeMigrations.set(migrationId, progress);

    // Save progress to Firestore
    await this.saveProgress(migrationId, progress);

    return migrationId;
  }

  /**
   * Enable dual-write mode for a collection
   */
  enableDualWrite(collectionPath: string): void {
    this.dualWriteEnabled.set(collectionPath, true);
    console.log(`[MigrationEngine] Dual-write enabled for: ${collectionPath}`);
  }

  /**
   * Disable dual-write mode for a collection
   */
  disableDualWrite(collectionPath: string): void {
    this.dualWriteEnabled.set(collectionPath, false);
    console.log(`[MigrationEngine] Dual-write disabled for: ${collectionPath}`);
  }

  /**
   * Check if dual-write is enabled for a collection
   */
  isDualWriteEnabled(collectionPath: string): boolean {
    return this.dualWriteEnabled.get(collectionPath) || false;
  }

  /**
   * Write to both old and new structures (dual-write)
   */
  async dualWrite(
    oldPath: string,
    newPath: string,
    data: any,
    transformFn?: (data: any) => any
  ): Promise<void> {
    if (!this.isDualWriteEnabled(oldPath)) {
      throw new Error(`Dual-write not enabled for: ${oldPath}`);
    }

    const batch = writeBatch(db);

    try {
      // Write to old structure
      const oldRef = doc(db, oldPath);
      batch.set(oldRef, data);

      // Transform and write to new structure
      const transformedData = transformFn ? transformFn(data) : data;
      const newRef = doc(db, newPath);
      batch.set(newRef, transformedData);

      await batch.commit();

      console.log(`[MigrationEngine] Dual-write successful: ${oldPath} -> ${newPath}`);
    } catch (error: any) {
      console.error(`[MigrationEngine] Dual-write failed:`, error);
      throw error;
    }
  }

  /**
   * Migrate data in batches
   */
  async migrateInBatches(
    migrationId: string,
    config: MigrationConfig
  ): Promise<void> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    progress.phase = MigrationPhase.MIGRATING;
    progress.status = MigrationStatus.IN_PROGRESS;
    await this.saveProgress(migrationId, progress);

    let lastDoc: DocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
      try {
        // Build query with pagination
        const collectionRef = collection(db, config.sourceCollection);
        let q = query(collectionRef, limit(config.batchSize));

        if (lastDoc) {
          q = query(collectionRef, startAfter(lastDoc), limit(config.batchSize));
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        // Process batch
        await this.processBatch(migrationId, config, snapshot.docs);

        // Update pagination
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        progress.lastProcessedDocId = lastDoc.id;

        // Save progress
        await this.saveProgress(migrationId, progress);

        console.log(
          `[MigrationEngine] Batch processed: ${progress.migratedDocuments}/${progress.totalDocuments}`
        );

        // Check if we've processed all documents
        if (snapshot.docs.length < config.batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`[MigrationEngine] Batch processing failed:`, error);
        progress.status = MigrationStatus.FAILED;
        progress.errors.push({
          docId: lastDoc?.id || 'unknown',
          error: error.message,
          timestamp: Date.now(),
        });
        await this.saveProgress(migrationId, progress);
        throw error;
      }
    }

    // Mark migration as complete
    progress.phase = MigrationPhase.COMPLETE;
    progress.status = MigrationStatus.SUCCESS;
    progress.endTime = Date.now();
    await this.saveProgress(migrationId, progress);

    console.log(`[MigrationEngine] Migration complete: ${migrationId}`);
  }

  /**
   * Process a batch of documents
   */
  private async processBatch(
    migrationId: string,
    config: MigrationConfig,
    docs: DocumentSnapshot[]
  ): Promise<void> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const docSnapshot of docs) {
      try {
        const sourceData = docSnapshot.data();
        if (!sourceData) continue;

        // Transform data if transform function provided
        const targetData = config.transformFn
          ? config.transformFn(sourceData)
          : sourceData;

        // Write to target collection
        const targetRef = doc(db, config.targetCollection, docSnapshot.id);
        batch.set(targetRef, targetData);

        batchCount++;
        progress.migratedDocuments++;

        // Commit batch if it reaches Firestore limit (500)
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      } catch (error: any) {
        console.error(
          `[MigrationEngine] Failed to migrate document ${docSnapshot.id}:`,
          error
        );
        progress.failedDocuments++;
        progress.errors.push({
          docId: docSnapshot.id,
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Validate data consistency between source and target
   */
  async validateConsistency(
    migrationId: string,
    config: MigrationConfig
  ): Promise<ValidationResult> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    progress.phase = MigrationPhase.VALIDATING;
    await this.saveProgress(migrationId, progress);

    console.log(`[MigrationEngine] Starting validation: ${migrationId}`);

    const inconsistencies: ValidationResult['inconsistencies'] = [];

    // Sample documents for validation
    const sourceRef = collection(db, config.sourceCollection);
    const sampleQuery = query(sourceRef, limit(this.VALIDATION_SAMPLE_SIZE));
    const snapshot = await getDocs(sampleQuery);

    for (const docSnapshot of snapshot.docs) {
      try {
        const sourceData = docSnapshot.data();
        const targetRef = doc(db, config.targetCollection, docSnapshot.id);
        const targetSnapshot = await getDoc(targetRef);

        if (!targetSnapshot.exists()) {
          inconsistencies.push({
            docId: docSnapshot.id,
            field: '_document',
            sourceValue: 'exists',
            targetValue: 'missing',
          });
          progress.inconsistentDocuments++;
          continue;
        }

        const targetData = targetSnapshot.data();

        // Use custom validation function if provided
        if (config.validateFn) {
          const isValid = config.validateFn(sourceData, targetData);
          if (!isValid) {
            inconsistencies.push({
              docId: docSnapshot.id,
              field: '_custom_validation',
              sourceValue: sourceData,
              targetValue: targetData,
            });
            progress.inconsistentDocuments++;
          }
        } else {
          // Default validation: compare all fields
          const sourceFields = Object.keys(sourceData);
          for (const field of sourceFields) {
            if (sourceData[field] !== targetData[field]) {
              inconsistencies.push({
                docId: docSnapshot.id,
                field,
                sourceValue: sourceData[field],
                targetValue: targetData[field],
              });
              progress.inconsistentDocuments++;
            }
          }
        }

        progress.validatedDocuments++;
      } catch (error: any) {
        console.error(
          `[MigrationEngine] Validation failed for document ${docSnapshot.id}:`,
          error
        );
        progress.errors.push({
          docId: docSnapshot.id,
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }

    await this.saveProgress(migrationId, progress);

    const isValid = inconsistencies.length === 0;

    console.log(
      `[MigrationEngine] Validation ${isValid ? 'passed' : 'failed'}: ${inconsistencies.length} inconsistencies found`
    );

    return {
      isValid,
      inconsistencies,
    };
  }

  /**
   * Rollback migration
   */
  async rollback(migrationId: string, config: MigrationConfig): Promise<void> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    console.log(`[MigrationEngine] Starting rollback: ${migrationId}`);

    progress.phase = MigrationPhase.ROLLED_BACK;
    progress.status = MigrationStatus.IN_PROGRESS;
    await this.saveProgress(migrationId, progress);

    try {
      // Get all documents from target collection
      const targetRef = collection(db, config.targetCollection);
      const snapshot = await getDocs(targetRef);

      // Delete in batches
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const docSnapshot of snapshot.docs) {
        batch.delete(docSnapshot.ref);
        batchCount++;

        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      progress.status = MigrationStatus.ROLLED_BACK;
      progress.endTime = Date.now();
      await this.saveProgress(migrationId, progress);

      console.log(`[MigrationEngine] Rollback complete: ${migrationId}`);
    } catch (error: any) {
      console.error(`[MigrationEngine] Rollback failed:`, error);
      progress.status = MigrationStatus.FAILED;
      progress.errors.push({
        docId: 'rollback',
        error: error.message,
        timestamp: Date.now(),
      });
      await this.saveProgress(migrationId, progress);
      throw error;
    }
  }

  /**
   * Get migration progress
   */
  getProgress(migrationId: string): MigrationProgress | undefined {
    return this.activeMigrations.get(migrationId);
  }

  /**
   * Get all active migrations
   */
  getAllMigrations(): MigrationProgress[] {
    return Array.from(this.activeMigrations.values());
  }

  /**
   * Generate migration report
   */
  generateReport(migrationId: string): string {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) {
      return `Migration not found: ${migrationId}`;
    }

    const duration = progress.endTime
      ? progress.endTime - progress.startTime
      : Date.now() - progress.startTime;

    const successRate =
      progress.totalDocuments > 0
        ? ((progress.migratedDocuments / progress.totalDocuments) * 100).toFixed(2)
        : '0.00';

    const report = [
      '='.repeat(60),
      `Migration Report: ${migrationId}`,
      '='.repeat(60),
      '',
      `Phase: ${progress.phase}`,
      `Status: ${progress.status}`,
      `Duration: ${Math.round(duration / 1000)}s`,
      '',
      'Progress:',
      `  Total Documents: ${progress.totalDocuments}`,
      `  Migrated: ${progress.migratedDocuments}`,
      `  Failed: ${progress.failedDocuments}`,
      `  Success Rate: ${successRate}%`,
      '',
      'Validation:',
      `  Validated: ${progress.validatedDocuments}`,
      `  Inconsistent: ${progress.inconsistentDocuments}`,
      '',
      `Errors: ${progress.errors.length}`,
    ];

    if (progress.errors.length > 0) {
      report.push('', 'Recent Errors:');
      progress.errors.slice(-5).forEach((error) => {
        report.push(`  - ${error.docId}: ${error.error}`);
      });
    }

    report.push('', '='.repeat(60));

    return report.join('\n');
  }

  /**
   * Count documents in a collection
   */
  private async countDocuments(collectionPath: string): Promise<number> {
    try {
      const collectionRef = collection(db, collectionPath);
      const snapshot = await getDocs(collectionRef);
      return snapshot.size;
    } catch (error) {
      console.error(`[MigrationEngine] Failed to count documents:`, error);
      return 0;
    }
  }

  /**
   * Save migration progress to Firestore
   */
  private async saveProgress(
    migrationId: string,
    progress: MigrationProgress
  ): Promise<void> {
    try {
      const progressRef = doc(db, `migrations/${migrationId}`);
      await setDoc(progressRef, {
        ...progress,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`[MigrationEngine] Failed to save progress:`, error);
    }
  }

  /**
   * Load migration progress from Firestore
   */
  async loadProgress(migrationId: string): Promise<MigrationProgress | null> {
    try {
      const progressRef = doc(db, `migrations/${migrationId}`);
      const snapshot = await getDoc(progressRef);

      if (!snapshot.exists()) {
        return null;
      }

      const progress = snapshot.data() as MigrationProgress;
      this.activeMigrations.set(migrationId, progress);

      return progress;
    } catch (error) {
      console.error(`[MigrationEngine] Failed to load progress:`, error);
      return null;
    }
  }

  /**
   * Clear completed migrations from memory
   */
  clearCompletedMigrations(): void {
    for (const [id, progress] of this.activeMigrations.entries()) {
      if (
        progress.status === MigrationStatus.SUCCESS ||
        progress.status === MigrationStatus.ROLLED_BACK
      ) {
        this.activeMigrations.delete(id);
      }
    }
  }
}

export default new MigrationEngine();
