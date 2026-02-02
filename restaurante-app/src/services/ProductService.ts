import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Product } from '../types';

const PRODUTOS_COLLECTION = 'produtos';

/**
 * Cria um novo produto no Firestore
 * @param {Object} produto - Dados do produto {nome, preco, categoria, icone, ativo}
 * @returns {Promise<Object>} ID do produto criado
 */
export const criarProduto = async (produto: Omit<Product, 'id' | 'createdAt'>) => {
  try {
    const produtoData = {
      nome: produto.name.trim(),
      preco: typeof produto.price === 'string' ? parseFloat(produto.price) : produto.price,
      categoria: produto.category || 'outros', // espetinho, bebida, especial
      icone: produto.image || '🍖',
      ativo: produto.active !== undefined ? produto.active : true,
      criadoEm: new Date().toISOString(),
      // Mapeamento extra para compatibilidade com o tipo Product
      name: produto.name.trim(),
      price: typeof produto.price === 'string' ? parseFloat(produto.price) : produto.price,
      category: produto.category || 'outros',
      image: produto.image || '🍖',
      active: produto.active !== undefined ? produto.active : true,
      createdAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, PRODUTOS_COLLECTION), produtoData);
    return { 
      success: true, 
      produtoId: docRef.id,
      produto: { ...produtoData, id: docRef.id }
    };
  } catch (error: any) {
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
    const produtos: any[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Adapter para o tipo Product (inglês) e legado (português)
      produtos.push({
        id: doc.id,
        ...data,
        name: data.nome || data.name,
        price: data.preco || data.price,
        category: data.categoria || data.category,
        active: data.ativo ?? data.active,
      });
    });
    
    // Ordenar no cliente
    produtos.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    return { success: true, produtos };
  } catch (error: any) {
    return { success: false, error: error.message, produtos: [] };
  }
};

/**
 * Lista produtos por categoria
 * @param {string} categoria - Categoria dos produtos
 * @returns {Promise<Object>} Lista de produtos
 */
export const listarProdutosPorCategoria = async (categoria: string) => {
  try {
    const q = query(
      collection(db, PRODUTOS_COLLECTION),
      where('categoria', '==', categoria),
      where('ativo', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const produtos: any[] = [];
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
      produtos.push({
        id: doc.id,
        ...data,
        name: data.nome || data.name,
        price: data.preco || data.price,
        category: data.categoria || data.category,
        active: data.ativo ?? data.active,
      });
    });
    
    // Ordenar no cliente
    produtos.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, produtos };
  } catch (error: any) {
    return { success: false, error: error.message, produtos: [] };
  }
};

/**
 * Atualiza um produto existente
 * @param {string} produtoId - ID do produto
 * @param {Object} dadosAtualizados - Dados a serem atualizados
 * @returns {Promise<Object>} Resultado da atualização
 */
export const atualizarProduto = async (produtoId: string, dadosAtualizados: any) => {
  try {
    const produtoRef = doc(db, PRODUTOS_COLLECTION, produtoId);
    
    const updateData: any = {};
    if (dadosAtualizados.nome) updateData.nome = dadosAtualizados.nome.trim();
    if (dadosAtualizados.name) {
        updateData.nome = dadosAtualizados.name.trim(); // Manter compatibilidade
        updateData.name = dadosAtualizados.name.trim();
    }

    if (dadosAtualizados.preco !== undefined) updateData.preco = parseFloat(dadosAtualizados.preco);
    if (dadosAtualizados.price !== undefined) {
        updateData.preco = parseFloat(dadosAtualizados.price);
        updateData.price = parseFloat(dadosAtualizados.price);
    }

    if (dadosAtualizados.categoria) updateData.categoria = dadosAtualizados.categoria;
    if (dadosAtualizados.category) {
        updateData.categoria = dadosAtualizados.category;
        updateData.category = dadosAtualizados.category;
    }

    if (dadosAtualizados.icone) updateData.icone = dadosAtualizados.icone;
    if (dadosAtualizados.image) {
        updateData.icone = dadosAtualizados.image;
        updateData.image = dadosAtualizados.image;
    }

    if (dadosAtualizados.ativo !== undefined) updateData.ativo = dadosAtualizados.ativo;
    if (dadosAtualizados.active !== undefined) {
        updateData.ativo = dadosAtualizados.active;
        updateData.active = dadosAtualizados.active;
    }
    
    await updateDoc(produtoRef, updateData);
    return { success: true };
  } catch (error: any) {
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
export const desativarProduto = async (produtoId: string) => {
  return await atualizarProduto(produtoId, { ativo: false, active: false });
};

/**
 * Lista TODOS os produtos (ativos e inativos) para gestão no Admin
 * @returns {Promise<Object>} Lista completa de produtos
 */
export const listarTodosProdutos = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, PRODUTOS_COLLECTION));
    const produtos: any[] = [];
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
      produtos.push({
        id: doc.id,
        ...data,
        name: data.nome || data.name,
        price: data.preco || data.price,
        category: data.categoria || data.category,
        active: data.ativo ?? data.active,
      });
    });
    // Ordenar no cliente
    produtos.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    return { success: true, produtos };
  } catch (error: any) {
    return { success: false, error: error.message, produtos: [] };
  }
};

/**
 * Ativa um produto
 * @param {string} produtoId - ID do produto
 * @returns {Promise<Object>} Resultado da operação
 */
export const ativarProduto = async (produtoId: string) => {
  return await atualizarProduto(produtoId, { ativo: true, active: true });
};

/**
 * Remove permanentemente um produto do banco
 * @param {string} produtoId - ID do produto
 * @returns {Promise<Object>} Resultado da operação
 */
export const deletarProduto = async (produtoId: string) => {
  try {
    await deleteDoc(doc(db, PRODUTOS_COLLECTION, produtoId));
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: 'Erro ao deletar produto: ' + error.message 
    };
  }
};
