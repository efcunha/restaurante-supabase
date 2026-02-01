/**
 * PagamentosService - OTIMIZADO - Registra pagamentos por comanda e integra com CaixaService.
 */
import { addDoc, serverTimestamp, runTransaction, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import CaixaService from './CaixaService';
const comandaDocId = (dateKey, numero) => `comanda-${dateKey}-${String(numero)}`;

class PagamentosService {
  /**
  /**
   * 🔒 ÚNICA FUNÇÃO AUTORIZADA A MARCAR PEDIDOS COMO PAGOS
   * @param {string} companyId - ID da empresa
   * @param {Array<string>} pedidosIds - IDs dos pedidos (#001, #002, etc)
   * @param {string} formaPagamento - Forma de pagamento usada
   */
  async marcarPedidosComoPagos(companyId, pedidosIds, formaPagamento = null) {
    if (!companyId) throw new Error('Company ID required');
    if (!Array.isArray(pedidosIds) || pedidosIds.length === 0) {
      throw new Error('Lista de pedidos inválida');
    }

    // Dynamic import removed


    const updatePromises = [];

    for (const pedidoId of pedidosIds) {

      const queries = [
        query(getCompanyCollection(companyId, 'pedidos'), where('idFormatado', '==', pedidoId)),
        query(getCompanyCollection(companyId, 'pedidos'), where('id', '==', pedidoId))
      ];

      let encontrou = false;
      for (const q of queries) {
        const snap = await getDocs(q);
        if (!snap.empty) {
          snap.forEach(docSnap => {
            const updateData = { isPago: true };
            if (formaPagamento) {
              updateData.formaPagamento = formaPagamento;
            }
            updatePromises.push(
              updateDoc(getCompanyDoc(companyId, 'pedidos', docSnap.id), updateData)
                .catch(() => { })
            );
          });
          encontrou = true;
          break;
        }
      }

      if (!encontrou) {
        // Pedido não encontrado; manter fluxo sem log
      }
    }

    await Promise.all(updatePromises);
  }

  async registrarPagamento({ companyId, dateKey, comandaNumber, forma, valor, usuarioId, usuarioNome }) {
    if (!companyId) throw new Error('Company ID required');
    const safeUsuarioNome = usuarioNome || 'Sistema'; // Fallback
    const safeUsuarioId = usuarioId || 'system'; // Fallback
    // 🔒 SEGURANÇA: Validação RIGOROSA de valor
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      throw new Error('Valor inválido. Informe um valor maior que zero.');
    }
    const formaKey = (forma || '').toLowerCase();
    const formasValidas = ['dinheiro', 'pix', 'debito', 'credito'];
    if (!formasValidas.includes(formaKey)) {
      throw new Error('Forma de pagamento inválida');
    }

    // 🚀 OTIMIZAÇÃO: Buscar diretamente pelo ID calculado primeiro (mais rápido)
    const comandaId = comandaDocId(dateKey, comandaNumber);
    const comandaRef = getCompanyDoc(companyId, 'comandas', comandaId);
    let comandaSnap = await getDoc(comandaRef);
    let comandasSnap = null;

    if (comandaSnap.exists()) {
      comandasSnap = { docs: [comandaSnap], empty: false };
    } else {
      // Fallback: buscar por query se ID calculado não funcionar
      let comandasQuery = query(
        getCompanyCollection(companyId, 'comandas'),
        where('numeroComanda', '==', String(comandaNumber)),
        where('dateKey', '==', dateKey)
      );
      comandasSnap = await getDocs(comandasQuery);

      if (comandasSnap.empty) {
        comandasQuery = query(
          getCompanyCollection(companyId, 'comandas'),
          where('comandaNumber', '==', String(comandaNumber)),
          where('dateKey', '==', dateKey)
        );
        comandasSnap = await getDocs(comandasQuery);
      }
    }

    if (comandasSnap.empty) {
      throw new Error(`Comanda ${comandaNumber} não encontrada para registrar pagamento`);
    }

    const comandaDoc = comandasSnap.docs[0];
    const comandaRefFinal = getCompanyDoc(companyId, 'comandas', comandaDoc.id);
    const comandaData = comandaDoc.data();

    // 🚀 OTIMIZAÇÃO: Executar operações em paralelo
    const [transactionResult] = await Promise.all([
      // Atualizar comanda
      runTransaction(db, async (tx) => {
        const snap = await tx.get(comandaRefFinal);
        if (!snap.exists()) {
          throw new Error('Comanda não encontrada para registrar pagamento');
        }
        const c = snap.data();

        const totalPago = (c.totalPago || 0) + valorNum;
        const totalConsumido = c.totalConsumido || 0;
        const saldoAberto = Math.max(0, totalConsumido - totalPago);

        const recebedores = c.recebidoPor || [];
        const jaExiste = recebedores.some(r => {
          if (typeof r === 'string') return r === safeUsuarioNome;
          if (typeof r === 'object') return r.nome === safeUsuarioNome;
          return false;
        });

        if (usuarioNome && !jaExiste) {
          recebedores.push({
            id: safeUsuarioId,
            nome: safeUsuarioNome,
            data: new Date().toISOString(),
            timestamp: Date.now()
          });
        }

        // Atualizar resumo de pagamentos (agregação)
        const pagamentosResumo = c.pagamentosResumo || { dinheiro: 0, pix: 0, debito: 0, credito: 0 };
        const formaKey = (forma || 'outros').toLowerCase();
        pagamentosResumo[formaKey] = (pagamentosResumo[formaKey] || 0) + valorNum;

        const updateData = {
          totalPago,
          saldoAberto,
          pagamentosResumo, // Salva o resumo de quanto foi pago em cada modalidade
          recebidoPor: recebedores,
          ultimoPagamentoPor: safeUsuarioNome,
          ultimoPagamentoForma: formaKey, // Salva a última forma usada
          ultimoPagamentoEm: serverTimestamp(),
          atualizado: serverTimestamp(),
        };

        tx.update(comandaRefFinal, updateData);
        return { totalPago, saldoAberto };
      }),

      // Registrar pagamento
      addDoc(getCompanyCollection(companyId, 'pagamentos'), {
        comandaId: comandaDoc.id,
        dateKey: comandaData.dateKey || dateKey,
        comandaNumber: String(comandaNumber),
        forma: formaKey,
        valor: valorNum,
        usuarioId: safeUsuarioId,
        usuarioNome: safeUsuarioNome,
        // CORREÇÃO: Herdar garçom da comanda
        garcom: comandaData.criadoPor || comandaData.abertaPor,
        garcomNome: comandaData.criadoPorNome || comandaData.abertaPorNome,
        createdAt: serverTimestamp(),
      })
    ]);

    // Integra com caixa (não bloquear se falhar)
    CaixaService.registrarVenda(companyId, formaKey, valorNum).catch(() => {
      // Caixa fechado ou erro - não bloquear o pagamento
    });

    return transactionResult;
  }
}

export default new PagamentosService();
