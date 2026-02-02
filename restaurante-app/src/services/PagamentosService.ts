/**
 * PagamentosService - OTIMIZADO - Registra pagamentos por comanda e integra com CaixaService.
 */
import { addDoc, serverTimestamp, runTransaction, getDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import CaixaService from './CaixaService';
import { Comanda } from '../types';

const comandaDocId = (dateKey: string, numero: string | number) => `comanda-${dateKey}-${String(numero)}`;

interface PagamentoData {
  companyId: string;
  dateKey: string;
  comandaNumber: string | number;
  forma: string;
  valor: number | string;
  usuarioId: string;
  usuarioNome: string;
}

class PagamentosService {
  /**
   * 🔒 ÚNICA FUNÇÃO AUTORIZADA A MARCAR PEDIDOS COMO PAGOS
   * @param {string} companyId - ID da empresa
   * @param {Array<string>} pedidosIds - IDs dos pedidos (#001, #002, etc)
   * @param {string} formaPagamento - Forma de pagamento usada
   */
  async marcarPedidosComoPagos(companyId: string, pedidosIds: string[], formaPagamento: string | null = null) {
    if (!companyId) throw new Error('Company ID required');
    if (!Array.isArray(pedidosIds) || pedidosIds.length === 0) {
      throw new Error('Lista de pedidos inválida');
    }

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
            const updateData: any = { isPago: true };
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

  async registrarPagamento({ companyId, dateKey, comandaNumber, forma, valor, usuarioId, usuarioNome }: PagamentoData) {
    if (!companyId) throw new Error('Company ID required');
    const safeUsuarioNome = usuarioNome || 'Sistema'; // Fallback
    const safeUsuarioId = usuarioId || 'system'; // Fallback
    // 🔒 SEGURANÇA: Validação RIGOROSA de valor
    const valorNum = typeof valor === 'string' ? parseFloat(valor) : valor;
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
    let finalComandaId = comandaId;
    let refToUpdate = comandaRef;

    if (comandaSnap.exists()) {
      // ID direto funcionou setamos as variaveis, redundancia para clareza
      finalComandaId = comandaId;
      refToUpdate = comandaRef;
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
      
      if (!comandasSnap.empty) {
        const docFound = comandasSnap.docs[0];
        finalComandaId = docFound.id;
        refToUpdate = docFound.ref;
        comandaSnap = docFound; // Atualizar snap para uso posterior
      } else {
         throw new Error('Comanda não encontrada');
      }
    }

    await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(refToUpdate);
        if (!cSnap.exists()) throw new Error('Comanda não encontrada durante transação');
        
        const data = cSnap.data() as Comanda;
        const totalPagoAnt = data.totalPago || 0;
        const novoTotalPago = totalPagoAnt + valorNum;
        const novoSaldo = Math.max(0, (data.totalConsumido || 0) - novoTotalPago);

        tx.update(refToUpdate, {
            totalPago: novoTotalPago,
            saldoAberto: novoSaldo,
            atualizado: serverTimestamp(),
            // @ts-ignore
            recebidoPor: [...(data.recebidoPor || []), safeUsuarioId] // Rastreamento de quem recebeu
        });

        // Registrar o pagamento na coleção de pagamentos (para histórico/caixa)
        const pagamentosRef = getCompanyCollection(companyId, 'pagamentos');
        const novoPagamentoRef = doc(pagamentosRef); // Gerar ID novo
        tx.set(novoPagamentoRef, {
            comandaId: finalComandaId,
            comandaNumber: String(comandaNumber),
            dateKey,
            valor: valorNum,
            forma: formaKey,
            criadoEm: serverTimestamp(),
            recebidoPor: safeUsuarioId,
            recebidoPorNome: safeUsuarioNome,
            garcom: data.abertaPor || null, // Atribuir ao garçom que abriu a comanda
            garcomNome: data.abertaPorNome || null
        });
    });

    // Registrar no CAIXA (Assíncrono para não travar UI)
    CaixaService.registrarVenda(companyId, formaKey, valorNum, dateKey)
        .catch(err => console.error('[PagamentosService] Erro ao registrar no caixa:', err));

    return { success: true };
  }
}

export default new PagamentosService();
