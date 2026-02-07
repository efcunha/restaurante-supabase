/**
 * utils/orderCalculator.ts
 * Funções para cálculo de preços de pedidos
 * 
 * Requirements: 22.1, 22.2
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MenuItem {
  name: string;
  price: number;
}

export interface MenuCategory {
  caldos: MenuItem[];
  comidas: MenuItem[];
  bebidas: MenuItem[];
  espetinhos: MenuItem[];
}

export interface ItemCalculation {
  quantidade: number;
  nomeCompleto: string;
  precoUnitario: number;
  subtotal: number;
}

export interface Order {
  items?: string[];
  totalPrice?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Cardápio constante usado para fallback/cálculo de preços
export const CARDAPIO_STATIC: MenuCategory = {
  caldos: [
    { name: 'Caldinho de Macaxeira', price: 15 },
    { name: 'Caldo de Fava', price: 18 },
    { name: 'Caldo de Camarão', price: 25 },
  ],
  comidas: [
    { name: 'Risoto de Camarão', price: 25 },
    { name: 'Risoto de Charque', price: 20 },
    { name: 'Risoto de Frango', price: 20 },
    { name: 'Risoto de Queijo', price: 20 },
  ],
  bebidas: [
    { name: 'Refrigerante Lata', price: 7 },
    { name: 'Refri Lata', price: 7 },
    { name: 'Refrigerante 1L', price: 10 },
    { name: 'Água Mineral', price: 4 },
    { name: 'Água com Gás', price: 4 },
    { name: 'Suco', price: 6 }
  ],
  espetinhos: []
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Arredonda valor para 2 casas decimais
 */
export const fixDecimal = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Calcular preço de um item baseado no cardápio
 */
export const calcularPrecoItem = (itemText: string): ItemCalculation => {
  try {
    const qtdMatch = itemText.match(/^(\d+)x?\s*/);
    const qtd = qtdMatch ? parseInt(qtdMatch[1], 10) : 1;
    const nome = itemText.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim();

    // Detectar tamanho para caldos
    let precoUnit = 0;
    if (nome.includes('300ml')) {
      precoUnit = 15.00;
    } else if (nome.includes('180ml')) {
      precoUnit = 10.00;
    } else {
      // Buscar no cardápio
      const allItems: MenuItem[] = [
        ...CARDAPIO_STATIC.caldos,
        ...CARDAPIO_STATIC.comidas,
        ...CARDAPIO_STATIC.bebidas
      ];
      
      const produto = allItems.find(p => 
        nome.toLowerCase().includes(p.name.toLowerCase())
      );
      precoUnit = produto?.price || 0;
    }

    return {
      quantidade: qtd,
      nomeCompleto: itemText.replace(/^\d+x?\s*/, '').trim(),
      precoUnitario: precoUnit,
      subtotal: fixDecimal(qtd * precoUnit)
    };
  } catch (error) {
    console.error('[CalcPrecoItem] Erro:', itemText, error);
    return {
      quantidade: 1,
      nomeCompleto: itemText,
      precoUnitario: 0,
      subtotal: 0
    };
  }
};

/**
 * Calcular total de um pedido
 */
export const calcularTotalPedido = (pedido: Order): number => {
  if (!pedido.items || !Array.isArray(pedido.items)) {
    return Number(pedido.totalPrice) || 0;
  }

  let total = 0;
  pedido.items.forEach(itemText => {
    const itemCalc = calcularPrecoItem(itemText);
    total += itemCalc.subtotal;
  });

  return fixDecimal(total);
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  CARDAPIO_STATIC,
  fixDecimal,
  calcularPrecoItem,
  calcularTotalPedido
};
