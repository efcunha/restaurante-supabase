/**
 * DateKeyService
 * 
 * Serviço para padronização de dateKey com cálculo server-side.
 * Garante consistência de timezone usando UTC.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import type { Functions } from 'firebase/functions';

export interface DateKeyValidationResult {
  isValid: boolean;
  dateKey?: string;
  error?: string;
}

export interface DateKeyConversionResult {
  utcDateKey: string;
  localDate: Date;
  utcDate: Date;
}

/**
 * Valida formato de dateKey (YYYY-MM-DD)
 * Property 26: DateKey Format Validation
 */
export function validateDateKeyFormat(dateKey: string): DateKeyValidationResult {
  const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateKey || typeof dateKey !== 'string') {
    return {
      isValid: false,
      error: 'DateKey must be a non-empty string'
    };
  }

  if (!dateKeyPattern.test(dateKey)) {
    return {
      isValid: false,
      error: 'DateKey must match YYYY-MM-DD format'
    };
  }

  // Valida que é uma data válida
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return {
      isValid: false,
      error: 'DateKey represents an invalid date'
    };
  }

  return {
    isValid: true,
    dateKey
  };
}

/**
 * Converte data local para dateKey UTC
 * Property 27: Local Date to UTC Conversion
 */
export function localDateToUTCDateKey(localDate: Date): DateKeyConversionResult {
  if (!(localDate instanceof Date) || isNaN(localDate.getTime())) {
    throw new Error('Invalid date provided');
  }

  // Converte para UTC
  const utcDate = new Date(localDate.toISOString());
  
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  
  const utcDateKey = `${year}-${month}-${day}`;

  return {
    utcDateKey,
    localDate,
    utcDate
  };
}

/**
 * Converte dateKey UTC para data local
 */
export function utcDateKeyToLocalDate(dateKey: string): Date {
  const validation = validateDateKeyFormat(dateKey);
  
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid dateKey format');
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Obtém dateKey UTC para hoje
 */
export function getTodayUTCDateKey(): string {
  return localDateToUTCDateKey(new Date()).utcDateKey;
}

/**
 * Obtém dateKey UTC para data específica
 */
export function getUTCDateKey(date: Date): string {
  return localDateToUTCDateKey(date).utcDateKey;
}

/**
 * Calcula dateKey server-side via Cloud Function
 * Garante consistência usando timestamp do servidor
 */
export async function calculateServerDateKey(
  functionsInstance: Functions,
  timestamp?: number
): Promise<string> {
  const { httpsCallable } = await import('firebase/functions');
  const calculateDateKey = httpsCallable<{ timestamp?: number }, { dateKey: string }>(
    functionsInstance,
    'calculateDateKey'
  );

  try {
    const result = await calculateDateKey({ timestamp });
    return result.data.dateKey;
  } catch (error) {
    console.error('Error calculating server dateKey:', error);
    throw new Error('Failed to calculate server dateKey');
  }
}

/**
 * Converte range de datas locais para UTC para queries
 */
export function localDateRangeToUTC(startDate: Date, endDate: Date): {
  startDateKey: string;
  endDateKey: string;
} {
  const start = localDateToUTCDateKey(startDate);
  const end = localDateToUTCDateKey(endDate);

  return {
    startDateKey: start.utcDateKey,
    endDateKey: end.utcDateKey
  };
}

/**
 * Valida e normaliza dateKey
 * Se inválido, retorna dateKey UTC de hoje
 */
export function normalizeeDateKey(dateKey: string | undefined): string {
  if (!dateKey) {
    return getTodayUTCDateKey();
  }

  const validation = validateDateKeyFormat(dateKey);
  
  if (!validation.isValid) {
    console.warn(`Invalid dateKey "${dateKey}", using today's UTC dateKey`);
    return getTodayUTCDateKey();
  }

  return dateKey;
}

/**
 * Compara dois dateKeys
 * Retorna: -1 se a < b, 0 se a === b, 1 se a > b
 */
export function compareDateKeys(a: string, b: string): number {
  const dateA = utcDateKeyToLocalDate(a);
  const dateB = utcDateKeyToLocalDate(b);
  
  return dateA.getTime() - dateB.getTime();
}

/**
 * Verifica se dateKey está dentro de um range
 */
export function isDateKeyInRange(
  dateKey: string,
  startDateKey: string,
  endDateKey: string
): boolean {
  return (
    compareDateKeys(dateKey, startDateKey) >= 0 &&
    compareDateKeys(dateKey, endDateKey) <= 0
  );
}

export const DateKeyService = {
  validateDateKeyFormat,
  localDateToUTCDateKey,
  utcDateKeyToLocalDate,
  getTodayUTCDateKey,
  getUTCDateKey,
  calculateServerDateKey,
  localDateRangeToUTC,
  normalizeeDateKey,
  compareDateKeys,
  isDateKeyInRange
};
