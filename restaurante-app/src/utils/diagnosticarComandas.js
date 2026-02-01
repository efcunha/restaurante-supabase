/**
 * Utilitário para diagnosticar e corrigir comandas com valores absurdos
 */
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection } from './firestoreUtils';

/**
 * Diagnostica comandas com valores suspeitos
 * @param {string} companyId - ID da empresa
 * @returns {Promise<Object>} Relatório com comandas problemáticas
 */
export const diagnosticarComandasSuspeitas = async (companyId) => {
  try {
    console.log('🔍 Iniciando diagnóstico de comandas...');
    
    const comandasSnapshot = await getDocs(getCompanyCollection(companyId, 'comandas'));
    
    const suspeitas = [];
    const validas = [];
    const semValor = [];
    
    comandasSnapshot.forEach(docSnap => {
      const comanda = docSnap.data();
      const valor = parseFloat(comanda.totalConsumido) || 0;
      const comandaInfo = {
        id: docSnap.id,
        numero: comanda.comandaNumber || comanda.numeroComanda,
        valor: valor,
        status: comanda.status,
        dateKey: comanda.dateKey
      };
      
      if (valor === 0) {
        semValor.push(comandaInfo);
      } else if (valor > 10000) {
        suspeitas.push(comandaInfo);
      } else {
        validas.push(comandaInfo);
      }
    });
    
    const relatorio = {
      total: comandasSnapshot.size,
      validas: validas.length,
      suspeitas: suspeitas.length,
      semValor: semValor.length,
      comandasSuspeitas: suspeitas,
      comandasSemValor: semValor
    };
    
    console.log('📊 Relatório de Diagnóstico:');
    console.log(`   Total de comandas: ${relatorio.total}`);
    console.log(`   ✅ Válidas: ${relatorio.validas}`);
    console.log(`   ⚠️  Suspeitas (> R$ 10.000): ${relatorio.suspeitas}`);
    console.log(`   ⚠️  Sem valor: ${relatorio.semValor}`);
    
    if (suspeitas.length > 0) {
      console.log('\n⚠️  Comandas Suspeitas:');
      suspeitas.forEach(c => {
        console.log(`   - Comanda #${c.numero}: R$ ${c.valor.toFixed(2)} (${c.status})`);
      });
    }
    
    return relatorio;
  } catch (error) {
    console.error('❌ Erro ao diagnosticar comandas:', error);
    throw error;
  }
};

/**
 * Corrige comandas com valores absurdos recalculando a partir dos pedidos
 * @param {string} companyId - ID da empresa
 * @param {Array<string>} comandaIds - IDs das comandas a corrigir (opcional, se vazio corrige todas suspeitas)
 * @returns {Promise<Object>} Resultado da correção
 */
export const corrigirComandasSuspeitas = async (companyId, comandaIds = []) => {
  try {
    console.log('🔧 Iniciando correção de comandas suspeitas...');
    
    // Se não foram fornecidos IDs, buscar todas as suspeitas
    let comandasParaCorrigir = [];
    
    if (comandaIds.length === 0) {
      const relatorio = await diagnosticarComandasSuspeitas(companyId);
      comandasParaCorrigir = relatorio.comandasSuspeitas.map(c => c.id);
    } else {
      comandasParaCorrigir = comandaIds;
    }
    
    if (comandasParaCorrigir.length === 0) {
      console.log('✅ Nenhuma comanda suspeita encontrada!');
      return { corrigidas: 0, erros: 0 };
    }
    
    console.log(`📝 Comandas a corrigir: ${comandasParaCorrigir.length}`);
    
    let corrigidas = 0;
    let erros = 0;
    
    // Buscar todos os pedidos para recalcular
    const pedidosSnapshot = await getDocs(getCompanyCollection(companyId, 'pedidos'));
    const pedidosPorComanda = {};
    
    pedidosSnapshot.forEach(docSnap => {
      const pedido = docSnap.data();
      const comandaNum = String(pedido.comandaNumber || pedido.numeroComanda || '');
      
      if (!pedidosPorComanda[comandaNum]) {
        pedidosPorComanda[comandaNum] = [];
      }
      
      pedidosPorComanda[comandaNum].push({
        id: docSnap.id,
        totalPrice: parseFloat(pedido.totalPrice) || 0,
        isPago: pedido.isPago === true
      });
    });
    
    // Corrigir cada comanda
    for (const comandaId of comandasParaCorrigir) {
      try {
        const comandaRef = doc(db, `companies/${companyId}/comandas`, comandaId);
        const comandaSnap = await getDocs(collection(db, `companies/${companyId}/comandas`));
        const comandaDoc = comandaSnap.docs.find(d => d.id === comandaId);
        
        if (!comandaDoc) {
          console.warn(`⚠️  Comanda ${comandaId} não encontrada`);
          erros++;
          continue;
        }
        
        const comanda = comandaDoc.data();
        const comandaNum = String(comanda.comandaNumber || comanda.numeroComanda);
        const pedidos = pedidosPorComanda[comandaNum] || [];
        
        // Recalcular totais
        let totalConsumido = 0;
        let totalPago = 0;
        
        pedidos.forEach(p => {
          totalConsumido += p.totalPrice;
          if (p.isPago) {
            totalPago += p.totalPrice;
          }
        });
        
        // Atualizar comanda
        await updateDoc(comandaRef, {
          totalConsumido: totalConsumido,
          totalPago: totalPago,
          saldoAberto: Math.max(0, totalConsumido - totalPago)
        });
        
        console.log(`✅ Comanda #${comandaNum} corrigida: R$ ${totalConsumido.toFixed(2)}`);
        corrigidas++;
        
      } catch (error) {
        console.error(`❌ Erro ao corrigir comanda ${comandaId}:`, error);
        erros++;
      }
    }
    
    console.log(`\n📊 Resultado:`);
    console.log(`   ✅ Corrigidas: ${corrigidas}`);
    console.log(`   ❌ Erros: ${erros}`);
    
    return { corrigidas, erros };
    
  } catch (error) {
    console.error('❌ Erro ao corrigir comandas:', error);
    throw error;
  }
};

/**
 * Remove comandas com valores zerados (limpeza)
 * @param {string} companyId - ID da empresa
 * @returns {Promise<number>} Número de comandas removidas
 */
export const limparComandasZeradas = async (companyId) => {
  try {
    console.log('🗑️  Iniciando limpeza de comandas zeradas...');
    
    const comandasSnapshot = await getDocs(getCompanyCollection(companyId, 'comandas'));
    let removidas = 0;
    
    for (const docSnap of comandasSnapshot.docs) {
      const comanda = docSnap.data();
      const valor = parseFloat(comanda.totalConsumido) || 0;
      
      if (valor === 0 && comanda.status !== 'aberta') {
        await deleteDoc(doc(db, `companies/${companyId}/comandas`, docSnap.id));
        console.log(`🗑️  Removida comanda #${comanda.comandaNumber || comanda.numeroComanda}`);
        removidas++;
      }
    }
    
    console.log(`✅ ${removidas} comandas zeradas removidas`);
    return removidas;
    
  } catch (error) {
    console.error('❌ Erro ao limpar comandas zeradas:', error);
    throw error;
  }
};
