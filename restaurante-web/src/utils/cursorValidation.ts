/**
 * Cursor Validation Utility
 * 
 * Provides cursor validation logic for pagination
 * Requirement 9.5: Reject invalid or tampered cursors
 */

import crypto from 'crypto';

export interface CursorData {
  value: any;
  column: string;
  direction: 'asc' | 'desc';
  timestamp: number;
  signature: string;
}

export interface CursorValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Cursor Validator
 */
export class CursorValidator {
  private secret: string;
  private maxAge: number; // in milliseconds

  constructor(secret?: string, maxAgeHours: number = 1) {
    this.secret = secret || process.env.CURSOR_SECRET || 'default-cursor-secret';
    this.maxAge = maxAgeHours * 60 * 60 * 1000;
  }

  /**
   * Validate cursor integrity and freshness
   * Requirement 9.5: Reject invalid or tampered cursors
   */
  validate(encodedCursor: string): CursorValidationResult {
    try {
      // Decode cursor
      const cursor = this.decode(encodedCursor);

      // Validate structure
      if (!this.hasRequiredFields(cursor)) {
        return {
          valid: false,
          error: 'Cursor missing required fields'
        };
      }

      // Validate timestamp (reject old cursors)
      if (!this.isTimestampValid(cursor.timestamp)) {
        return {
          valid: false,
          error: 'Cursor expired'
        };
      }

      // Validate signature (detect tampering)
      if (!this.isSignatureValid(cursor)) {
        return {
          valid: false,
          error: 'Cursor signature invalid - possible tampering detected'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Cursor validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Encode cursor data to base64 string with signature
   */
  encode(data: Omit<CursorData, 'signature'>): string {
    const signature = this.generateSignature(data);
    const cursorWithSignature: CursorData = {
      ...data,
      signature
    };

    const json = JSON.stringify(cursorWithSignature);
    return Buffer.from(json).toString('base64');
  }

  /**
   * Decode cursor from base64 string
   */
  decode(encodedCursor: string): CursorData {
    try {
      const json = Buffer.from(encodedCursor, 'base64').toString('utf-8');
      const cursor = JSON.parse(json);
      
      if (typeof cursor !== 'object' || cursor === null) {
        throw new Error('Invalid cursor format');
      }

      return cursor as CursorData;
    } catch (error) {
      throw new Error('Failed to decode cursor');
    }
  }

  /**
   * Check if cursor has all required fields
   */
  private hasRequiredFields(cursor: any): cursor is CursorData {
    return (
      cursor &&
      typeof cursor === 'object' &&
      'value' in cursor &&
      'column' in cursor &&
      'direction' in cursor &&
      'timestamp' in cursor &&
      'signature' in cursor &&
      typeof cursor.column === 'string' &&
      (cursor.direction === 'asc' || cursor.direction === 'desc') &&
      typeof cursor.timestamp === 'number' &&
      typeof cursor.signature === 'string'
    );
  }

  /**
   * Validate cursor timestamp
   */
  private isTimestampValid(timestamp: number): boolean {
    const now = Date.now();
    const age = now - timestamp;

    // Reject future timestamps
    if (timestamp > now) {
      return false;
    }

    // Reject expired cursors
    if (age > this.maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Validate cursor signature
   */
  private isSignatureValid(cursor: CursorData): boolean {
    const expectedSignature = this.generateSignature({
      value: cursor.value,
      column: cursor.column,
      direction: cursor.direction,
      timestamp: cursor.timestamp
    });

    return cursor.signature === expectedSignature;
  }

  /**
   * Generate HMAC signature for cursor
   */
  private generateSignature(data: Omit<CursorData, 'signature'>): string {
    const payload = JSON.stringify({
      value: data.value,
      column: data.column,
      direction: data.direction,
      timestamp: data.timestamp
    });

    // Use HMAC-SHA256 for signature
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Set secret key for signature generation
   */
  setSecret(secret: string): void {
    this.secret = secret;
  }

  /**
   * Set maximum cursor age in hours
   */
  setMaxAge(hours: number): void {
    this.maxAge = hours * 60 * 60 * 1000;
  }
}

// Singleton instance
export const cursorValidator = new CursorValidator();

/**
 * Convenience function to validate cursor
 */
export function validateCursor(encodedCursor: string): CursorValidationResult {
  return cursorValidator.validate(encodedCursor);
}

/**
 * Convenience function to encode cursor
 */
export function encodeCursor(data: Omit<CursorData, 'signature'>): string {
  return cursorValidator.encode(data);
}

/**
 * Convenience function to decode cursor
 */
export function decodeCursor(encodedCursor: string): CursorData {
  return cursorValidator.decode(encodedCursor);
}
