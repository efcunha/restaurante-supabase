/**
 * Formats a numeric value as BRL currency.
 * 
 * @param value - The number to format
 * @returns Formatted string (e.g., "R$ 1.234,56")
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'R$ 0,00';
  
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
