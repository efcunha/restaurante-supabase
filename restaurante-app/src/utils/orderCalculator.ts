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
  priceMap?: Record<string, number>;
  [key: string]: any;
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
    { name: 'Caldo de Peixe', price: 20 },
    { name: 'Caldo de Sururu', price: 20 },
  ],
  comidas: [
    { name: 'Risoto de Camarão', price: 25 },
    { name: 'Risoto de Charque', price: 20 },
    { name: 'Risoto de Frango', price: 20 },
    { name: 'Risoto de Queijo', price: 20 },
    { name: 'Batata Frita', price: 20 },
    { name: 'Macaxeira Frita', price: 12 },
    { name: 'Charque Acebolado', price: 25 },
  ],
  bebidas: [
    { name: 'Refrigerante Lata', price: 7 },
    { name: 'Refri Lata', price: 7 },
    { name: 'Refrigerante 1L', price: 10 },
    { name: 'Água Mineral', price: 4 },
    { name: 'Água com Gás', price: 4 },
    { name: 'Suco', price: 6 },
    { name: 'Chopp', price: 8 }, // Inclui Chopp 400 ML se matching for parcial
    { name: 'Cerveja', price: 9 },
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
export const calcularPrecoItem = (itemText: string, cardapioDin?: MenuItem[]): ItemCalculation => {
  try {
    const qtdMatch = itemText.match(/^(\d+)x?\s*/);
    const qtd = qtdMatch ? parseInt(qtdMatch[1], 10) : 1;
    const nome = itemText.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim();

    // Detectar tamanho para caldos (Lógica de negócio específica, pode ser mantida ou movida para BD se houver tabela de variações)
    // Por enquanto, mantemos a lógica de tamanho mas tentamos buscar preço base dinâmico se possível
    let precoUnit = 0;
    
    // Normalização para comparação mais robusta
    const nomeNormalized = nome.toLowerCase();

    // Lista de itens para busca: Dinâmico > Estático
    const allItems: MenuItem[] = cardapioDin && cardapioDin.length > 0 
      ? cardapioDin 
      : [
          ...CARDAPIO_STATIC.caldos,
          ...CARDAPIO_STATIC.comidas,
          ...CARDAPIO_STATIC.bebidas
        ];

      const produto = allItems.find(p => {
        const pNameNormalized = p.name.toLowerCase();
        // Verifica se o nome do item CONTÉM o nome do produto no menu (ex: "Chopp 400 ML" contém "Chopp")
        // OU se o nome do produto no menu CONTÉM o nome do item (ex: "Caldo de Camarão" contém "Caldo de Camarão 300ml" - não, contrário)
        return nomeNormalized.includes(pNameNormalized) || pNameNormalized.includes(nomeNormalized);
      });
      
      // Lógica de Prioridade:
      // 1. Se achou produto exato ou aproximado no banco, usa o preço dele.
      // 2. Se for Chopp ou Caldo com variação de tamanho, aplica regra de negócio (HARDCODED LOGIC - idealmente mover para BD, mas mantendo para consistência com regra atual se o produto base não tiver preço de tamanho)
      
      if (produto) {
         precoUnit = produto.price;
      }
      
      // Removed hardcoded size overrides for Chopp/Caldo.
      // The system should now rely on exact matches or manual priceMap entries.
      
      // Fallback final se ainda for 0 e tivermos estático (apenas segurança)
      if (precoUnit === 0) {
           // Tenta buscar no estático explicitamente se o dinâmico falhou
           const staticItems = [
                ...CARDAPIO_STATIC.caldos,
                ...CARDAPIO_STATIC.comidas,
                ...CARDAPIO_STATIC.bebidas
           ];
           const staticProd = staticItems.find(p => nomeNormalized.includes(p.name.toLowerCase()));
           if (staticProd) precoUnit = staticProd.price;
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
export const calcularTotalPedido = (pedido: Order, cardapioDin?: MenuItem[]): number => {
  if (!pedido.items || !Array.isArray(pedido.items)) {
    return Number(pedido.totalPrice) || 0;
  }

  let total = 0;
  pedido.items.forEach(itemText => {
    let itemPrice = 0;
    let found = false;

    if (pedido.priceMap) {
      const cleanName = itemText.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();
      const qtyMatch = itemText.match(/^(\d+)x?\s*/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      if (pedido.priceMap[itemText] !== undefined) {
        itemPrice = pedido.priceMap[itemText];
        found = true;
      } else if (pedido.priceMap[cleanName] !== undefined) {
        itemPrice = pedido.priceMap[cleanName] * quantity;
        found = true;
      }
    }

    if (!found) {
      const itemCalc = calcularPrecoItem(itemText, cardapioDin);
      itemPrice = itemCalc.subtotal;
    }

    total += itemPrice;
  });

  return fixDecimal(total);
};

/**
 * Calcular o valor total JÁ PAGO de um pedido
 * (Baseado no itemsWithStatus e pagamentos parciais)
 */
export const calcularPagoPedido = (pedido: any, cardapioDin?: MenuItem[]): number => {
    // 1. Se o pedido está marcado como pago no cabeçalho, retorna o total dele
    if (pedido.is_paid === true || pedido.is_paid === 'true' || pedido.is_paid === 1 || pedido.isPago === true) {
        return Number(pedido.totalPrice || pedido.total_amount) || 0;
    }

    // 2. Se tem items_with_status, soma os itens pagos individualmente
    const items = pedido.items_with_status || pedido.itemsWithStatus || [];
    if (items.length > 0) {
        let totalPago = 0;
        items.forEach((item: any) => {
            const qty = item.quantity || 1;
            const paidQty = item.paid_quantity || (item.paid ? qty : 0);
            
            if (paidQty > 0) {
                // Tenta obter preço do priceMap primeiro para consistência
                let unitPrice = 0;
                let found = false;

                if (pedido.priceMap) {
                    const cleanName = item.name.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();
                    if (pedido.priceMap[item.name] !== undefined) {
                      unitPrice = pedido.priceMap[item.name] / qty;
                      found = true;
                    } else if (pedido.priceMap[cleanName] !== undefined) {
                      unitPrice = pedido.priceMap[cleanName];
                      found = true;
                    }
                }

                if (!found) {
                    const calc = calcularPrecoItem(item.name, cardapioDin);
                    unitPrice = calc.precoUnitario;
                }

                totalPago += (paidQty * unitPrice);
            }
        });
        return fixDecimal(totalPago);
    }

    return 0;
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  CARDAPIO_STATIC,
  fixDecimal,
  calcularPrecoItem,
  calcularTotalPedido,
  calcularPagoPedido
};
