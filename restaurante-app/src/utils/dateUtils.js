/**
 * Utilitários de data - usa horário LOCAL (Brasil)
 */

// Retorna data local no formato YYYY-MM-DD
export const getLocalDateKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Alias para compatibilidade
export const todayKey = getLocalDateKey;
export const dateKey = getLocalDateKey;
