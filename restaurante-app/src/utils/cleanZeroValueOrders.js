/**
 * Script utilitário para limpar pedidos e comandas com valores zerados do Firestore
 * 
 * USO:
 * 1. Importar no AdminScreen ou criar um botão de admin
 * 2. Chamar cleanZeroValueOrders(companyId)
 * 3. Confirmar a operação
 */

import { getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection } from './firestoreUtils';

/**
 * Limpa pedidos com totalPrice = 0 ou NaN
 * @param {string} companyId - ID da empresa
 * @param {boolean} dryRun - Se true, apenas lista sem deletar
 * @returns {Promise<{deleted: number, updated: number, errors: number}>}
 */
export const cleanZeroValueOrders = async (companyId, dryRun = false) => {
  try {
    console.log('🧹 [CleanZeroOrders] Iniciando limpeza...');
    console.log(`   Modo: ${dryRun ? 'DRY RUN (apenas listar)' : 'DELETAR'}`);

    const pedidosRef = getCompanyCollection(companyId, 'pedidos');
    const snapshot = await getDocs(pedidosRef);

    const pedidosZerados = [];
    const pedidosValidos = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const totalPrice = Number(data.totalPrice) || 0;

      if (totalPrice === 0 || isNaN(totalPrice)) {
        pedidosZerados.push({
          id: doc.id,
          data: data,
          totalPrice: totalPrice
        });
      } else {
        pedidosValidos.push({
          id: doc.id,
          totalPrice: totalPrice
        });
      }
    });

    console.log(`📊 [CleanZeroOrders] Estatísticas:`);
    console.log(`   Total de pedidos: ${snapshot.size}`);
    console.log(`   Pedidos zerados: ${pedidosZerados.length}`);
    console.log(`   Pedidos válidos: ${pedidosValidos.length}`);

    if (pedidosZerados.length === 0) {
      console.log('✅ [CleanZeroOrders] Nenhum pedido zerado encontrado!');
      return { found: 0, deleted: 0, updated: 0, errors: 0 };
    }

    // Listar pedidos zerados
    console.log('\n📋 [CleanZeroOrders] Pedidos zerados encontrados:');
    pedidosZerados.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ID: ${p.id}`);
      console.log(`      Comanda: ${p.data.comandaNumber || 'N/A'}`);
      console.log(`      Cliente: ${p.data.client || 'N/A'}`);
      console.log(`      Itens: ${p.data.items?.length || 0}`);
      console.log(`      Total: R$ ${p.totalPrice}`);
      console.log(`      Data: ${p.data.createdAt?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'}`);
    });

    if (dryRun) {
      console.log('\n⚠️ [CleanZeroOrders] DRY RUN - Nenhum pedido foi deletado');
      return { found: pedidosZerados.length, deleted: 0, updated: 0, errors: 0 };
    }

    // Deletar pedidos zerados
    console.log('\n🗑️ [CleanZeroOrders] Deletando pedidos zerados...');
    
    let deleted = 0;
    let errors = 0;

    // Criar novo batch para cada operação
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const pedido of pedidosZerados) {
      try {
        const pedidoRef = doc(db, 'companies', companyId, 'pedidos', pedido.id);
        batch.delete(pedidoRef);
        batchCount++;
        console.log(`   🗑️  Adicionado ao batch: ${pedido.id}`);

        // Firestore batch limit is 500 operations
        if (batchCount >= 500) {
          console.log(`   💾 Commitando batch de ${batchCount} operações...`);
          await batch.commit();
          deleted += batchCount;
          batchCount = 0;
          console.log(`   ✅ Deletados ${deleted} pedidos até agora...`);
        }
      } catch (error) {
        console.error(`   ❌ Erro ao deletar pedido ${pedido.id}:`, error);
        errors++;
      }
    }

    // Commit remaining operations - CRÍTICO!
    if (batchCount > 0) {
      console.log(`   💾 Commitando batch final de ${batchCount} operações...`);
      await batch.commit();
      deleted += batchCount;
      console.log(`   ✅ Batch final commitado!`);
    }

    console.log(`\n✅ [CleanZeroOrders] Limpeza concluída!`);
    console.log(`   Deletados: ${deleted}`);
    console.log(`   Erros: ${errors}`);

    return { found: pedidosZerados.length, deleted, updated: 0, errors };

  } catch (error) {
    console.error('❌ [CleanZeroOrders] Erro na limpeza:', error);
    throw error;
  }
};

/**
 * Limpa comandas com totalConsumido = 0
 * @param {string} companyId - ID da empresa
 * @param {boolean} dryRun - Se true, apenas lista sem deletar
 * @returns {Promise<{deleted: number, updated: number, errors: number}>}
 */
export const cleanZeroValueComandas = async (companyId, dryRun = false) => {
  try {
    console.log('🧹 [CleanZeroComandas] Iniciando limpeza...');
    console.log(`   Modo: ${dryRun ? 'DRY RUN (apenas listar)' : 'DELETAR'}`);

    const comandasRef = getCompanyCollection(companyId, 'comandas');
    const snapshot = await getDocs(comandasRef);

    const comandasZeradas = [];
    const comandasValidas = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const totalConsumido = Number(data.totalConsumido) || 0;
      const status = data.status || 'aberta';

      // Deletar comandas com total zerado (abertas ou canceladas)
      // Preservar apenas comandas pagas com valor > 0
      if (totalConsumido === 0 && status !== 'paga') {
        comandasZeradas.push({
          id: doc.id,
          data: data,
          totalConsumido: totalConsumido,
          status: status
        });
      } else {
        comandasValidas.push({
          id: doc.id,
          totalConsumido: totalConsumido,
          status: status
        });
      }
    });

    console.log(`📊 [CleanZeroComandas] Estatísticas:`);
    console.log(`   Total de comandas: ${snapshot.size}`);
    console.log(`   Comandas zeradas (abertas/canceladas): ${comandasZeradas.length}`);
    console.log(`   Comandas válidas: ${comandasValidas.length}`);

    if (comandasZeradas.length === 0) {
      console.log('✅ [CleanZeroComandas] Nenhuma comanda zerada encontrada!');
      return { found: 0, deleted: 0, updated: 0, errors: 0 };
    }

    // Listar comandas zeradas
    console.log('\n📋 [CleanZeroComandas] Comandas zeradas encontradas:');
    comandasZeradas.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ID: ${c.id}`);
      console.log(`      Número: ${c.data.comandaNumber || 'N/A'}`);
      console.log(`      Cliente: ${c.data.cliente || 'N/A'}`);
      console.log(`      Status: ${c.status}`);
      console.log(`      Total: R$ ${c.totalConsumido}`);
    });

    if (dryRun) {
      console.log('\n⚠️ [CleanZeroComandas] DRY RUN - Nenhuma comanda foi deletada');
      return { found: comandasZeradas.length, deleted: 0, updated: 0, errors: 0 };
    }

    // Deletar comandas zeradas
    console.log('\n🗑️ [CleanZeroComandas] Deletando comandas zeradas...');
    
    let deleted = 0;
    let errors = 0;

    // Criar novo batch para cada operação
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const comanda of comandasZeradas) {
      try {
        const comandaRef = doc(db, 'companies', companyId, 'comandas', comanda.id);
        batch.delete(comandaRef);
        batchCount++;
        console.log(`   🗑️  Adicionado ao batch: ${comanda.id}`);

        if (batchCount >= 500) {
          console.log(`   💾 Commitando batch de ${batchCount} operações...`);
          await batch.commit();
          deleted += batchCount;
          batchCount = 0;
          console.log(`   ✅ Deletadas ${deleted} comandas até agora...`);
        }
      } catch (error) {
        console.error(`   ❌ Erro ao deletar comanda ${comanda.id}:`, error);
        errors++;
      }
    }

    // Commit remaining operations - CRÍTICO!
    if (batchCount > 0) {
      console.log(`   💾 Commitando batch final de ${batchCount} operações...`);
      await batch.commit();
      deleted += batchCount;
      console.log(`   ✅ Batch final commitado!`);
    }

    console.log(`\n✅ [CleanZeroComandas] Limpeza concluída!`);
    console.log(`   Deletadas: ${deleted}`);
    console.log(`   Erros: ${errors}`);

    return { found: comandasZeradas.length, deleted, updated: 0, errors };

  } catch (error) {
    console.error('❌ [CleanZeroComandas] Erro na limpeza:', error);
    throw error;
  }
};

/**
 * Limpa tanto pedidos quanto comandas com valores zerados
 * @param {string} companyId - ID da empresa
 * @param {boolean} dryRun - Se true, apenas lista sem deletar
 * @returns {Promise<{pedidos: object, comandas: object}>}
 */
export const cleanAllZeroValues = async (companyId, dryRun = false) => {
  console.log('🧹 [CleanAll] Iniciando limpeza completa...\n');

  const pedidosResult = await cleanZeroValueOrders(companyId, dryRun);
  console.log('\n');
  const comandasResult = await cleanZeroValueComandas(companyId, dryRun);

  console.log('\n📊 [CleanAll] Resumo Final:');
  console.log(`   Pedidos deletados: ${pedidosResult.deleted}`);
  console.log(`   Comandas deletadas: ${comandasResult.deleted}`);
  console.log(`   Total de erros: ${pedidosResult.errors + comandasResult.errors}`);

  return {
    pedidos: pedidosResult,
    comandas: comandasResult
  };
};
