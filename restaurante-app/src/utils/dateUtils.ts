/**
 * Date Utilities
 * 
 * Utility functions for date manipulation and formatting.
 * Migrated from FirebaseOptimizations.ts
 */

export type Period = 'hoje' | 'semana' | 'mes' | 'mesVigente';

export interface DateKeyRange {
  startKey: string;
  endKey: string;
}

/**
 * Generates dateKey for queries - using LOCAL date (not UTC)
 * IMPORTANT: Use local date for consistency with user timezone
 */
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Alias for getTodayKey() - for backward compatibility
 */
export const getLocalDateKey = getTodayKey;

/**
 * Generates range of dateKeys for a period - using LOCAL date (not UTC)
 */
export function getDateKeyRange(periodo: Period): DateKeyRange {
  const now = new Date();
  
  // Helper function to format local date as YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const startDate = new Date(now);
  
  switch (periodo) {
    case 'semana':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'mes':
    case 'mesVigente':
      // Get start of current month, not previous month
      startDate.setDate(1); // First day of current month
      break;
    case 'hoje':
    default:
      // For 'hoje', startKey and endKey are the same
      break;
  }
  
  return {
    startKey: formatLocalDate(startDate),
    endKey: formatLocalDate(now)
  };
}

/**
 * Formats a date as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a dateKey (YYYY-MM-DD) into a Date object
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gets the date range for a specific number of days back
 */
export function getDateRangeForDays(days: number): DateKeyRange {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  
  return {
    startKey: formatDateKey(startDate),
    endKey: formatDateKey(now)
  };
}

/**
 * Checks if a dateKey is today
 */
export function isToday(dateKey: string): boolean {
  return dateKey === getTodayKey();
}

/**
 * Checks if a dateKey is in the past
 */
export function isPast(dateKey: string): boolean {
  const today = getTodayKey();
  return dateKey < today;
}

/**
 * Checks if a dateKey is in the future
 */
export function isFuture(dateKey: string): boolean {
  const today = getTodayKey();
  return dateKey > today;
}

/**
 * Returns the start Date of the current "Business Day".
 * If now is before cutoffHour, it returns yesterday's cutoff time.
 * If now is after cutoffHour, it returns today's cutoff time.
 * 
 * Example: Cutoff 06:00.
 * - Now: Fri 02:00 -> Returns Thu 06:00
 * - Now: Fri 08:00 -> Returns Fri 06:00
 */
export function getBusinessDayStart(cutoffHour: number = 6): Date {
  const now = new Date();
  const currentHour = now.getHours();

  const startDate = new Date(now);
  startDate.setHours(cutoffHour, 0, 0, 0);

  if (currentHour < cutoffHour) {
    // Before cutoff, so business day started yesterday
    startDate.setDate(startDate.getDate() - 1);
  }
  
  return startDate;
}
