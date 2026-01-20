/**
 * ComandasService - Gerencia contas abertas (comandas), totais e fechamento.
 */
import { doc, runTransaction, serverTimestamp, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import PagamentosService from './PagamentosService';

const COMANDAS_COLLECTION = 'comandas';

import { getLocalDateKey } from '../utils/dateUtils';
const todayKey = getLocalDateKey;
const comandaId = (dateKey, numero) => `comanda-${dateKey}-${String(numero)}`;

class ComandasService {
  async ensureComandaAberta(comandaNumber, usuarioId, usuarioNome) {
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = doc(db, COMANDAS_COLLECTION, id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        const criadaEm = new Date();
        const horarioCriacao = criadaEm.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });
        
        tx.set(ref, {
          dateKey,
          comandaNumber: String(comandaNumber),
          status: 'aberta',
          totalConsumido: 0,
          totalPago: 0,
          saldoAberto: 0,
          recebidoPor: [], // Lista de quem recebeu pagamentos
          abertaAt: serverTimestamp(),
          criadaEm: criadaEm.toISOString(),
          horarioCriacao, // Horário formatado HH:MM
          abertaPor: usuarioId || '',
          abertaPorNome: usuarioNome || '',
          fechadaAt: null,
          fechadaPor: null,
          atualizado: serverTimestamp(),
        });
      } else {
        // Comanda existe - se estiver fechada, reabrir para novos pedidos
        const data = snap.data();
        if (data.status === 'fechada') {
          console.log(`[ComandasService] 🔓 Reabrindo comanda ${comandaNumber} para novos pedidos`);
          tx.update(ref, {
            status: 'aberta',
            atualizado: serverTimestamp()
          });
        }
      }
    });
    return { id, dateKey };
  }

  async adicionarConsumo(comandaNumber, valorAcrescentar) {
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = doc(db, COMANDAS_COLLECTION, id);
    const valor = parseFloat(valorAcrescentar) || 0;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Comanda não encontrada');
      const data = snap.data();
      // Permite adicionar consumo mesmo em comanda fechada
      
      const totalAnterior = data.totalConsumido || 0;
      const novoTotal = totalAnterior + valor;
      const saldoAberto = Math.max(0, novoTotal - (data.totalPago || 0));
      tx.update(ref, {
        totalConsumido: novoTotal,
        saldoAberto,
        atualizado: serverTimestamp(),
      });
    });
  }

  async fecharComanda(comandaNumber, usuarioId, usuarioNome) {
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = doc(db, COMANDAS_COLLECTION, id);
    console.log('[ComandasService] 🔒 Tentando fechar comanda:', id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        console.error(`❌ Comanda não encontrada: ${id}`);
        throw new Error('Comanda não encontrada');
      }
      const data = snap.data();
      const saldo = (data.totalConsumido || 0) - (data.totalPago || 0);
      
      console.log('[ComandasService] 💰 Total consumido:', data.totalConsumido || 0);
      console.log('[ComandasService] 💰 Total pago:', data.totalPago || 0);
      console.log('[ComandasService] 💰 Saldo:', saldo);
      
      if (saldo > 0.01) { // Tolerância de 1 centavo para arredondamento
        console.error(`❌ Saldo em aberto: R$ ${saldo.toFixed(2)}`);
        throw new Error(`Não é possível fechar a comanda com saldo de R$ ${saldo.toFixed(2)} em aberto.`);
      }
      tx.update(ref, {
        status: 'fechada',
        saldoAberto: 0,
        fechadaAt: serverTimestamp(),
        fechadaPor: usuarioId || '',
        fechadaPorNome: usuarioNome || '',
        atualizado: serverTimestamp(),
      });
    });
  }

  async listarComandasAbertas() {
    const q = query(
      collection(db, COMANDAS_COLLECTION),
      where('dateKey', '==', todayKey()),
      where('status', '==', 'aberta'),
      orderBy('comandaNumber')
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
  }

  // Função para recalcular e sincronizar o total da comanda com base nos pedidos reais
  async sincronizarTotalComanda(comandaNumber, totalReal) {
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = doc(db, COMANDAS_COLLECTION, id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        return;
      }
      
      const data = snap.data();
      const totalAnterior = data.totalConsumido || 0;
      const saldoAberto = Math.max(0, totalReal - (data.totalPago || 0));
      tx.update(ref, {
        totalConsumido: totalReal,
        saldoAberto,
        atualizado: serverTimestamp(),
      });
    });
  }
}

export default new ComandasService();
