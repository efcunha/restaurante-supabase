/**
 * CaixaService - Gerencia operações de caixa (abertura, reforço, sangria, fechamento, histórico).
 */
import { doc, runTransaction, serverTimestamp, getDoc, addDoc, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';

const CAIXA_COLLECTION = 'caixas'; // documentos por dia: caixa-YYYY-MM-DD

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
  async getCaixaAberto(companyId) {
    if (!companyId) return null; // Or throw error
    const now = Date.now();
    if (caixaCache.data && (now - caixaCache.timestamp) < CACHE_TTL) {
      return caixaCache.data;
    }

    const id = buildCaixaDocId();
    const ref = getCompanyDoc(companyId, 'caixas', id);

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

  async abrirCaixa(companyId, valorInicial, usuarioId, usuarioNome) {
    if (!companyId) throw new Error("Company ID required");
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
      const ref = getCompanyDoc(companyId, 'caixas', id);

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
      } catch {
        // Falha ao resetar contador; seguir com abertura
      }
      return result;

    } catch (error) {
      // Re-throw com mensagem amigável
      const mensagem = error?.message || 'Erro desconhecido ao abrir caixa';
      throw new Error(mensagem);
    }
  }

  async registrarReforco(companyId, valor, motivo, usuarioId, usuarioNome) {
    const caixa = await this.getCaixaAberto(companyId);
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
      await addDoc(getCompanyCollection(companyId, 'movimentosCaixa'), {
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

  async registrarSangria(companyId, valor, motivo, usuarioId, usuarioNome) {
    const caixa = await this.getCaixaAberto(companyId);
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
      await addDoc(getCompanyCollection(companyId, 'movimentosCaixa'), {
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

  async registrarVenda(companyId, forma, valor, dateStr = null) {
    if (!companyId) return;
    const formasValidas = ['dinheiro', 'pix', 'debito', 'credito'];
    if (!formasValidas.includes(forma)) throw new Error('Forma de pagamento inválida.');
    const valorNum = parseFloat(valor);
    if (!(valorNum > 0)) throw new Error('Valor de venda inválido.');

    // ESTRATÉGIA:
    // 1. Tenta pegar a data informada ou Hoje.
    // 2. Se o caixa dessa data NÃO estiver aberto, procura SE existe algum outro caixa aberto (o último).
    // Isso resolve o caso do usuário que esqueceu de fechar o caixa de ontem e continua vendendo hoje.

    let targetDate = dateStr || dateKey();
    let caixaRef = getCompanyDoc(companyId, 'caixas', buildCaixaDocId(targetDate));

    // Verificar se existe e está aberto na data alvo
    const snapshotAlvo = await getDoc(caixaRef);
    let usarTarget = snapshotAlvo.exists() && snapshotAlvo.data().status === 'aberto';

    if (!usarTarget) {
      // Fallback: Buscar último caixa aberto
      const abertos = await this.getCaixasAbertos(companyId);
      if (abertos.length > 0) {
        // Usa o mais recente aberto (ou o mais antigo? Geralmente só tem 1).
        // Se tiver 2 abertos, vamos assumir o mais recente para novos pagamentos?
        // Ou o mais antigo? "Esquecido".
        // Vamos usar o ÚLTIMO da lista (que classifiquei como mais recente no sort da outra função? Não, classifiquei antigos primeiro).
        // Pega o último do array (mais recente).
        const ultimoAberto = abertos[abertos.length - 1]; // data mais futura
        targetDate = ultimoAberto.data;
        caixaRef = getCompanyDoc(companyId, 'caixas', buildCaixaDocId(targetDate));
        console.log(`Redirecionando venda para caixa aberto de: ${targetDate}`);
      } else {
        // Nenhum aberto. Erro.
        throw new Error('Nenhum caixa aberto para registrar a venda.');
      }
    }

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(caixaRef);
      if (!snap.exists()) throw new Error(`Caixa de ${targetDate} não encontrado.`);
      const dados = snap.data();
      if (dados.status !== 'aberto') throw new Error(`Caixa de ${targetDate} fechado.`);

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

  async getCaixasAbertos(companyId) {
    if (!companyId) return [];
    try {
      const q = query(
        getCompanyCollection(companyId, CAIXA_COLLECTION),
        where('status', '==', 'aberto'),
        orderBy('data', 'asc') // Antigos primeiro
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erro ao buscar caixas abertos:", error);
      return [];
    }
  }

  async fecharCaixa(companyId, usuarioId, usuarioNome, saldoRealContado, dataCaixa = null) {
    if (!companyId) throw new Error("Company ID required");
    const caixaDate = dataCaixa || dateKey();
    const caixaRef = getCompanyDoc(companyId, 'caixas', buildCaixaDocId(caixaDate));

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(caixaRef);
      if (!snap.exists()) throw new Error('Caixa não encontrado para a data informada.');
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

      return { diferenca, saldoEsperado, saldoReal, data: caixaDate };
    });

    this.invalidateCache();

    // APÓS fechar o caixa, fazer limpeza do dia específico
    await this.limparDadosDoDia(companyId, caixaDate);
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

  async historico(companyId, limit = 30) {
    if (!companyId) return [];
    const q = query(getCompanyCollection(companyId, 'caixas'), orderBy('data', 'desc'));
    const snap = await getDocs(q);
    const registros = [];
    snap.forEach(d => registros.push({ id: d.id, ...d.data() }));
    return registros.slice(0, limit);
  }

  async getComandasFechadas(companyId, dateStr) {
    if (!companyId || !dateStr) return [];
    try {
      const q = query(
        getCompanyCollection(companyId, 'comandas'),
        where('dateKey', '==', dateStr),
        where('status', '==', 'fechada')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch (e) {
      console.error("Erro ao buscar comandas fechadas:", e);
      return [];
    }
  }

  /**
   * Limpa dados do dia ao fechar o caixa
   * 1. Move comandas FECHADAS (pagas) para histórico
   * 2. Exclui comandas ABERTAS (abandonadas)
   * 3. Exclui pedidos não pagos
   * PRESERVA: Comandas fechadas de dias anteriores, histórico de vendas
   */
  async limparDadosDoDia(companyId, dateStr = dateKey()) {
    if (!companyId) return;
    try {
      const targetDate = dateStr;
      const comandasAbertasIds = [];

      // 1. Buscar comandas do dia alvo
      const comandasSnapshot = await getDocs(
        query(getCompanyCollection(companyId, 'comandas'), where('dateKey', '==', targetDate))
      );

      for (const docSnapshot of comandasSnapshot.docs) {
        const comanda = docSnapshot.data();

        if (comanda.status === 'fechada') {
          // Comanda FECHADA: já está no banco como histórico, não precisa mover
        } else if (comanda.status === 'aberta') {
          // Comanda ABERTA: remover (abandonada)
          await deleteDoc(docSnapshot.ref);
          comandasAbertasIds.push(comanda.numeroComanda || comanda.comandaNumber);
        }
      }

      // 2. Excluir pedidos não pagos desse dia ou de comandas abertas desse dia
      const pedidosSnapshot = await getDocs(
        query(getCompanyCollection(companyId, 'pedidos'), where('dateKey', '==', targetDate))
      );

      for (const docSnapshot of pedidosSnapshot.docs) {
        const pedido = docSnapshot.data();
        const naoPago = pedido.isPago !== true && pedido.isPago !== 'true';
        const eraComandaAberta = comandasAbertasIds.includes(pedido.numeroComanda);

        if (naoPago || eraComandaAberta) {
          await deleteDoc(docSnapshot.ref);
        }
      }
    } catch (error) {
      console.warn("Erro ao limpar dados do dia:", error);
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
    } catch {
      return null;
    }
    return null;
  }
}

export default new CaixaService();
