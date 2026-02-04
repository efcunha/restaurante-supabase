/**
 * AuthPersistenceService - Secure Authentication State Persistence
 * Manages secure storage and restoration of authentication state
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from 'firebase/auth';

interface AuthState {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  companyId: string | null;
  persistedAt: string;
  expiresAt: string;
  sessionToken: string;
  refreshToken?: string;
}

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  authState?: AuthState;
}

class AuthPersistenceService {
  private readonly AUTH_STATE_KEY = 'auth_state_v2';
  private readonly SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly MIN_SESSION_DURATION_MS = 60 * 1000; // 1 minute minimum

  /**
   * Persist authentication state securely
   */
  async persistAuthState(user: User, sessionToken: string, refreshToken?: string): Promise<void> {
    try {
      // Validate auth state before persisting
      const validationResult = this.validateAuthStateBeforePersist(user, sessionToken);
      
      if (!validationResult.isValid) {
        throw new Error(validationResult.reason || 'Invalid auth state');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT_MS);

      const authState: AuthState = {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        // @ts-ignore - Custom claims
        role: user.role || null,
        // @ts-ignore - Custom claims
        companyId: user.companyId || null,
        persistedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        sessionToken,
        refreshToken,
      };

      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(this.AUTH_STATE_KEY, JSON.stringify(authState));
      } else {
        await SecureStore.setItemAsync(
          this.AUTH_STATE_KEY,
          JSON.stringify(authState)
        );
      }

      console.log('[AuthPersistence] Auth state persisted successfully');
    } catch (error) {
      console.error('[AuthPersistence] Error persisting auth state:', error);
      throw new Error('Falha ao salvar estado de autenticação');
    }
  }

  /**
   * Restore authentication state from secure storage
   */
  async restoreAuthState(): Promise<AuthState | null> {
    try {
      let authStateStr: string | null;
      if (Platform.OS === 'web') {
        authStateStr = await AsyncStorage.getItem(this.AUTH_STATE_KEY);
      } else {
        authStateStr = await SecureStore.getItemAsync(this.AUTH_STATE_KEY);
      }

      if (!authStateStr) {
        console.log('[AuthPersistence] No persisted auth state found');
        return null;
      }

      const authState: AuthState = JSON.parse(authStateStr);

      // Validate restored state
      const validationResult = this.validateRestoredAuthState(authState);

      if (!validationResult.isValid) {
        console.warn('[AuthPersistence] Invalid auth state:', validationResult.reason);
        // Clear invalid state
        await this.clearAuthState();
        return null;
      }

      console.log('[AuthPersistence] Auth state restored successfully');
      return authState;
    } catch (error) {
      console.error('[AuthPersistence] Error restoring auth state:', error);
      // Clear corrupted state
      await this.clearAuthState();
      return null;
    }
  }

  /**
   * Clear persisted authentication state
   */
  async clearAuthState(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(this.AUTH_STATE_KEY);
      } else {
        await SecureStore.deleteItemAsync(this.AUTH_STATE_KEY);
      }
      console.log('[AuthPersistence] Auth state cleared');
    } catch (error) {
      console.error('[AuthPersistence] Error clearing auth state:', error);
    }
  }

  /**
   * Check if persisted auth state exists
   */
  async hasPersistedAuthState(): Promise<boolean> {
    try {
      let authStateStr: string | null;
      if (Platform.OS === 'web') {
        authStateStr = await AsyncStorage.getItem(this.AUTH_STATE_KEY);
      } else {
        authStateStr = await SecureStore.getItemAsync(this.AUTH_STATE_KEY);
      }
      return authStateStr !== null;
    } catch (error) {
      console.error('[AuthPersistence] Error checking persisted state:', error);
      return false;
    }
  }

  /**
   * Validate auth state before persisting
   */
  private validateAuthStateBeforePersist(
    user: User,
    sessionToken: string
  ): ValidationResult {
    // Validate user object
    if (!user || !user.uid) {
      return {
        isValid: false,
        reason: 'Invalid user object: missing uid',
      };
    }

    // Validate session token
    if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim().length === 0) {
      return {
        isValid: false,
        reason: 'Invalid session token: empty or invalid format',
      };
    }

    // Validate email format if present
    if (user.email && !this.isValidEmail(user.email)) {
      return {
        isValid: false,
        reason: 'Invalid email format',
      };
    }

    // Validate userId format (Firebase UIDs are alphanumeric, 28 chars)
    if (!this.isValidUserId(user.uid)) {
      return {
        isValid: false,
        reason: 'Invalid user ID format',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate restored auth state
   */
  private validateRestoredAuthState(authState: AuthState): ValidationResult {
    // Check required fields
    if (!authState.userId || !authState.sessionToken || !authState.expiresAt) {
      return {
        isValid: false,
        reason: 'Missing required fields',
      };
    }

    // Validate userId format
    if (!this.isValidUserId(authState.userId)) {
      return {
        isValid: false,
        reason: 'Invalid user ID format',
      };
    }

    // Validate email format if present
    if (authState.email && !this.isValidEmail(authState.email)) {
      return {
        isValid: false,
        reason: 'Invalid email format',
      };
    }

    // Check session timeout
    const now = new Date();
    const expiresAt = new Date(authState.expiresAt);

    if (now >= expiresAt) {
      return {
        isValid: false,
        reason: 'Session expired',
      };
    }

    // Validate session duration is reasonable
    const persistedAt = new Date(authState.persistedAt);
    const sessionDuration = expiresAt.getTime() - persistedAt.getTime();

    if (sessionDuration < this.MIN_SESSION_DURATION_MS) {
      return {
        isValid: false,
        reason: 'Session duration too short',
      };
    }

    if (sessionDuration > this.SESSION_TIMEOUT_MS + 60000) { // Allow 1 min tolerance
      return {
        isValid: false,
        reason: 'Session duration exceeds maximum',
      };
    }

    // Validate timestamp formats
    if (isNaN(persistedAt.getTime()) || isNaN(expiresAt.getTime())) {
      return {
        isValid: false,
        reason: 'Invalid timestamp format',
      };
    }

    return {
      isValid: true,
      authState,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Firebase user ID format
   */
  private isValidUserId(userId: string): boolean {
    // Firebase UIDs are alphanumeric, typically 28 characters
    // Allow some flexibility for different auth providers
    const userIdRegex = /^[a-zA-Z0-9_-]{10,128}$/;
    return userIdRegex.test(userId);
  }

  /**
   * Check if session is expired
   */
  async isSessionExpired(): Promise<boolean> {
    try {
      const authState = await this.restoreAuthState();

      if (!authState) {
        return true; // No session = expired
      }

      const now = new Date();
      const expiresAt = new Date(authState.expiresAt);

      return now >= expiresAt;
    } catch (error) {
      console.error('[AuthPersistence] Error checking session expiration:', error);
      return true; // Assume expired on error
    }
  }

  /**
   * Get remaining session time in milliseconds
   */
  async getRemainingSessionTime(): Promise<number> {
    try {
      const authState = await this.restoreAuthState();

      if (!authState) {
        return 0;
      }

      const now = new Date();
      const expiresAt = new Date(authState.expiresAt);
      const remaining = expiresAt.getTime() - now.getTime();

      return Math.max(0, remaining);
    } catch (error) {
      console.error('[AuthPersistence] Error getting remaining session time:', error);
      return 0;
    }
  }

  /**
   * Extend session timeout (refresh)
   */
  async extendSession(newSessionToken?: string): Promise<void> {
    try {
      const authState = await this.restoreAuthState();

      if (!authState) {
        throw new Error('No active session to extend');
      }

      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT_MS);

      authState.expiresAt = newExpiresAt.toISOString();
      
      if (newSessionToken) {
        authState.sessionToken = newSessionToken;
      }

      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(this.AUTH_STATE_KEY, JSON.stringify(authState));
      } else {
        await SecureStore.setItemAsync(
          this.AUTH_STATE_KEY,
          JSON.stringify(authState)
        );
      }

      console.log('[AuthPersistence] Session extended successfully');
    } catch (error) {
      console.error('[AuthPersistence] Error extending session:', error);
      throw new Error('Falha ao estender sessão');
    }
  }

  /**
   * Update auth state with new data
   */
  async updateAuthState(updates: Partial<AuthState>): Promise<void> {
    try {
      const authState = await this.restoreAuthState();

      if (!authState) {
        throw new Error('No active session to update');
      }

      // Merge updates
      const updatedState: AuthState = {
        ...authState,
        ...updates,
      };

      // Validate updated state
      const validationResult = this.validateRestoredAuthState(updatedState);

      if (!validationResult.isValid) {
        throw new Error(validationResult.reason || 'Invalid updated state');
      }

      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(this.AUTH_STATE_KEY, JSON.stringify(updatedState));
      } else {
        await SecureStore.setItemAsync(
          this.AUTH_STATE_KEY,
          JSON.stringify(updatedState)
        );
      }

      console.log('[AuthPersistence] Auth state updated successfully');
    } catch (error) {
      console.error('[AuthPersistence] Error updating auth state:', error);
      throw new Error('Falha ao atualizar estado de autenticação');
    }
  }

  /**
   * Get session info for display
   */
  async getSessionInfo(): Promise<{
    isActive: boolean;
    expiresAt?: Date;
    remainingDays?: number;
    userId?: string;
    email?: string;
  }> {
    try {
      const authState = await this.restoreAuthState();

      if (!authState) {
        return { isActive: false };
      }

      const expiresAt = new Date(authState.expiresAt);
      const now = new Date();
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

      return {
        isActive: true,
        expiresAt,
        remainingDays: Math.max(0, remainingDays),
        userId: authState.userId,
        email: authState.email || undefined,
      };
    } catch (error) {
      console.error('[AuthPersistence] Error getting session info:', error);
      return { isActive: false };
    }
  }

  /**
   * Validate session token format
   */
  isValidSessionToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Firebase ID tokens are JWT format: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64 encoded
    return parts.every(part => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
  }

  /**
   * Check if auth state needs refresh
   */
  async needsRefresh(thresholdDays: number = 7): Promise<boolean> {
    try {
      const remainingMs = await this.getRemainingSessionTime();
      const remainingDays = remainingMs / (24 * 60 * 60 * 1000);

      return remainingDays < thresholdDays;
    } catch (error) {
      console.error('[AuthPersistence] Error checking refresh need:', error);
      return true;
    }
  }
}

export default new AuthPersistenceService();
