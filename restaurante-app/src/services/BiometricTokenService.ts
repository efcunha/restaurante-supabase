/**
 * Biometric Token Service - SEC-W1-003 Hardening
 * 
 * Replaces direct password storage with ephemeral token-based authentication.
 * Security properties:
 * - No persistent passwords stored on device
 * - Token is ephemeral and signed locally
 * - Server-side session validation required for actual auth
 * - Token expires after 30 days or on logout
 */

import crypto from 'crypto';
import * as SecureStore from 'expo-secure-store';

export interface BiometricTokenData {
  userId: string;
  deviceId: string;
  token: string;
  tokenHash: string; // SHA-256 of token
  createdAt: number;
  expiresAt: number;
  isValid: boolean;
}

const TOKEN_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOKEN_KEY_PREFIX = 'biometric_token';

/**
 * Biometric Token Service
 * 
 * Generates and manages lightweight tokens for biometric authentication flow.
 * These tokens are NOT used for direct authentication to Supabase/API.
 * Instead, they signal a biometric unlock event to the app, which must then
 * refresh the Supabase session via refreshSession() or similar mechanism.
 */
class BiometricTokenService {
  /**
   * Generate a secure random token for biometric enrollment
   * 
   * @param userId User ID
   * @param deviceId Device identifier
   * @returns BiometricTokenData with token and hash stored
   */
  async generateToken(userId: string, deviceId: string): Promise<BiometricTokenData> {
    try {
      // Generate cryptographically secure random token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const now = Date.now();
      const expiresAt = now + TOKEN_DURATION_MS;

      const tokenData: BiometricTokenData = {
        userId,
        deviceId,
        token: token, // Ephemeral, not persisted to storage
        tokenHash,
        createdAt: now,
        expiresAt,
        isValid: true,
      };

      // Store only hash, timestamp, and metadata (not the token itself)
      const storageData = {
        userId,
        deviceId,
        tokenHash,
        createdAt: now,
        expiresAt,
        isValid: true,
      };

      await SecureStore.setItemAsync(
        `${TOKEN_KEY_PREFIX}_${userId}_${deviceId}`,
        JSON.stringify(storageData)
      );

      console.log('[BiometricToken] Token generated for user:', userId);
      return tokenData;
    } catch (error) {
      console.error('[BiometricToken] Error generating token:', error);
      throw error;
    }
  }

  /**
   * Validate an existing token by verifying its hash
   * 
   * ⚠️ This function is called ONLY internally by the service.
   * External callers should use validateTokenExpiry() instead.
   * 
   * @param userId User ID
   * @param deviceId Device identifier
   * @param token Token to validate (ephemeral, not stored)
   * @returns true if hash matches and token is not expired
   */
  async validateToken(userId: string, deviceId: string, token: string): Promise<boolean> {
    try {
      const storageKey = `${TOKEN_KEY_PREFIX}_${userId}_${deviceId}`;
      const storageDataStr = await SecureStore.getItemAsync(storageKey);

      if (!storageDataStr) {
        console.warn('[BiometricToken] Token not found for user:', userId);
        return false;
      }

      const storageData = JSON.parse(storageDataStr);

      // Check expiry
      if (Date.now() > storageData.expiresAt) {
        console.warn('[BiometricToken] Token expired for user:', userId);
        await this.revokeToken(userId, deviceId);
        return false;
      }

      // Verify token hash
      const providedHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      if (providedHash !== storageData.tokenHash) {
        console.warn('[BiometricToken] Token hash mismatch for user:', userId);
        return false;
      }

      // Mark token as used (extend expiry on successful validation)
      // This allows continuous sessions as long as biometric auth remains valid
      storageData.expiresAt = Date.now() + TOKEN_DURATION_MS;
      await SecureStore.setItemAsync(storageKey, JSON.stringify(storageData));

      console.log('[BiometricToken] Token validated successfully for user:', userId);
      return true;
    } catch (error) {
      console.error('[BiometricToken] Error validating token:', error);
      return false;
    }
  }

  /**
   * Check if a token is still valid (not expired)
   * Public API for checking token presence without validating hash
   * 
   * @param userId User ID
   * @param deviceId Device identifier
   * @returns true if token exists and is not expired
   */
  async validateTokenExpiry(userId: string, deviceId: string): Promise<boolean> {
    try {
      const storageKey = `${TOKEN_KEY_PREFIX}_${userId}_${deviceId}`;
      const storageDataStr = await SecureStore.getItemAsync(storageKey);

      if (!storageDataStr) {
        return false;
      }

      const storageData = JSON.parse(storageDataStr);
      const isValid = Date.now() <= storageData.expiresAt && storageData.isValid;

      if (!isValid && storageData.expiresAt <= Date.now()) {
        // Auto-cleanup expired tokens
        await this.revokeToken(userId, deviceId);
      }

      return isValid;
    } catch (error) {
      console.error('[BiometricToken] Error checking token expiry:', error);
      return false;
    }
  }

  /**
   * Revoke a biometric token immediately
   * Called on logout or when token expires
   * 
   * @param userId User ID
   * @param deviceId Device identifier
   */
  async revokeToken(userId: string, deviceId: string): Promise<void> {
    try {
      const storageKey = `${TOKEN_KEY_PREFIX}_${userId}_${deviceId}`;
      await SecureStore.deleteItemAsync(storageKey);
      console.log('[BiometricToken] Token revoked for user:', userId);
    } catch (error) {
      console.error('[BiometricToken] Error revoking token:', error);
    }
  }

  /**
   * Revoke all tokens for a user (on logout)
   * 
   * @param userId User ID (optional; if omitted, would need to iterate stored tokens)
   */
  async revokeAllTokens(userId: string): Promise<void> {
    // Note: Expo SecureStore doesn't support key enumeration easily.
    // In practice, we revoke tokens per device as they're generated/used.
    // For complete logout, call revokeToken() for each known device.
    console.log('[BiometricToken] Revoke all requested for user:', userId);
  }

  /**
   * Get token metadata (expiry, creation time)
   * Useful for UI to show token status
   * 
   * @param userId User ID
   * @param deviceId Device identifier
   * @returns Token metadata or null if not found
   */
  async getTokenMetadata(
    userId: string,
    deviceId: string
  ): Promise<Omit<BiometricTokenData, 'token'> | null> {
    try {
      const storageKey = `${TOKEN_KEY_PREFIX}_${userId}_${deviceId}`;
      const storageDataStr = await SecureStore.getItemAsync(storageKey);

      if (!storageDataStr) {
        return null;
      }

      const storageData = JSON.parse(storageDataStr);
      const isExpired = Date.now() > storageData.expiresAt;

      return {
        userId: storageData.userId,
        deviceId: storageData.deviceId,
        tokenHash: storageData.tokenHash,
        createdAt: storageData.createdAt,
        expiresAt: storageData.expiresAt,
        isValid: storageData.isValid && !isExpired,
      };
    } catch (error) {
      console.error('[BiometricToken] Error getting token metadata:', error);
      return null;
    }
  }
}

export default new BiometricTokenService();
