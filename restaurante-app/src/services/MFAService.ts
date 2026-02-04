/**
 * MFAService - Multi-Factor Authentication Service
 * Implements TOTP-based MFA with backup codes and account lockout
 */

import {
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  MultiFactorResolver,
  MultiFactorError,
  User,
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import * as Crypto from 'expo-crypto';

interface MFAEnrollmentData {
  userId: string;
  enrolledAt: Date;
  backupCodes: string[];
  failedAttempts: number;
  lockedUntil: Date | null;
  lastFailedAttempt: Date | null;
}

interface MFASetupResult {
  secret: TotpSecret;
  qrCodeUrl: string;
  backupCodes: string[];
}

class MFAService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private readonly BACKUP_CODES_COUNT = 10;

  /**
   * Check if MFA is required for a user based on their role
   */
  isRequiredForRole(role: string): boolean {
    const privilegedRoles = ['admin', 'manager'];
    return privilegedRoles.includes(role.toLowerCase());
  }

  /**
   * Check if user has MFA enrolled
   */
  async isEnrolled(user: User): boolean {
    try {
      const enrolledFactors = multiFactor(user).enrolledFactors;
      return enrolledFactors.length > 0;
    } catch (error) {
      console.error('[MFAService] Error checking enrollment:', error);
      return false;
    }
  }

  /**
   * Start MFA enrollment process
   * Returns secret and QR code URL for TOTP setup
   */
  async startEnrollment(user: User, displayName: string = 'Restaurant App'): Promise<MFASetupResult> {
    try {
      // Generate TOTP secret
      const multiFactorSession = await multiFactor(user).getSession();
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);

      // Generate QR code URL
      const qrCodeUrl = totpSecret.generateQrCodeUrl(user.email || user.uid, displayName);

      // Generate backup codes
      const backupCodes = await this.generateBackupCodes();

      return {
        secret: totpSecret,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      console.error('[MFAService] Error starting enrollment:', error);
      throw new Error('Falha ao iniciar configuração de MFA');
    }
  }

  /**
   * Complete MFA enrollment with verification code
   */
  async completeEnrollment(
    user: User,
    secret: TotpSecret,
    verificationCode: string,
    backupCodes: string[],
    displayName: string = 'TOTP'
  ): Promise<void> {
    try {
      // Verify the code and enroll
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
        secret,
        verificationCode
      );

      await multiFactor(user).enroll(multiFactorAssertion, displayName);

      // Store backup codes and enrollment data
      await this.storeEnrollmentData(user.uid, backupCodes);

      console.log('[MFAService] MFA enrollment completed successfully');
    } catch (error) {
      console.error('[MFAService] Error completing enrollment:', error);
      throw new Error('Código de verificação inválido');
    }
  }

  /**
   * Verify MFA code during sign-in
   */
  async verifyCode(resolver: MultiFactorResolver, verificationCode: string): Promise<void> {
    try {
      // Check if account is locked
      const userId = resolver.hints[0]?.uid;
      if (userId) {
        const isLocked = await this.isAccountLocked(userId);
        if (isLocked) {
          throw new Error('Conta bloqueada devido a múltiplas tentativas falhadas. Tente novamente mais tarde.');
        }
      }

      // Get the TOTP factor
      const selectedHint = resolver.hints.find(
        (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
      );

      if (!selectedHint) {
        throw new Error('Fator MFA não encontrado');
      }

      // Verify the code
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
        selectedHint.uid,
        verificationCode
      );

      await resolver.resolveSignIn(multiFactorAssertion);

      // Reset failed attempts on success
      if (userId) {
        await this.resetFailedAttempts(userId);
      }

      console.log('[MFAService] MFA verification successful');
    } catch (error) {
      console.error('[MFAService] Error verifying code:', error);

      // Increment failed attempts
      if (userId) {
        await this.incrementFailedAttempts(userId);
      }

      throw new Error('Código de verificação inválido');
    }
  }

  /**
   * Verify backup code during sign-in
   */
  async verifyBackupCode(userId: string, backupCode: string): Promise<boolean> {
    try {
      const enrollmentDoc = await getDoc(doc(db, 'mfa_enrollments', userId));

      if (!enrollmentDoc.exists()) {
        return false;
      }

      const data = enrollmentDoc.data() as MFAEnrollmentData;
      const backupCodes = data.backupCodes || [];

      // Check if backup code is valid
      const codeIndex = backupCodes.indexOf(backupCode);
      if (codeIndex === -1) {
        await this.incrementFailedAttempts(userId);
        return false;
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await updateDoc(doc(db, 'mfa_enrollments', userId), {
        backupCodes,
        updatedAt: serverTimestamp(),
      });

      // Reset failed attempts on success
      await this.resetFailedAttempts(userId);

      return true;
    } catch (error) {
      console.error('[MFAService] Error verifying backup code:', error);
      return false;
    }
  }

  /**
   * Unenroll MFA for a user
   */
  async unenroll(user: User): Promise<void> {
    try {
      const enrolledFactors = multiFactor(user).enrolledFactors;

      for (const factor of enrolledFactors) {
        await multiFactor(user).unenroll(factor);
      }

      // Remove enrollment data
      await this.removeEnrollmentData(user.uid);

      console.log('[MFAService] MFA unenrolled successfully');
    } catch (error) {
      console.error('[MFAService] Error unenrolling MFA:', error);
      throw new Error('Falha ao remover MFA');
    }
  }

  /**
   * Generate cryptographically secure backup codes
   */
  private async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character alphanumeric code
      const randomBytes = await Crypto.getRandomBytesAsync(6);
      const code = Array.from(randomBytes)
        .map((byte) => byte.toString(36).toUpperCase())
        .join('')
        .substring(0, 8);

      codes.push(code);
    }

    return codes;
  }

  /**
   * Store MFA enrollment data in Firestore
   */
  private async storeEnrollmentData(userId: string, backupCodes: string[]): Promise<void> {
    const enrollmentData: Partial<MFAEnrollmentData> = {
      userId,
      enrolledAt: new Date(),
      backupCodes,
      failedAttempts: 0,
      lockedUntil: null,
      lastFailedAttempt: null,
    };

    await setDoc(doc(db, 'mfa_enrollments', userId), {
      ...enrollmentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Remove MFA enrollment data from Firestore
   */
  private async removeEnrollmentData(userId: string): Promise<void> {
    await setDoc(doc(db, 'mfa_enrollments', userId), {
      deleted: true,
      deletedAt: serverTimestamp(),
    });
  }

  /**
   * Check if account is locked due to failed attempts
   */
  private async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const enrollmentDoc = await getDoc(doc(db, 'mfa_enrollments', userId));

      if (!enrollmentDoc.exists()) {
        return false;
      }

      const data = enrollmentDoc.data() as MFAEnrollmentData;

      if (!data.lockedUntil) {
        return false;
      }

      const lockedUntil = data.lockedUntil instanceof Date 
        ? data.lockedUntil 
        : new Date(data.lockedUntil);

      const isLocked = lockedUntil > new Date();

      // Auto-unlock if lockout period has passed
      if (!isLocked && data.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        await this.resetFailedAttempts(userId);
      }

      return isLocked;
    } catch (error) {
      console.error('[MFAService] Error checking account lock:', error);
      return false;
    }
  }

  /**
   * Increment failed MFA attempts and lock account if threshold reached
   */
  private async incrementFailedAttempts(userId: string): Promise<void> {
    try {
      const enrollmentDoc = await getDoc(doc(db, 'mfa_enrollments', userId));

      if (!enrollmentDoc.exists()) {
        return;
      }

      const data = enrollmentDoc.data() as MFAEnrollmentData;
      const failedAttempts = (data.failedAttempts || 0) + 1;

      const updateData: any = {
        failedAttempts,
        lastFailedAttempt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Lock account if max attempts reached
      if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
        updateData.lockedUntil = lockedUntil;

        console.warn(`[MFAService] Account ${userId} locked until ${lockedUntil.toISOString()}`);
      }

      await updateDoc(doc(db, 'mfa_enrollments', userId), updateData);
    } catch (error) {
      console.error('[MFAService] Error incrementing failed attempts:', error);
    }
  }

  /**
   * Reset failed MFA attempts
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'mfa_enrollments', userId), {
        failedAttempts: 0,
        lockedUntil: null,
        lastFailedAttempt: null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[MFAService] Error resetting failed attempts:', error);
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingBackupCodesCount(userId: string): Promise<number> {
    try {
      const enrollmentDoc = await getDoc(doc(db, 'mfa_enrollments', userId));

      if (!enrollmentDoc.exists()) {
        return 0;
      }

      const data = enrollmentDoc.data() as MFAEnrollmentData;
      return (data.backupCodes || []).length;
    } catch (error) {
      console.error('[MFAService] Error getting backup codes count:', error);
      return 0;
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const newBackupCodes = await this.generateBackupCodes();

      await updateDoc(doc(db, 'mfa_enrollments', userId), {
        backupCodes: newBackupCodes,
        updatedAt: serverTimestamp(),
      });

      return newBackupCodes;
    } catch (error) {
      console.error('[MFAService] Error regenerating backup codes:', error);
      throw new Error('Falha ao regenerar códigos de backup');
    }
  }
}

export default new MFAService();
