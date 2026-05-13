import { supabase } from '../config/SupabaseConfig';
import { Product } from '../types';

const TABLE_PRODUCTS = 'products';

/**
 * Cria um novo produto no Supabase
 * @param {Object} produto - Dados do produto
 * @returns {Promise<Object>} Resultado da criação
 */
export const criarProduto = async (produto: Omit<Product, 'id' | 'createdAt'>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar company_id do profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada');

    const produtoData = {
      company_id: profile.company_id,
      name: produto.name.trim(),
      price: typeof produto.price === 'string' ? parseFloat(produto.price) : produto.price,
      category: produto.category || 'outros',
      subcategory: produto.subcategory || null,
      image_url: produto.image || '🍖',
      available: produto.active !== undefined ? produto.active : true,
      description: produto.description || '',
      unit: produto.unit || 'un'
    };

    const { data, error } = await supabase
      .from(TABLE_PRODUCTS)
      .insert(produtoData)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      produtoId: data.id,
      produto: _mapToProduct(data)
    };
  } catch (error: any) {
    console.error('Erro ao criar produto:', error);
    return {
      success: false,
      error: 'Erro ao criar produto: ' + (error.message || error)
    };
  }
};

/**
 * Lista todos os produtos ativos
 * @returns {Promise<Object>} Lista de produtos
 */
export const listarProdutos = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // RLS já filtra por company_id, mas precisamos garantir que estamos logados
    // Se o RLS estiver configurado corretamente, basta fazer o select.
    // Mas para garantir a company correta no context atual, podemos filtrar explícito se tivermos o ID,
    // mas confiar no RLS é o ideal. Assumindo RLS configurado 'using (company_id = ...)' e profile linkado.

    const { data, error } = await supabase
      .from(TABLE_PRODUCTS)
      .select('*')
      .eq('available', true)
      .order('name');

    if (error) throw error;

    const produtos = (data || []).map(_mapToProduct);

    // Ordenar por categoria depois nome (client-side sort preference)
    produtos.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    return { success: true, produtos };
  } catch (error: any) {
    console.error('Erro ao listar produtos:', error);
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
    const { data, error } = await supabase
      .from(TABLE_PRODUCTS)
      .select('*')
      .eq('category', categoria)
      .eq('available', true)
      .order('name');

    if (error) throw error;

    const produtos = (data || []).map(_mapToProduct);
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
    const updateData: any = {};

    if (dadosAtualizados.nome) updateData.name = dadosAtualizados.nome.trim();
    if (dadosAtualizados.name) updateData.name = dadosAtualizados.name.trim();

    if (dadosAtualizados.preco !== undefined) updateData.price = parseFloat(dadosAtualizados.preco);
    if (dadosAtualizados.price !== undefined) updateData.price = parseFloat(dadosAtualizados.price);

    if (dadosAtualizados.categoria) updateData.category = dadosAtualizados.categoria;
    if (dadosAtualizados.category) updateData.category = dadosAtualizados.category;
    if (dadosAtualizados.subcategoria !== undefined) updateData.subcategory = dadosAtualizados.subcategoria || null;
    if (dadosAtualizados.subcategory !== undefined) updateData.subcategory = dadosAtualizados.subcategory || null;

    if (dadosAtualizados.icone) updateData.image_url = dadosAtualizados.icone;
    if (dadosAtualizados.image) updateData.image_url = dadosAtualizados.image;
    if (dadosAtualizados.image_url) updateData.image_url = dadosAtualizados.image_url;

    if (dadosAtualizados.ativo !== undefined) updateData.available = dadosAtualizados.ativo;
    if (dadosAtualizados.active !== undefined) updateData.available = dadosAtualizados.active;
    if (dadosAtualizados.available !== undefined) updateData.available = dadosAtualizados.available;

    updateData.updated_at = new Date();

    const { error } = await supabase
      .from(TABLE_PRODUCTS)
      .update(updateData)
      .eq('id', produtoId);

    if (error) throw error;
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
  return await atualizarProduto(produtoId, { available: false });
};

/**
 * Lista TODOS os produtos (ativos e inativos) para gestão no Admin
 * @returns {Promise<Object>} Lista completa de produtos
 */
export const listarTodosProdutos = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLE_PRODUCTS)
      .select('*')
      .order('name');

    if (error) throw error;

    const produtos = (data || []).map(_mapToProduct);

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
  return await atualizarProduto(produtoId, { available: true });
};

/**
 * Remove permanentemente um produto do banco
 * @param {string} produtoId - ID do produto
 * @returns {Promise<Object>} Resultado da operação
 */
export const deletarProduto = async (produtoId: string) => {
  try {
    const { error } = await supabase
      .from(TABLE_PRODUCTS)
      .delete()
      .eq('id', produtoId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: 'Erro ao deletar produto: ' + error.message
    };
  }
};

// Helper: Mapeia colunas do Supabase para o objeto Product da aplicação
function _mapToProduct(row: any): any {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    category: row.category,
    subcategory: row.subcategory,
    image: row.image_url,
    active: row.available,
    unit: row.unit,
    description: row.description,

    // Compatibilidade com código legado (português)
    nome: row.name,
    preco: row.price,
    categoria: row.category,
    icone: row.image_url,
    ativo: row.available,

    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}
