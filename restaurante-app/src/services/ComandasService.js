/**
 * ComandasService - Gerencia contas abertas (comandas), totais e fechamento.
 */
import { runTransaction, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyDoc, getCompanyCollection } from '../utils/firestoreUtils';

const COMANDAS_COLLECTION = 'comandas';

import { getLocalDateKey } from '../utils/dateUtils';
const todayKey = getLocalDateKey;
const comandaId = (dateKey, numero) => `comanda-${dateKey}-${String(numero)}`;

class ComandasService {
  async ensureComandaAberta(companyId, comandaNumber, usuarioId, usuarioNome, mesa = '', cliente = '') {
    if (!companyId) throw new Error("Company ID required");
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = getCompanyDoc(companyId, COMANDAS_COLLECTION, id);

    console.log(`[ComandasService] ensureComandaAberta #${comandaNumber} - Mesa: ${mesa}, Cliente: ${cliente}`);

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
          mesa: mesa || '',
          cliente: cliente || 'Não informado',
          totalConsumido: 0,
          totalPago: 0,
          saldoAberto: 0,
          recebidoPor: [],
          abertaAt: serverTimestamp(),
          criadaEm: criadaEm.toISOString(),
          horarioCriacao,
          abertaPor: usuarioId || '',
          abertaPorNome: usuarioNome || '',
          fechadaAt: null,
          fechadaPor: null,
          atualizado: serverTimestamp(),
        });
        console.log('[ComandasService] Nova comanda criada.');
      } else {
        const data = snap.data();
        const updates = { atualizado: serverTimestamp() };

        // Se estiver fechada, reabrir
        if (data.status === 'fechada') {
          console.log(`[ComandasService] 🔓 Reabrindo comanda ${comandaNumber} para novos pedidos`);
          updates.status = 'aberta';
        }

        // Atualizar Mesa se fornecida
        if (mesa && (!data.mesa || data.mesa !== mesa)) {
          updates.mesa = mesa;
        }

        // Lógica ROBUSTA de atualização de Cliente
        const invalidos = ['Não informado', 'Cliente Balcão', 'Cliente', '', null, undefined];
        const clienteInformadoEhValido = cliente && !invalidos.includes(cliente);

        // Permite atualizar se o novo for válido
        if (clienteInformadoEhValido) {
          console.log(`[ComandasService] Atualizando cliente de: "${data.cliente}" para: "${cliente}"`);
          updates.cliente = cliente;
        }

        tx.update(ref, updates);
      }
    });
    return { id, dateKey };
  }

  async adicionarConsumo(companyId, comandaNumber, valorAcrescentar) {
    if (!companyId) throw new Error("Company ID required");
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = getCompanyDoc(companyId, COMANDAS_COLLECTION, id);
    const valor = parseFloat(valorAcrescentar) || 0;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Comanda não encontrada');
      const data = snap.data();

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

  async fecharComanda(companyId, comandaNumber, usuarioId, usuarioNome) {
    if (!companyId) throw new Error("Company ID required");
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = getCompanyDoc(companyId, COMANDAS_COLLECTION, id);

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

  async listarComandasAbertas(companyId) {
    if (!companyId) return [];

    const q = query(
      getCompanyCollection(companyId, COMANDAS_COLLECTION),
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
  async sincronizarTotalComanda(companyId, comandaNumber, totalReal) {
    if (!companyId) return;
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = getCompanyDoc(companyId, COMANDAS_COLLECTION, id);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        return;
      }

      const data = snap.data();
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
