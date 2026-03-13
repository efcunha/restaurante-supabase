/**
 * BiometricAuthService - Biometric Authentication Service
 * Implements fingerprint and face recognition with secure token validation
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricEnrollmentData {
  userId: string;
  enrolledAt: Date;
  biometricType: 'fingerprint' | 'face' | 'iris' | 'unknown';
  deviceId: string;
  lastUsedAt: Date | null;
}

interface BiometricAuthResult {
  success: boolean;
  biometricType?: string;
  error?: string;
  fallbackToPassword?: boolean;
}

class BiometricAuthService {
  private readonly ENROLLMENT_KEY = 'biometric_enrollment';
  private readonly SESSION_TOKEN_KEY = 'biometric_session_token';
  private readonly CREDENTIALS_KEY = 'biometric_credentials';
  private readonly LAST_USER_KEY = 'biometric_last_uid';
  private readonly SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Check if device supports biometric authentication
   */
  async isSupported(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch (error) {
      console.error('[BiometricAuth] Error checking hardware support:', error);
      return false;
    }
  }

  /**
   * Check if user has enrolled biometrics on device
   */
  async hasEnrolledBiometrics(): Promise<boolean> {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('[BiometricAuth] Error checking enrollment:', error);
      return false;
    }
  }

  /**
   * Get available biometric types on device
   */
  async getAvailableBiometricTypes(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      const typeNames = types.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'face';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      });

      return typeNames;
    } catch (error) {
      console.error('[BiometricAuth] Error getting biometric types:', error);
      return [];
    }
  }

  /**
   * Get user-friendly name for biometric type
   */
  getBiometricTypeName(types: string[]): string {
    if (types.includes('face')) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Reconhecimento Facial';
    }
    if (types.includes('fingerprint')) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Impressão Digital';
    }
    if (types.includes('iris')) {
      return 'Reconhecimento de Íris';
    }
    return 'Biometria';
  }

  /**
   * Check if biometric authentication is enabled for user
   */
  async isEnabledForUser(userId: string): Promise<boolean> {
    try {
      const enrollmentData = await this.getEnrollmentData(userId);
      return enrollmentData !== null;
    } catch (error) {
      console.error('[BiometricAuth] Error checking if enabled:', error);
      return false;
    }
  }

  /**
   * Enroll user for biometric authentication
   */
  /**
   * Enroll user for biometric authentication
   */
  async enrollUser(userId: string, deviceId: string, email?: string, password?: string): Promise<void> {
    try {
      // Verify device supports biometrics
      const isSupported = await this.isSupported();
      if (!isSupported) {
        throw new Error('Dispositivo não suporta autenticação biométrica');
      }

      // Verify user has enrolled biometrics
      const hasEnrolled = await this.hasEnrolledBiometrics();
      if (!hasEnrolled) {
        throw new Error('Nenhuma biometria cadastrada no dispositivo');
      }

      // Get biometric types
      const types = await this.getAvailableBiometricTypes();
      const biometricType = types[0] || 'unknown';

      // Store enrollment data
      const enrollmentData: BiometricEnrollmentData = {
        userId,
        enrolledAt: new Date(),
        biometricType: biometricType as any,
        deviceId,
        lastUsedAt: null,
      };

      await SecureStore.setItemAsync(
        `${this.ENROLLMENT_KEY}_${userId}`,
        JSON.stringify(enrollmentData)
      );
      
      // Store credentials if provided
      if (email && password) {
        await this.storeCredentials(userId, email, password);
      }
      
      // Mark as last user
      await AsyncStorage.setItem(this.LAST_USER_KEY, userId);

      console.log('[BiometricAuth] User enrolled successfully');
    } catch (error) {
      console.error('[BiometricAuth] Error enrolling user:', error);
      throw error;
    }
  }

  /**
   * Unenroll user from biometric authentication
   */
  /**
   * Unenroll user from biometric authentication
   */
  async unenrollUser(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${this.ENROLLMENT_KEY}_${userId}`);
      await SecureStore.deleteItemAsync(`${this.SESSION_TOKEN_KEY}_${userId}`);
      await SecureStore.deleteItemAsync(`${this.CREDENTIALS_KEY}_${userId}`);
      
      const lastUser = await AsyncStorage.getItem(this.LAST_USER_KEY);
      if (lastUser === userId) {
         await AsyncStorage.removeItem(this.LAST_USER_KEY);
      }
      
      console.log('[BiometricAuth] User unenrolled successfully');
    } catch (error) {
      console.error('[BiometricAuth] Error unenrolling user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(
    userId: string,
    promptMessage?: string
  ): Promise<BiometricAuthResult> {
    try {
      // Check if user is enrolled
      const isEnabled = await this.isEnabledForUser(userId);
      if (!isEnabled) {
        return {
          success: false,
          error: 'Autenticação biométrica não está habilitada',
          fallbackToPassword: true,
        };
      }

      // Check if device supports biometrics
      const isSupported = await this.isSupported();
      if (!isSupported) {
        return {
          success: false,
          error: 'Dispositivo não suporta autenticação biométrica',
          fallbackToPassword: true,
        };
      }

      // Check if user has enrolled biometrics
      const hasEnrolled = await this.hasEnrolledBiometrics();
      if (!hasEnrolled) {
        return {
          success: false,
          error: 'Nenhuma biometria cadastrada no dispositivo',
          fallbackToPassword: true,
        };
      }

      // Get biometric types for prompt
      const types = await this.getAvailableBiometricTypes();
      const biometricName = this.getBiometricTypeName(types);

      // Sanitize prompt message
      let safePromptMessage = promptMessage || `Autentique com ${biometricName}`;
      // Remove any non-printable characters and limit length
      safePromptMessage = safePromptMessage.replace(/[^\x20-\x7E]/g, '').substring(0, 100);

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: safePromptMessage,
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Update last used timestamp
        await this.updateLastUsed(userId);

        // Validate session token
        const isTokenValid = await this.validateSessionToken(userId);

        return {
          success: true,
          biometricType: types[0],
        };
      } else {
        // Authentication failed or cancelled
        let error = 'Autenticação biométrica falhou';
        let fallbackToPassword = false;

        if (result.error === 'user_cancel') {
          error = 'Autenticação cancelada pelo usuário';
          fallbackToPassword = true;
        } else if (result.error === 'user_fallback') {
          error = 'Usuário optou por usar senha';
          fallbackToPassword = true;
        } else if (result.error === 'lockout') {
          error = 'Muitas tentativas falhadas. Tente novamente mais tarde.';
          fallbackToPassword = true;
        } else if (result.error === 'not_enrolled') {
          error = 'Nenhuma biometria cadastrada no dispositivo';
          fallbackToPassword = true;
        }

        return {
          success: false,
          error,
          fallbackToPassword,
        };
      }
    } catch (error: any) {
      console.error('[BiometricAuth] Authentication error:', error);
      return {
        success: false,
        error: error.message || 'Erro ao autenticar com biometria',
        fallbackToPassword: true,
      };
    }
  }

  /**
   * Verify biometric ownership (for enrollment)
   * Does NOT check if user is already enrolled in our system.
   */
  async verifyBiometricOwnership(promptMessage?: string): Promise<boolean> {
      try {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          if (!compatible) throw new Error('Hardware não suportado');

          const enrolled = await LocalAuthentication.isEnrolledAsync();
          if (!enrolled) throw new Error('Nenhuma biometria cadastrada no dispositivo');

          const result = await LocalAuthentication.authenticateAsync({
              promptMessage: promptMessage || 'Confirme sua biometria',
              cancelLabel: 'Cancelar',
              disableDeviceFallback: true, // Force biometrics only for enrollment
          });

          return result.success;
      } catch (error) {
          console.error('[BiometricAuth] Ownership verification failed:', error);
          return false;
      }
  }

  /**
   * Store session token after successful authentication
   */
  async storeSessionToken(userId: string, token: string): Promise<void> {
    try {
      const sessionData = {
        token,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.SESSION_DURATION_MS).toISOString(),
      };

      await SecureStore.setItemAsync(
        `${this.SESSION_TOKEN_KEY}_${userId}`,
        JSON.stringify(sessionData)
      );

      console.log('[BiometricAuth] Session token stored');
    } catch (error) {
      console.error('[BiometricAuth] Error storing session token:', error);
      throw error;
    }
  }

  /**
   * Validate session token
   */
  async validateSessionToken(userId: string): Promise<boolean> {
    try {
      const sessionDataStr = await SecureStore.getItemAsync(
        `${this.SESSION_TOKEN_KEY}_${userId}`
      );

      if (!sessionDataStr) {
        return false;
      }

      const sessionData = JSON.parse(sessionDataStr);
      const expiresAt = new Date(sessionData.expiresAt);
      const now = new Date();

      // Check if token is expired
      if (now > expiresAt) {
        // Token expired, remove it
        await SecureStore.deleteItemAsync(`${this.SESSION_TOKEN_KEY}_${userId}`);
        return false;
      }

      // Token is valid
      return true;
    } catch (error) {
      console.error('[BiometricAuth] Error validating session token:', error);
      return false;
    }
  }

  /**
   * Get session token
   */
  async getSessionToken(userId: string): Promise<string | null> {
    try {
      const sessionDataStr = await SecureStore.getItemAsync(
        `${this.SESSION_TOKEN_KEY}_${userId}`
      );

      if (!sessionDataStr) {
        return null;
      }

      const sessionData = JSON.parse(sessionDataStr);
      
      // Validate token before returning
      const isValid = await this.validateSessionToken(userId);
      if (!isValid) {
        return null;
      }

      return sessionData.token;
    } catch (error) {
      console.error('[BiometricAuth] Error getting session token:', error);
      return null;
    }
  }

  /**
   * Clear session token
   */
  async clearSessionToken(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${this.SESSION_TOKEN_KEY}_${userId}`);
      console.log('[BiometricAuth] Session token cleared');
    } catch (error) {
      console.error('[BiometricAuth] Error clearing session token:', error);
    }
  }

  /**
   * Get enrollment data for user
   */
  private async getEnrollmentData(userId: string): Promise<BiometricEnrollmentData | null> {
    try {
      const dataStr = await SecureStore.getItemAsync(`${this.ENROLLMENT_KEY}_${userId}`);
      
      if (!dataStr) {
        return null;
      }

      const data = JSON.parse(dataStr);
      return {
        ...data,
        enrolledAt: new Date(data.enrolledAt),
        lastUsedAt: data.lastUsedAt ? new Date(data.lastUsedAt) : null,
      };
    } catch (error) {
      console.error('[BiometricAuth] Error getting enrollment data:', error);
      return null;
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(userId: string): Promise<void> {
    try {
      const enrollmentData = await this.getEnrollmentData(userId);
      
      if (!enrollmentData) {
        return;
      }

      enrollmentData.lastUsedAt = new Date();

      await SecureStore.setItemAsync(
        `${this.ENROLLMENT_KEY}_${userId}`,
        JSON.stringify(enrollmentData)
      );
    } catch (error) {
      console.error('[BiometricAuth] Error updating last used:', error);
    }
  }

  /**
   * Get security level of biometric authentication
   */
  async getSecurityLevel(): Promise<number> {
    try {
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      return securityLevel;
    } catch (error) {
      console.error('[BiometricAuth] Error getting security level:', error);
      return 0;
    }
  }

  /**
   * Check if biometric authentication is available and ready
   */
  async isAvailable(): Promise<{
    available: boolean;
    biometricType?: string;
    reason?: string;
  }> {
    try {
      const isSupported = await this.isSupported();
      if (!isSupported) {
        return {
          available: false,
          reason: 'Dispositivo não suporta autenticação biométrica',
        };
      }

      const hasEnrolled = await this.hasEnrolledBiometrics();
      if (!hasEnrolled) {
        return {
          available: false,
          reason: 'Nenhuma biometria cadastrada no dispositivo',
        };
      }

      const types = await this.getAvailableBiometricTypes();
      const biometricName = this.getBiometricTypeName(types);

      return {
        available: true,
        biometricType: biometricName,
      };
    } catch (error) {
      console.error('[BiometricAuth] Error checking availability:', error);
      return {
        available: false,
        reason: 'Erro ao verificar disponibilidade',
      };
    }
  }
  /**
   * Store user credentials securely
   */
  async storeCredentials(userId: string, email: string, password: string): Promise<void> {
    try {
       const creds = { email, password };
       await SecureStore.setItemAsync(`${this.CREDENTIALS_KEY}_${userId}`, JSON.stringify(creds));
    } catch (error) {
       console.error('[BiometricAuth] Error storing credentials:', error);
       throw error;
    }
  }

  /**
   * Get stored credentials
   */
  async getCredentials(userId: string): Promise<{email: string, password: string} | null> {
    try {
      const credsStr = await SecureStore.getItemAsync(`${this.CREDENTIALS_KEY}_${userId}`);
      if (!credsStr) return null;
      return JSON.parse(credsStr);
    } catch (error) {
      console.error('[BiometricAuth] Error getting credentials:', error);
      return null;
    }
  }
  
  /**
   * Get Last Enrolled User ID
   */
  async getLastEnrolledUser(): Promise<string | null> {
      try {
          return await AsyncStorage.getItem(this.LAST_USER_KEY);
      } catch (e) {
          return null;
      }
  }
}

export default new BiometricAuthService();
