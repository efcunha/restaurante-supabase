/**
 * MFAService - Multi-Factor Authentication Service
 * Implements TOTP-based MFA with backup codes and account lockout
 * 
 * NOTE: This service is Firebase-specific and has been disabled during Supabase migration.
 * MFA functionality needs to be reimplemented using Supabase Auth.
 */

// Firebase imports disabled during Supabase migration
// import {
//   multiFactor,
//   TotpMultiFactorGenerator,
//   TotpSecret,
//   MultiFactorResolver,
//   MultiFactorError,
//   User,
// } from 'firebase/auth';
// import { auth } from '../config/firebaseConfig';
// import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
// import { db } from '../config/firebaseConfig';
import * as Crypto from 'expo-crypto';

// Placeholder types for disabled Firebase functionality
type User = any;
type TotpSecret = any;
type MultiFactorResolver = any;

interface MFASetupResult {
  secret: TotpSecret;
  qrCodeUrl: string;
  backupCodes: string[];
}

// Service disabled during Supabase migration - all methods throw errors
class MFAService {
  private readonly BACKUP_CODES_COUNT = 10;

  private throwDisabledError(): never {
    throw new Error('MFA Service is disabled during Supabase migration. Please use Supabase Auth MFA.');
  }

  /**
   * Check if MFA is required for a user based on their role
   */
  isRequiredForRole(role: string): boolean {
    // MFA is required for privileged roles, keeping legacy manager compatibility.
    const normalizedRole = role.toLowerCase().trim();
    return normalizedRole === 'admin' || normalizedRole === 'manager' || normalizedRole === 'gerente';
  }

  /**
   * Check if user has MFA enrolled
   */
  async isEnrolled(_user: User): Promise<boolean> {
    return false;
  }

  /**
   * Start MFA enrollment process
   * Returns secret and QR code URL for TOTP setup
   */
  async startEnrollment(_user: User, _displayName: string = 'Restaurant App'): Promise<MFASetupResult> {
    this.throwDisabledError();
  }

  /**
   * Complete MFA enrollment with verification code
   */
  async completeEnrollment(
    _user: User,
    secret: TotpSecret,
    verificationCode: string,
    backupCodes: string[],
    _displayName: string = 'TOTP'
  ): Promise<void> {
    this.throwDisabledError();
  }

  /**
   * Verify MFA code during sign-in
   */
  async verifyCode(_resolver: MultiFactorResolver, _verificationCode: string): Promise<void> {
    this.throwDisabledError();
  }

  /**
   * Verify backup code during sign-in
   */
  async verifyBackupCode(_userId: string, _backupCode: string): Promise<boolean> {
    return false;
  }

  /**
   * Unenroll MFA for a user
   */
  async unenroll(_user: User): Promise<void> {
    this.throwDisabledError();
  }

  /**
   * Generate cryptographically secure backup codes
   */
  private async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character alphanumeric code
      const randomBytes = await Crypto.getRandomBytesAsync(8);
      const code = Array.from(randomBytes)
        .map((byte) => chars[byte % chars.length])
        .join('');

      codes.push(code);
    }

    return codes;
  }

  // All Firestore methods disabled during migration
  private async storeEnrollmentData(_userId: string, _backupCodes: string[]): Promise<void> {
    this.throwDisabledError();
  }

  private async removeEnrollmentData(_userId: string): Promise<void> {
    this.throwDisabledError();
  }

  private async isAccountLocked(_userId: string): Promise<boolean> {
    return false;
  }

  private async incrementFailedAttempts(_userId: string): Promise<void> {
    // No-op during migration
  }

  private async resetFailedAttempts(_userId: string): Promise<void> {
    // No-op during migration
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingBackupCodesCount(_userId: string): Promise<number> {
    return 0;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(_userId: string): Promise<string[]> {
    this.throwDisabledError();
  }
}

export default new MFAService();
