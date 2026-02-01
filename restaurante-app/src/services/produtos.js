import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const PRODUTOS_COLLECTION = 'produtos';

/**
 * Cria um novo produto no Firestore
 * @param {Object} produto - Dados do produto {nome, preco, categoria, icone, ativo}
 * @returns {Promise<Object>} ID do produto criado
 */
export const criarProduto = async (produto) => {
  try {
    const produtoData = {
      nome: produto.nome.trim(),
      preco: parseFloat(produto.preco),
      categoria: produto.categoria || 'outros', // espetinho, bebida, especial
      icone: produto.icone || '🍖',
      ativo: produto.ativo !== undefined ? produto.ativo : true,
      criadoEm: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, PRODUTOS_COLLECTION), produtoData);
    return { 
      success: true, 
      produtoId: docRef.id,
      produto: { ...produtoData, id: docRef.id }
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Erro ao criar produto: ' + error.message 
    };
  }
};

/**
 * Lista todos os produtos ativos
 * @returns {Promise<Object>} Lista de produtos
 */
export const listarProdutos = async () => {
  try {
    const q = query(
      collection(db, PRODUTOS_COLLECTION),
      where('ativo', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const produtos = [];
    
    querySnapshot.forEach((doc) => {
      produtos.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Ordenar no cliente
    produtos.sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return a.categoria.localeCompare(b.categoria);
      }
      return a.nome.localeCompare(b.nome);
    });

    return { success: true, produtos };
  } catch (error) {
    return { success: false, error: error.message, produtos: [] };
  }
};

/**
 * Lista produtos por categoria
 * @param {string} categoria - Categoria dos produtos
 * @returns {Promise<Object>} Lista de produtos
 */
export const listarProdutosPorCategoria = async (categoria) => {
  try {
    const q = query(
      collection(db, PRODUTOS_COLLECTION),
      where('categoria', '==', categoria),
      where('ativo', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const produtos = [];
    
    querySnapshot.forEach((doc) => {
      produtos.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Ordenar no cliente
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));

    return { success: true, produtos };
  } catch (error) {
    return { success: false, error: error.message, produtos: [] };
  }
};

/**
 * Atualiza um produto existente
 * @param {string} produtoId - ID do produto
 * @param {Object} dadosAtualizados - Dados a serem atualizados
 * @returns {Promise<Object>} Resultado da atualização
 */
export const atualizarProduto = async (produtoId, dadosAtualizados) => {
  try {
    const produtoRef = doc(db, PRODUTOS_COLLECTION, produtoId);
    
    const updateData = {};
    if (dadosAtualizados.nome) updateData.nome = dadosAtualizados.nome.trim();
    if (dadosAtualizados.preco !== undefined) updateData.preco = parseFloat(dadosAtualizados.preco);
    if (dadosAtualizados.categoria) updateData.categoria = dadosAtualizados.categoria;
    if (dadosAtualizados.icone) updateData.icone = dadosAtualizados.icone;
    if (dadosAtualizados.ativo !== undefined) updateData.ativo = dadosAtualizados.ativo;
    
    await updateDoc(produtoRef, updateData);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: 'Erro ao atualizar produto: ' + error.message 
    };
  }
};

/**
 * Desativa um produto (soft delete)
 * @param {string} produtoId - ID do produto
 * @returns {Promise<Object>} Resultado da operação
 */
export const desativarProduto = async (produtoId) => {
  return await atualizarProduto(produtoId, { ativo: false });
};

/**
 * Lista TODOS os produtos (ativos e inativos) para gestão no Admin
 * @returns {Promise<Object>} Lista completa de produtos
 */
export const listarTodosProdutos = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, PRODUTOS_COLLECTION));
    const produtos = [];
    
    querySnapshot.forEach((doc) => {
      produtos.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    // Ordenar no cliente
    produtos.sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return a.categoria.localeCompare(b.categoria);
      }
      return a.nome.localeCompare(b.nome);
    });

    return { success: true, produtos };
  } catch (error) {
    return { success: false, error: error.message, produtos: [] };
  }
};

/**
 * Ativa um produto
 * @param {string} produtoId - ID do produto
 * @returns {Promise<Object>} Resultado da operação
 */
export const ativarProduto = async (produtoId) => {
  return await atualizarProduto(produtoId, { ativo: true });
};

/**
 * Remove permanentemente um produto do banco
 * @param {string} produtoId - ID do produto
 * @returns {Promise<Object>} Resultado da operação
 */
export const deletarProduto = async (produtoId) => {
  try {
    await deleteDoc(doc(db, PRODUTOS_COLLECTION, produtoId));
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: 'Erro ao deletar produto: ' + error.message 
    };
  }
};
