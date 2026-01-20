/**
 * CaixaService - Gerencia operações de caixa (abertura, reforço, sangria, fechamento, histórico).
 */
import { doc, runTransaction, serverTimestamp, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const CAIXA_COLLECTION = 'caixas'; // documentos por dia: caixa-YYYY-MM-DD
const MOVIMENTOS_COLLECTION = 'movimentosCaixa';

const dateKey = () => {
  const d = new Date();
  // Usar horário LOCAL (Brasil) em vez de UTC
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // YYYY-MM-DD local
};

const buildCaixaDocId = (data = dateKey()) => `caixa-${data}`;

// Cache para caixa aberto (2 minutos - reduzido para maior segurança)
let caixaCache = { data: null, timestamp: 0 };
const CACHE_TTL = 2 * 60 * 1000;

class CaixaService {
  async getCaixaAberto() {
    const now = Date.now();
    if (caixaCache.data && (now - caixaCache.timestamp) < CACHE_TTL) {
      return caixaCache.data;
    }

    const id = buildCaixaDocId();
    const ref = doc(db, CAIXA_COLLECTION, id);

    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      if (data && data.status === "aberto") {
        const result = { id, ...data };
        caixaCache = { data: result, timestamp: now };
        return result;
      }
    }
    caixaCache = { data: null, timestamp: now };
    return null;
  }

  invalidateCache() {
    caixaCache = { data: null, timestamp: 0 };
  }

  async abrirCaixa(valorInicial, usuarioId, usuarioNome) {
    try {
      // Validações básicas
      if (!usuarioId || !usuarioNome) {
        throw new Error("Dados do usuário são obrigatórios.");
      }

      const valor = parseFloat(valorInicial);
      if (isNaN(valor) || valor < 0) {
        throw new Error("Valor inicial deve ser um número válido e não negativo.");
      }

      if (!db) {
        throw new Error("Conexão com Firebase não disponível");
      }

      const dataStr = dateKey();
      const id = buildCaixaDocId(dataStr);
      const ref = doc(db, CAIXA_COLLECTION, id);

      const result = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);

        if (snap.exists() && snap.data()?.status === 'aberto') {
          throw new Error('Já existe um caixa aberto para hoje.');
        }

        const caixaData = {
          data: dataStr,
          abertoPor: usuarioId,
          abertoPorNome: usuarioNome,
          valorInicial: valor,
          abertoAt: serverTimestamp(),
          status: 'aberto',
          vendasTotal: 0,
          porForma: { dinheiro: 0, pix: 0, debito: 0, credito: 0 },
          reforcosTotal: 0,
          sangriasTotal: 0,
          movimentosCount: 0,
          fechadoAt: null,
          fechadoPor: null,
          saldoEsperado: valor,
          saldoReal: null,
          diferenca: null,
          ticketMedio: null,
          atualizado: serverTimestamp(),
        };

        tx.set(ref, caixaData);
        return { id, valorInicial: valor };
      });

      this.invalidateCache();

      // Resetar contador de comandas (operação secundária, não crítica)
      try {
        const counterRef = doc(db, 'counters', `comandas-${dataStr}`);
        await runTransaction(db, async (tx) => {
          const counterSnap = await tx.get(counterRef);

          if (counterSnap.exists()) {
            tx.update(counterRef, {
              current: 0,
              date: dataStr,
              updatedAt: serverTimestamp(),
            });
          } else {
            tx.set(counterRef, {
              current: 0,
              date: dataStr,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        });
      } catch (counterError) {
        // Falha ao resetar contador; seguir com abertura
      }
      return result;

    } catch (error) {
      // Re-throw com mensagem amigável
      const mensagem = error?.message || 'Erro desconhecido ao abrir caixa';
      throw new Error(mensagem);
    }
  }

  async registrarReforco(valor, motivo, usuarioId, usuarioNome) {
    const caixa = await this.getCaixaAberto();
    if (!caixa) throw new Error('Nenhum caixa aberto.');
    const valorNum = parseFloat(valor);
    if (!(valorNum > 0)) throw new Error('Valor de reforço deve ser positivo.');

    const caixaRef = doc(db, CAIXA_COLLECTION, buildCaixaDocId());
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(caixaRef);
      if (!snap.exists() || snap.data().status !== 'aberto') throw new Error('Caixa não está aberto.');
      const dados = snap.data();
      const novoReforcos = (dados.reforcosTotal || 0) + valorNum;
      const novoSaldoEsperado = (dados.saldoEsperado || 0) + valorNum;
      tx.update(caixaRef, {
        reforcosTotal: novoReforcos,
        saldoEsperado: novoSaldoEsperado,
        atualizado: serverTimestamp(),
        movimentosCount: (dados.movimentosCount || 0) + 1,
      });
      // registrar movimento
      await addDoc(collection(db, MOVIMENTOS_COLLECTION), {
        tipo: 'reforco',
        valor: valorNum,
        motivo: motivo || '',
        usuarioId,
        usuarioNome,
        caixaId: caixaRef.id,
        createdAt: serverTimestamp(),
      });
    });
    this.invalidateCache();
  }

  async registrarSangria(valor, motivo, usuarioId, usuarioNome) {
    const caixa = await this.getCaixaAberto();
    if (!caixa) throw new Error('Nenhum caixa aberto.');
    const valorNum = parseFloat(valor);
    if (!(valorNum > 0)) throw new Error('Valor de sangria deve ser positivo.');
    const saldoEsperado = caixa.saldoEsperado || 0;
    if (valorNum > saldoEsperado) throw new Error('Sangria maior que saldo esperado.');

    const caixaRef = doc(db, CAIXA_COLLECTION, buildCaixaDocId());
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(caixaRef);
      if (!snap.exists() || snap.data().status !== 'aberto') throw new Error('Caixa não está aberto.');
      const dados = snap.data();
      const novaSangria = (dados.sangriasTotal || 0) + valorNum;
      const novoSaldoEsperado = (dados.saldoEsperado || 0) - valorNum;
      tx.update(caixaRef, {
        sangriasTotal: novaSangria,
        saldoEsperado: novoSaldoEsperado,
        atualizado: serverTimestamp(),
        movimentosCount: (dados.movimentosCount || 0) + 1,
      });
      await addDoc(collection(db, MOVIMENTOS_COLLECTION), {
        tipo: 'sangria',
        valor: valorNum,
        motivo: motivo || '',
        usuarioId,
        usuarioNome,
        caixaId: caixaRef.id,
        createdAt: serverTimestamp(),
      });
    });
    this.invalidateCache();
  }

  async registrarVenda(forma, valor) {
    const formasValidas = ['dinheiro', 'pix', 'debito', 'credito'];
    if (!formasValidas.includes(forma)) throw new Error('Forma de pagamento inválida.');
    const valorNum = parseFloat(valor);
    if (!(valorNum > 0)) throw new Error('Valor de venda inválido.');

    const caixaRef = doc(db, CAIXA_COLLECTION, buildCaixaDocId());
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(caixaRef);

      if (!snap.exists()) {
        throw new Error('Caixa não está aberto.');
      }

      const dados = snap.data();
      if (dados.status !== 'aberto') {
        throw new Error('Caixa não está aberto.');
      }

      const porForma = dados.porForma || { dinheiro: 0, pix: 0, debito: 0, credito: 0 };
      const valorAnterior = porForma[forma] || 0;
      porForma[forma] = valorAnterior + valorNum;

      const vendasAnterior = dados.vendasTotal || 0;
      const vendasTotal = vendasAnterior + valorNum;

      const saldoAnterior = dados.saldoEsperado || 0;
      const saldoEsperado = saldoAnterior + valorNum;
      tx.update(caixaRef, {
        porForma,
        vendasTotal,
        saldoEsperado,
        atualizado: serverTimestamp(),
      });
    });
    this.invalidateCache();
  }

  async fecharCaixa(usuarioId, usuarioNome, saldoRealContado) {
    const caixaRef = doc(db, CAIXA_COLLECTION, buildCaixaDocId());
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(caixaRef);
      if (!snap.exists()) throw new Error('Caixa não encontrado.');
      const dados = snap.data();
      if (dados.status !== 'aberto') throw new Error('Caixa já fechado.');
      const saldoReal = parseFloat(saldoRealContado);
      const saldoEsperado = dados.saldoEsperado || 0;
      const diferenca = saldoReal - saldoEsperado;

      let ticketMedio = null;
      if (dados.vendasTotal && dados.vendasTotal > 0) {
        ticketMedio = dados.vendasTotal;
      }

      tx.update(caixaRef, {
        status: 'fechado',
        fechadoAt: serverTimestamp(),
        fechadoPor: usuarioId,
        fechadoPorNome: usuarioNome,
        saldoReal,
        diferenca,
        ticketMedio,
        atualizado: serverTimestamp(),
      });

      return { diferenca, saldoEsperado, saldoReal };
    });

    this.invalidateCache();

    // APÓS fechar o caixa, fazer limpeza do dia
    await this.limparDadosDoDia();
    return result;
  }

  _getNextDateKey() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async historico(limit = 30) {
    const q = query(collection(db, CAIXA_COLLECTION), orderBy('data', 'desc'));
    const snap = await getDocs(q);
    const registros = [];
    snap.forEach(d => registros.push({ id: d.id, ...d.data() }));
    return registros.slice(0, limit);
  }

  /**
   * Limpa dados do dia ao fechar o caixa
   * 1. Move comandas FECHADAS (pagas) para histórico
   * 2. Exclui comandas ABERTAS (abandonadas)
   * 3. Exclui pedidos não pagos
   * PRESERVA: Comandas fechadas de dias anteriores, histórico de vendas
   */
  async limparDadosDoDia() {
    try {
      const hoje = dateKey();

      let comandasMovidas = 0;
      let comandasAbertas = 0;
      let pedidosExcluidos = 0;
      const comandasAbertasIds = [];

      // 1. Buscar comandas de HOJE
      const comandasSnapshot = await getDocs(
        query(collection(db, 'comandas'), where('dateKey', '==', hoje))
      );

      for (const docSnapshot of comandasSnapshot.docs) {
        const comanda = docSnapshot.data();

        if (comanda.status === 'fechada') {
          // Comanda FECHADA: já está no banco como histórico, não precisa mover
          comandasMovidas++;
        } else if (comanda.status === 'aberta') {
          // Comanda ABERTA: remover (abandonada)
          await deleteDoc(docSnapshot.ref);
          comandasAbertasIds.push(comanda.numeroComanda || comanda.comandaNumber);
          comandasAbertas++;
        }
      }

      // 2. Excluir pedidos não pagos de hoje ou de comandas abertas
      const pedidosSnapshot = await getDocs(
        query(collection(db, 'pedidos'), where('dateKey', '==', hoje))
      );

      for (const docSnapshot of pedidosSnapshot.docs) {
        const pedido = docSnapshot.data();
        const naoPago = pedido.isPago !== true && pedido.isPago !== 'true';
        const eraComandaAberta = comandasAbertasIds.includes(pedido.numeroComanda);

        if (naoPago || eraComandaAberta) {
          await deleteDoc(docSnapshot.ref);
          pedidosExcluidos++;
        }
      }
    } catch (error) {
      // Não bloquear fechamento do caixa se a limpeza falhar
      // Não bloquear fechamento do caixa se a limpeza falhar
    }
  }

  _extractDateFromTimestamp(timestamp) {
    try {
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
      } else if (timestamp.toDate) {
        return timestamp.toDate().toISOString().split('T')[0];
      } else if (typeof timestamp === 'string') {
        return timestamp.split('T')[0];
      }
    } catch (e) {
      return null;
    }
    return null;
  }
}

export default new CaixaService();
