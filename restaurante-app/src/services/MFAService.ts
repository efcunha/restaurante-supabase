/**
 * MFAService - Multi-Factor Authentication Service
 * Implements Supabase Auth TOTP with local backup code support.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '../config/SupabaseConfig';

type User = {
  uid?: string;
  id?: string;
  email?: string | null;
};

export interface MFAVerificationResolver {
  factorId: string;
  challengeId?: string;
}

interface TotpSecret {
  id: string;
  uri: string;
  qrCode: string;
}

interface MFASetupResult {
  secret: TotpSecret;
  qrCodeUrl: string;
  backupCodes: string[];
}

class MFAService {
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly BACKUP_CODES_KEY_PREFIX = 'mfa_backup_codes_v1:';

  private getUserId(user: User): string {
    const userId = user?.uid || user?.id;
    if (!userId) {
      throw new Error('Usuario invalido para operacao de MFA.');
    }
    return userId;
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
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      throw new Error(error.message);
    }
    return Boolean(data?.totp?.length);
  }

  /**
   * Start MFA enrollment process
   * Returns secret and QR code URL for TOTP setup
   */
  async startEnrollment(user: User, displayName: string = 'Restaurant App'): Promise<MFASetupResult> {
    const userId = this.getUserId(user);
    const friendlyName = `${displayName} ${new Date().toISOString().slice(0, 10)}`;
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Nao foi possivel iniciar o cadastro de TOTP. Resposta vazia.');
    }

    // TOTP data can be in different formats depending on Supabase version
    const totpData = data.totp || data;
    const uri = totpData.uri || totpData.totp?.uri;
    const qrCode = totpData.qr_code || totpData.qrCode || uri;

    if (!uri || !qrCode) {
      console.error('MFA Enrollment Response:', { data, totpData });
      throw new Error('Nao foi possivel iniciar o cadastro de TOTP. Dados incompletos.');
    }

    const backupCodes = await this.generateBackupCodes();
    await this.storeEnrollmentData(userId, backupCodes);

    return {
      secret: {
        id: data.id,
        uri,
        qrCode,
      },
      qrCodeUrl: qrCode,
      backupCodes,
    };
  }

  /**
   * Complete MFA enrollment with verification code
   */
  async completeEnrollment(
    _user: User,
    secret: TotpSecret,
    verificationCode: string,
    _backupCodes: string[],
    _displayName: string = 'TOTP'
  ): Promise<void> {
    if (!secret?.id) {
      throw new Error('Fator TOTP invalido para confirmacao.');
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: secret.id,
      code: verificationCode.trim(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Verify MFA code during sign-in
   */
  async verifyCode(resolver: MFAVerificationResolver, verificationCode: string): Promise<void> {
    if (!resolver?.factorId) {
      throw new Error('Resolver de MFA invalido.');
    }

    const normalizedCode = verificationCode.trim();
    if (!normalizedCode) {
      throw new Error('Codigo MFA invalido.');
    }

    const response = resolver.challengeId
      ? await supabase.auth.mfa.verify({
          factorId: resolver.factorId,
          challengeId: resolver.challengeId,
          code: normalizedCode,
        })
      : await supabase.auth.mfa.challengeAndVerify({
          factorId: resolver.factorId,
          code: normalizedCode,
        });

    if (response.error) {
      throw new Error(response.error.message);
    }
  }

  /**
   * Verify backup code during sign-in
   */
  async verifyBackupCode(userId: string, backupCode: string): Promise<boolean> {
    const normalizedCode = backupCode.trim().toUpperCase();
    if (!normalizedCode) {
      return false;
    }

    const codes = await this.getBackupCodes(userId);
    const index = codes.indexOf(normalizedCode);
    if (index === -1) {
      return false;
    }

    const remaining = codes.filter((_, codeIndex) => codeIndex !== index);
    await this.storeEnrollmentData(userId, remaining);
    return true;
  }

  /**
   * Unenroll MFA for a user
   */
  async unenroll(user: User): Promise<void> {
    const userId = this.getUserId(user);
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      throw new Error(error.message);
    }

    for (const factor of data?.totp || []) {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (unenrollError) {
        throw new Error(unenrollError.message);
      }
    }

    await this.removeEnrollmentData(userId);
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

  private async storeEnrollmentData(userId: string, backupCodes: string[]): Promise<void> {
    const normalized = backupCodes.map((code) => code.trim().toUpperCase());
    await AsyncStorage.setItem(this.BACKUP_CODES_KEY_PREFIX + userId, JSON.stringify(normalized));
  }

  private async getBackupCodes(userId: string): Promise<string[]> {
    const raw = await AsyncStorage.getItem(this.BACKUP_CODES_KEY_PREFIX + userId);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((code) => String(code).trim().toUpperCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  private async removeEnrollmentData(userId: string): Promise<void> {
    await AsyncStorage.removeItem(this.BACKUP_CODES_KEY_PREFIX + userId);
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
    const userId = String(_userId || '').trim();
    if (!userId) {
      return 0;
    }
    const codes = await this.getBackupCodes(userId);
    return codes.length;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      throw new Error('Usuario invalido para regenerar codigos de backup.');
    }

    const backupCodes = await this.generateBackupCodes();
    await this.storeEnrollmentData(normalizedUserId, backupCodes);
    return backupCodes;
  }
}

export default new MFAService();
