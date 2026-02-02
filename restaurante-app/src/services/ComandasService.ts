/**
 * ComandasService - Gerencia contas abertas (comandas), totais e fechamento.
 */
import { runTransaction, serverTimestamp, query, where, getDocs, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyDoc, getCompanyCollection } from '../utils/firestoreUtils';
import { getLocalDateKey } from '../utils/dateUtils';
import { Comanda } from '../types';

const COMANDAS_COLLECTION = 'comandas';

const todayKey = (): string => getLocalDateKey();
const comandaId = (dateKey: string, numero: string | number): string => `comanda-${dateKey}-${String(numero)}`;

class ComandasService {
  async ensureComandaAberta(
    companyId: string, 
    comandaNumber: string | number, 
    usuarioId: string, 
    usuarioNome: string, 
    mesa: string = '', 
    cliente: string = ''
  ): Promise<{ id: string; dateKey: string }> {
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
          // @ts-ignore
          timeZone: 'America/Sao_Paulo'
        });

        const novaComanda: Omit<Comanda, 'id'> = {
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
          // @ts-ignore
          atualizado: serverTimestamp(),
        };

        tx.set(ref, novaComanda);
        console.log('[ComandasService] Nova comanda criada.');
      } else {
        const data = snap.data() as Comanda;
        const updates: any = { atualizado: serverTimestamp() };

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

  async adicionarConsumo(companyId: string, comandaNumber: string | number, valorAcrescentar: number | string) {
    if (!companyId) throw new Error("Company ID required");
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = getCompanyDoc(companyId, COMANDAS_COLLECTION, id);
    const valor = typeof valorAcrescentar === 'string' ? parseFloat(valorAcrescentar) : valorAcrescentar;
    
    if (isNaN(valor)) return; // Ignorar valores inválidos

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Comanda não encontrada');
      const data = snap.data() as Comanda;
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

  async fecharComanda(companyId: string, comandaNumber: string | number, usuarioId: string, usuarioNome: string) {
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
      const data = snap.data() as Comanda;

      // 🔒 PROTEÇÃO: Não fechar comanda cancelada
      if (data.status === 'cancelada') {
        console.error(`❌ Comanda ${comandaNumber} está CANCELADA e não pode ser fechada`);
        throw new Error('Não é possível fechar uma comanda cancelada');
      }

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

  async listarComandasAbertas(companyId: string): Promise<Comanda[]> {
    if (!companyId) return [];

    const q = query(
      getCompanyCollection(companyId, COMANDAS_COLLECTION),
      where('dateKey', '==', todayKey()),
      where('status', '==', 'aberta'),
      orderBy('comandaNumber')
    );
    const snap = await getDocs(q);
    const list: Comanda[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as Comanda));
    return list;
  }

  // Função para recalcular e sincronizar o total da comanda com base nos pedidos reais
  async sincronizarTotalComanda(companyId: string, comandaNumber: string | number, totalReal: number) {
    if (!companyId) return;
    const dateKey = todayKey();
    const id = comandaId(dateKey, comandaNumber);
    const ref = getCompanyDoc(companyId, COMANDAS_COLLECTION, id);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        return;
      }

      const data = snap.data() as Comanda;
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
