/**
 * ComandaService - Gera números de comanda sequenciais por dia.
 * Usa um documento de contador em Firestore (counters/comandas-YYYY-MM-DD)
 * para garantir incremento atômico evitando colisões em múltiplos dispositivos.
 */
import { doc, runTransaction, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const COUNTERS_COLLECTION = 'counters';

/**
 * Retorna string da data (YYYY-MM-DD) para chave diária.
 */
const getDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Retorna o próximo número que SERÁ gerado, sem incrementar o contador
 * @returns {Promise<number>} próximo número disponível
 */
export const peekNextComandaNumber = async () => {
  const dateKey = getDateKey();
  const docRef = doc(db, COUNTERS_COLLECTION, `comandas-${dateKey}`);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return 1; // Primeiro do dia
    }
    const data = snap.data();
    const current = typeof data.current === 'number' ? data.current : 0;
    return current + 1;
  } catch {
    return null;
  }
};

/**
 * Gera próximo número de comanda (incremental) para o dia atual.
 * Cria documento se não existir. Campo: { current: number, createdAt, updatedAt }
 * @returns {Promise<number>} novo número de comanda
 */
export const getNextComandaNumber = async () => {
  const dateKey = getDateKey();
  const docRef = doc(db, COUNTERS_COLLECTION, `comandas-${dateKey}`);
  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      // inicia contador em 1
      transaction.set(docRef, {
        current: 1,
        date: dateKey,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return 1;
    } else {
      const data = snap.data();
      const current = typeof data.current === 'number' ? data.current : 0;
      const updated = current + 1;
      transaction.update(docRef, {
        current: updated,
        updatedAt: serverTimestamp(),
      });
      return updated;
    }
  });
  return nextNumber;
};

/**
 * Formata número da comanda para exibição (ex: 12 -> 012 se desejar padding). Mantém simples por enquanto.
 * @param {number} num
 * @returns {string}
 */
export const formatComandaNumber = (num) => String(num); // Ajuste futuro: padStart(3,'0') se quiser

export default {
  peekNextComandaNumber,
  getNextComandaNumber,
  formatComandaNumber,
};
